"""
Evaluation & Backtesting Script for TradeVision XGBoost Regressor.

Evaluates the saved model artifact against out-of-sample (chronological 20% test split)
market data for CSE stocks in ml/data/.

Computes:
  1. Statistical Regression Metrics: MAE, RMSE, R^2
  2. Directional Trading Metrics: Directional Accuracy (Hit Rate), Bullish/Bearish Precision
  3. Thresholded High-Confidence Hit Rate: Performance when |predicted return| > threshold
  4. Simulated Trading Strategy vs Buy & Hold Benchmark: Cumulative Return, Win Rate

Run via Docker:
    docker compose -f docker/docker-compose.yml exec backend-dev python -m ml.evaluate_model

Run locally (from TradeVision-backend/):
    python -m ml.evaluate_model
"""

import glob
import os
import sys

# pyrefly: ignore [missing-import]
import numpy as np
# pyrefly: ignore [missing-import]
import pandas as pd
# pyrefly: ignore [missing-import]
import xgboost as xgb
# pyrefly: ignore [missing-import]
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score

from ml.train_model import DATA_DIR, MODEL_OUT, TRAIN_SPLIT, load_and_prepare
from services.features import FEATURE_COLUMNS


def run_evaluation(ticker_filter: str | None = None) -> None:
    model_path = os.path.abspath(MODEL_OUT)
    if not os.path.exists(model_path):
        print(f"[!] Model artifact not found at: {model_path}")
        print("    Run `python -m ml.train_model` first to produce the model artifact.")
        sys.exit(1)

    print(f"Loading trained XGBoost model from: {model_path} ...")
    model = xgb.XGBRegressor()
    model.load_model(model_path)

    csv_paths = sorted(glob.glob(os.path.join(DATA_DIR, "*.csv")))
    if ticker_filter:
        csv_paths = [p for p in csv_paths if ticker_filter.upper() in os.path.basename(p).upper()]

    if not csv_paths:
        print(f"[!] No training CSVs found in {DATA_DIR} matching filter: {ticker_filter}")
        sys.exit(1)

    print(f"Preparing out-of-sample test splits from {len(csv_paths)} stock CSVs (20% holdout per asset)...")

    test_dfs = []
    skipped = 0

    for path in csv_paths:
        try:
            df = load_and_prepare(path)
        except Exception:
            skipped += 1
            continue

        if len(df) < 50:
            skipped += 1
            continue

        split_row = int(len(df) * TRAIN_SPLIT)
        test_df = df.iloc[split_row:].copy()
        test_df["Ticker"] = os.path.basename(path).replace(".csv", "")
        test_dfs.append(test_df)

    if not test_dfs:
        print("[!] No test data could be generated.")
        sys.exit(1)

    master_test = pd.concat(test_dfs, ignore_index=True).sort_values("Date")
    X_test = master_test[FEATURE_COLUMNS]
    y_test = master_test["Target_Return"].values

    print(f"Testing on {len(X_test):,} out-of-sample daily predictions across {len(test_dfs)} assets...\n")

    # Run inference
    y_pred = model.predict(X_test)

    # 1. Statistical Regression Metrics
    mae = mean_absolute_error(y_test, y_pred)
    rmse = np.sqrt(mean_squared_error(y_test, y_pred))
    r2 = r2_score(y_test, y_pred)

    # 2. Directional Accuracy (Hit Rate)
    # Does predicted return have the same sign (+ or -) as actual return?
    nonzero_mask = (y_test != 0)
    actual_sign = np.sign(y_test[nonzero_mask])
    pred_sign = np.sign(y_pred[nonzero_mask])
    directional_accuracy = np.mean(actual_sign == pred_sign) * 100.0

    # Bullish signals: when model predicted positive return
    bullish_mask = (y_pred > 0)
    if np.sum(bullish_mask) > 0:
        bullish_precision = np.mean(y_test[bullish_mask] > 0) * 100.0
    else:
        bullish_precision = 0.0

    # Bearish signals: when model predicted negative return
    bearish_mask = (y_pred < 0)
    if np.sum(bearish_mask) > 0:
        bearish_precision = np.mean(y_test[bearish_mask] < 0) * 100.0
    else:
        bearish_precision = 0.0

    # Naive baseline: predicting majority class (e.g. Always Long)
    pct_actual_up = np.mean(y_test > 0) * 100.0
    naive_majority_baseline = max(pct_actual_up, 100.0 - pct_actual_up)

    # 3. High-Confidence Signals (e.g. |predicted return| > 0.5% threshold)
    threshold = 0.005  # 0.5%
    high_conf_mask = np.abs(y_pred) >= threshold
    n_high_conf = int(np.sum(high_conf_mask))
    if n_high_conf > 0:
        high_conf_hit_rate = np.mean(
            np.sign(y_test[high_conf_mask]) == np.sign(y_pred[high_conf_mask])
        ) * 100.0
    else:
        high_conf_hit_rate = 0.0

    # 4. Simple Long-Only Trading Simulation
    # Strategy: If predicted return > 0.2%, hold stock for the day; else hold cash (0 return).
    # Benchmark: Buy and Hold (take actual return every day across all test rows).
    trade_threshold = 0.002
    strategy_returns = np.where(y_pred > trade_threshold, y_test, 0.0)
    benchmark_returns = y_test

    avg_strategy_daily_return = np.mean(strategy_returns) * 100.0
    avg_benchmark_daily_return = np.mean(benchmark_returns) * 100.0

    # Win rate of executed trades
    executed_trades = y_pred > trade_threshold
    if np.sum(executed_trades) > 0:
        trade_win_rate = np.mean(y_test[executed_trades] > 0) * 100.0
    else:
        trade_win_rate = 0.0

    # Display Report
    print("=" * 64)
    print("       TRADEVISION MODEL PERFORMANCE EVALUATION REPORT")
    print("=" * 64)
    print(f"Evaluated Model:          {os.path.basename(model_path)}")
    print(f"Out-of-Sample Rows:       {len(master_test):,}")
    print(f"Holdout Period Cutoff:    Top {int((1-TRAIN_SPLIT)*100)}% chronological time-slice")
    print("-" * 64)
    print("1. STATISTICAL REGRESSION ACCURACY")
    print(f"   * Mean Absolute Error (MAE):     {mae:.5f} ({mae*100:.3f}% avg daily error)")
    print(f"   * Root Mean Squared Error (RMSE): {rmse:.5f}")
    print(f"   * R-Squared (R²):                {r2:.5f}")
    print("-" * 64)
    print("2. DIRECTIONAL TRADING METRICS")
    print(f"   * Overall Directional Hit Rate:  {directional_accuracy:.2f}%")
    print(f"   * Bullish Signal Precision:      {bullish_precision:.2f}% (when model predicted UP)")
    print(f"   * Bearish Signal Precision:      {bearish_precision:.2f}% (when model predicted DOWN)")
    print(f"   * High-Confidence (|ret| > 0.5%):{high_conf_hit_rate:.2f}% (over {n_high_conf:,} signals)")
    print("-" * 64)
    print("3. BENCHMARK COMPARISONS")
    print(f"   * Random Guess Baseline:         50.00%")
    print(f"   * Naive Majority Class Drift:    {naive_majority_baseline:.2f}%")
    if directional_accuracy > 50.0:
        print(f"   -> Outperforming Random Guess by +{directional_accuracy - 50.0:.2f}%")
    else:
        print(f"   -> Underperforming Random Guess by {directional_accuracy - 50.0:.2f}%")
    print("-" * 64)
    print("4. SIMULATED STRATEGY VS BUY-AND-HOLD BENCHMARK")
    print(f"   * Strategy Avg Daily Return:     {avg_strategy_daily_return:+.4f}%")
    print(f"   * Benchmark (Hold All):          {avg_benchmark_daily_return:+.4f}%")
    print(f"   * Trade Win Rate (Executed):     {trade_win_rate:.2f}% ({int(np.sum(executed_trades)):,} trades)")
    print("=" * 64)
    print("\nCareer Fair Takeaway:")
    print("   'We evaluate out-of-sample directional accuracy (hit rate) and MAE")
    print("    on held-out chronological test sets, avoiding time-series leakage.'\n")


if __name__ == "__main__":
    ticker_arg = sys.argv[1] if len(sys.argv) > 1 else None
    run_evaluation(ticker_arg)
