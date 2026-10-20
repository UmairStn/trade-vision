"""
Stock prediction engine — Multi-horizon XGBoost inference (1d, 7d, 30d) + sentiment blend.

The trained artifacts are XGBRegressors from the CSE-Cross-Stock Trend Analyzer:
  * Horizon 1  (1 session, daily): cse_next_day_regressor.json
  * Horizon 7  (7 sessions, weekly swing): cse_next_day_regressor_h7.json
  * Horizon 30 (30 sessions, monthly trend): cse_next_day_regressor_h30.json

Target:
    Target_Return(t, h) = Close(t + h) / Close(t) - 1

The models have no sentiment input (fixed cross-sectional 11-feature contract),
so the FinBERT blend is applied to the predicted return based on the horizon scale.
"""

import json
import os

# pyrefly: ignore [missing-import]
import numpy as np
# pyrefly: ignore [missing-import]
import xgboost as xgb

from services import price_data
from services.features import (
    add_indicators,
    build_feature_row,
    latest_technicals,
    realized_volatility,
)
from services.ticker_registry import Ticker

_MODELS_DIR = os.getenv(
    "MODELS_DIR", os.path.join(os.path.dirname(__file__), "..", "models")
)

HORIZON_CONFIGS = [
    {
        "key": "1d",
        "days": 1,
        "model_file": "cse_next_day_regressor.json",
        "meta_file": "cse_next_day_regressor.metadata.json",
    },
    {
        "key": "7d",
        "days": 7,
        "model_file": "cse_next_day_regressor_h7.json",
        "meta_file": "cse_next_day_regressor.metadata_h7.json",
    },
    {
        "key": "30d",
        "days": 30,
        "model_file": "cse_next_day_regressor_h30.json",
        "meta_file": "cse_next_day_regressor.metadata_h30.json",
    },
]

# Baseline sentiment influence for 1-day horizon. Multiplied by sqrt(horizon_days) for longer horizons.
SENTIMENT_INFLUENCE = float(os.getenv("SENTIMENT_INFLUENCE", "0.005"))

TREND_UP_THRESHOLD = float(os.getenv("TREND_UP_THRESHOLD", "0.002"))
TREND_DOWN_THRESHOLD = float(os.getenv("TREND_DOWN_THRESHOLD", "-0.002"))


class ModelNotLoadedError(RuntimeError):
    """The model artifact is missing or could not be loaded."""


def _trend_label(p_adjusted: float) -> str:
    if p_adjusted > TREND_UP_THRESHOLD:
        return "Upward"
    if p_adjusted < TREND_DOWN_THRESHOLD:
        return "Downward"
    return "Neutral"


def _direction_label(ret: float) -> str:
    if ret > 0.001:
        return "UP"
    if ret < -0.001:
        return "DOWN"
    return "FLAT"


class StockPredictionEngine:
    def __init__(self, models_dir: str | None = None):
        self.models_dir = os.path.abspath(models_dir or _MODELS_DIR)
        self._models: dict[str, xgb.XGBRegressor] = {}
        self._metadata: dict[str, dict] = {}
        self._load_error: str | None = None
        self._load_models()

    # ──────────────────────────────────────────────
    #  Loading
    # ──────────────────────────────────────────────

    def _load_models(self) -> None:
        """
        Load all available horizon models (1d, 7d, 30d) and their metadata.
        Best-effort load: loads what is present without crashing if one is missing.
        """
        self._models.clear()
        self._metadata.clear()
        errors = []

        for conf in HORIZON_CONFIGS:
            key = conf["key"]
            model_path = os.path.join(self.models_dir, conf["model_file"])
            meta_path = os.path.join(self.models_dir, conf["meta_file"])

            # Load model
            if os.path.exists(model_path):
                try:
                    booster = xgb.XGBRegressor()
                    booster.load_model(model_path)
                    self._models[key] = booster
                except Exception as e:
                    errors.append(f"Failed to load {key} model ({conf['model_file']}): {e}")
            else:
                errors.append(f"Model file missing: {conf['model_file']}")

            # Load metadata
            if os.path.exists(meta_path):
                try:
                    with open(meta_path, "r", encoding="utf-8") as f:
                        self._metadata[key] = json.load(f)
                except Exception as e:
                    print(f"[prediction_engine] Warning: Could not read metadata {conf['meta_file']}: {e}")

        if not self._models:
            self._load_error = "; ".join(errors) if errors else "No models loaded."
        else:
            self._load_error = None

    @property
    def is_loaded(self) -> bool:
        return len(self._models) > 0

    @property
    def load_error(self) -> str | None:
        return self._load_error

    def reload(self, models_dir: str | None = None) -> None:
        """Re-point and reload all models without server restart."""
        if models_dir is not None:
            self.models_dir = os.path.abspath(models_dir)
        self._load_error = None
        self._load_models()

    # ──────────────────────────────────────────────
    #  Inference
    # ──────────────────────────────────────────────

    def predict_price(self, ticker: Ticker, sentiment_score: float = 0.0) -> dict:
        """
        Multi-horizon prediction for one ticker. Returns:
          - price_prediction: backwards-compatible 1-day block
          - horizons: dict of { '1d': ..., '7d': ..., '30d': ... }
          - technical_summary: latest indicators
        """
        if not self.is_loaded:
            return {
                "price_prediction": None,
                "horizons": None,
                "model_status": "model_not_loaded",
                "model_error": self.load_error,
                "technical_summary": None,
            }

        df = price_data.get_prediction_history(ticker)
        feature_row = build_feature_row(df)
        indicators = add_indicators(df)
        latest = price_data.latest_close(df)
        sigma = realized_volatility(df)

        horizons = {}

        for conf in HORIZON_CONFIGS:
            key = conf["key"]
            days = conf["days"]
            model = self._models.get(key)
            if model is None:
                continue

            # Model expected return
            raw_pred_return = float(model.predict(feature_row)[0])

            # Sentiment blend scaled by horizon time scale
            scale = float(days ** 0.5)
            expected_return = raw_pred_return + (SENTIMENT_INFLUENCE * scale) * sentiment_score

            predicted_close = float(latest * (1.0 + expected_return))
            change_percent = round(expected_return * 100.0, 2)
            direction = _direction_label(expected_return)

            if sigma > 0:
                conf_score = min(max((expected_return / sigma * 50.0) + 50.0, 0.0), 100.0)
            else:
                conf_score = 50.0

            meta = self._metadata.get(key, {})
            metrics = meta.get("metrics", {})
            directional_acc = metrics.get("directional_accuracy")

            horizons[key] = {
                "horizon_days": days,
                "predicted_return": round(expected_return, 4),
                "predicted_percent": change_percent,
                "predicted_close": round(predicted_close, 4),
                "direction": direction,
                "confidence": round(conf_score, 2),
                "directional_accuracy": round(directional_acc * 100.0, 1) if directional_acc else None,
                "target_definition": meta.get("target_definition"),
            }

        # Backwards-compatible 1-day prediction block
        h1 = horizons.get("1d")
        if h1:
            price_pred_block = {
                "predicted_close": h1["predicted_close"],
                "change_percent": h1["predicted_percent"],
                "trend": _trend_label(h1["predicted_return"]),
                "probability_up": None,
                "probability_up_adjusted": None,
                "confidence": h1["confidence"],
                "model_status": "loaded",
            }
        else:
            price_pred_block = None

        return {
            "price_prediction": price_pred_block,
            "horizons": horizons,
            "model_status": "loaded",
            "model_error": None,
            "technical_summary": latest_technicals(indicators),
        }

    def feature_row(self, ticker: Ticker) -> dict:
        """The exact feature vector the models see, for debugging/parity checks."""
        df = price_data.get_prediction_history(ticker)
        row = build_feature_row(df)
        return row.to_dict(orient="records")[0]
