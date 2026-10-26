# TRAINING REQUIREMENTS — CSE return model compatible with TradeVision's live 5-bar feed

> Hand this to whoever trains the model. The artifact produced under these rules
> drops straight into `TradeVision-backend/models/` and works with
> `services/prediction_engine.py` unchanged (same file names, same feature names).

---

## 0. The golden rule

**The model will be served with ONLY the last ~5 daily bars from the CSE chart API.**
Alternative names: "slice rule", "5-bar parity rule".

Every feature at training row `t` must therefore be computed from the **trailing
5-bar slice [t−4 … t] only** — the exact same computation the live API will
perform on the exact same bars. Nothing in the feature contract may depend on
data older than 5 consecutive traded bars for that stock.

Concretely, the trainer for each training row must do:

```python
# pseudo-code — for target rows use the horizon shift below
window = df.iloc[max(0, i - 4) : i + 1]          # trailing 5 bars
row    = build_feature_row(window)               # THE SAME function serving uses
```

Why: with only 5 rows, recursive indicators (EMA, MACD, Wilder RSI) are
warm-up sensitive — their value depends on where the series starts. Training on
full history while serving on 5 bars silently produces different numbers for the
"same" feature (this is what broke the previous artifacts). The slice rule makes
train and serve **identical by construction**.

The training data is still 5 years × 53 stocks (cross-sectional volume of data
is unchanged) — only HOW each row's features are computed changes.

---

## 1. Feature contract (the exact list, in order)

Names and order must match `services/features.py:FEATURE_COLUMNS` exactly
(the engine matches XGBoost inputs by name). All 11 keep their existing names:

| # | Feature | Formula (training) | Computed on slice? |
|---|---------|--------------------|--------------------|
| 1 | `Open_Pct` | `Open / Close − 1`, with **`Open` = previous bar's Close** (training applies the same approximation serving makes, because the CSE payload has no Open; first bar of the stock: drop) | yes |
| 2 | `High_Pct` | `High / Close − 1` (same-day upper wick) | yes (same-day, trivially) |
| 3 | `Low_Pct` | `Low / Close − 1` (same-day lower wick) | yes |
| 4 | `Rel_Volume` | `Volume / rolling_mean(Volume, 3, min_periods=3)`, then `clip(upper=10.0)` | yes (uses only bars t−2..t) |
| 5 | `RSI_3` | **Cutler-style, 0–100 scale**: `gains = diff.clip(lower=0).rolling(3, min_periods=3).mean()`, `losses = (−diff).clip(lower=0).rolling(3, min_periods=3).mean()`, `RSI = 100 − 100/(1+rs)`; flat-with-no-movement → 50; needs only the last 3 diffs = last 4 bars. **Do NOT divide by 100, do NOT use Wilder recursion.** | yes |
| 6 | `Return_Lag1` | `Close.pct_change().shift(1)` — return over t−2→t−1 (deliberate inherited quirk; keep) | yes |
| 7 | `Return_Lag2` | `Close.pct_change().shift(2)` | yes (needs bars t−3..t, inside the slice) |
| 8 | `SMA_3_Pct` | `(rolling_mean(Close, 3, min_periods=3)) / Close − 1` | yes |
| 9 | `EMA_3_Pct` | `EMA(span=3, adjust=False, min_periods=3) / Close − 1` — **computed on the 5-bar slice**, so its warm-up state is identical at training and serving | yes |
| 10 | `MACD_Pct` | `(EMA(span=3) − EMA(span=5)) / Close` on the slice (short-window MACD — the standard EMA12/26 definition is IMPOSSIBLE on 5 bars and was one of the bugs) | yes |
| 11 | `MACD_Hist_Pct` | `(MACD − EMA(span=2, adjust=False)(MACD)) / Close` on the slice | yes |

Note on `MACD_Pct` / `MACD_Hist_Pct`: on the **first rows of the stock's
history** a 5-bar slice is all that exists, so the warm-up state is identical by
construction (rule 0). If the team prefers, the simpler alternative is to
**drop features 10–11 and train a 9-feature model** (equally valid — but then
`FEATURE_COLUMNS` in `services/features.py` must drop them too, and the
artifact's feature name list must match the 9). Either is acceptable under
these requirements; do not mix.

---

## 2. Data requirements

- **Source**: Yahoo Finance daily OHLCV, CSE symbol map `JKH.N0000 → JKH-N0000.CM`
  (53 usable tickers of the 54-stock universe; `SOFT.N0000` has no Yahoo history).
- **Prices**: `auto_adjust=False` (unadjusted, same as serving / prior training).
- **Cutoff**: drop every bar dated after **`TRAIN_END = 2026-01-31`** — beyond
  that Yahoo forward-fills dead ghost rows (last known close, volume 0).
- **Cleaning before feature computation**:
  1. `drop_non_trading_rows()` — keep only bars with `Volume > 0` (identical
     shared function as serving).
  2. Split/scrip filter: any row whose `Current_Return`, `Return_Lag1`,
     `Return_Lag2` has `abs > 0.40` is dropped **plus its contaminated
     neighbourhood** (the label at `i−1`, and the lag columns at `i+1`/`i+2`).
- **Minimum**: ≥ 50 usable rows per stock after prep (assets with fewer are
  skipped).
- **Sanity check**: closes for dates present in both Yahoo and the live CSE feed
  should match (Yahoo consolidated close = CSE close); note any inconsistencies.

---

## 3. Label / target

One model per horizon `h ∈ {1, 7, 30}` trading sessions:

```
Target_Return(t, h) = Close(t + h) / Close(t) − 1     (close-to-close, regression)
```

- **Target contamination**: if any daily return inside the target window
  `(t, t+h]` has `abs > 0.40`, the row's label is untrustworthy → drop the row
  (implement as upstream `CSE-Stock-Return-Predictor/model.py::_target_poisoned`).
- Drop rows with any NaN in `FEATURE_COLUMNS` or target.
- The h7/h30 horizons use the same 11 features as the 1-day model — only the
  label window differs.

---

## 4. Train/test methodology

- **Per-stock chronological 80/20 split** (split each stock's own timeline
  before concatenating) — no future leakage between stocks.
- **Embargo**: after splitting, drop the last `h` rows of each stock's training
  portion — their target windows reach into the test period otherwise
  (upstream `model.py` implements this; keep it).
- Metrics to record: MAE, MSE, R², **directional accuracy**
  (`mean(sign(pred) == sign(actual))`), and **zero-return baseline MAE**
  (`mean(abs(actual))`) per horizon.

---

## 5. Model & hyperparameters (exact)

```python
xgb.XGBRegressor(
    n_estimators=150,
    max_depth=5,
    learning_rate=0.03,
    subsample=0.8,
    colsample_bytree=0.8,
    random_state=42,
    eval_metric="mae",
    n_jobs=-1,
)
```

(Identical family to the deployed artifacts, so results remain comparable.)

---

## 6. Artifact & output requirements (drop-in compatibility)

The prediction engine loads **exactly** these files from `models/`:

| Model | File | Metadata |
|---|---|---|
| 1-day | `models/cse_next_day_regressor.json` | `models/cse_next_day_regressor.metadata.json` |
| 7-day | `models/cse_next_day_regressor_h7.json` | `models/cse_next_day_regressor.metadata_h7.json` |
| 30-day | `models/cse_next_day_regressor_h30.json` | `models/cse_next_day_regressor.metadata_h30.json` |

- **Save format**: `xgb.XGBRegressor().save_model(path)` (sklearn-saved JSON;
  engine loads via `XGBRegressor().load_model()`).
- **Feature names**: the artifact's embedded `feature_names` must be the 11
  strings of §1, exactly as spelled (case-sensitive), not necessarily in order —
  but pass the training DataFrame with columns in that order anyway.
- **Metadata JSON must include**: `model_type`, `horizon_days`,
  `target_definition`, `created_at_utc`, `train_end`, `features` (the same 11
  list), `training_rows`, `test_rows`, `assets`, `metrics`, `hyperparameters`,
  **plus (new, required) `feature_stats`**: per feature, the training-set
  `p1`, `p50`, `p99` — used at serving as a parity alarm (live features outside
  the training range raise a warning in the API response).

---

## 7. Where to train (strong recommendation)

**Train inside this repo** (`TradeVision-backend`), importing
`services/features.py` as the single source of truth. That is what makes rule 0
and the feature contract enforceable — training and serving then share one
feature implementation and can never drift again (this repo still has the
deprecated `ml/train_model.py` to be revived for this, importing the SAME
functions).

If training from the separate upstream repo is preferred instead, you MUST
copy `services/features.py` byte-exact (or vendored via git submodule) into the
trainer, and verify with a diff test that both pipelines produce identical
feature vectors on the same bars before trusting any artifacts.

Training runs inside Docker so the exact `xgboost` version that serves also
trains:
```
docker compose -f docker/docker-compose.yml exec backend-dev python -m ml.train_model
```

---

## 8. Acceptance checklist (verify BEFORE placing artifacts in `models/`)

1. `XGBRegressor().load_model(f)` works for all 3 artifacts; embedded
   `feature_names` == the 11 contract names exactly.
2. **Zero-diff parity test**: for several stocks, the 5-bar slice at the newest
   training-CSV date yields a feature vector identical to what
   `services/features.py:build_feature_row()` produces on the same bars.
   (A runnable check will live at `test/verify_feature_parity.py`.)
3. **Range guard**: for a handful of live tickers, every feature the serving
   path computes falls inside the training `p1–p99` range from §6 (no
   `warnings` in the `/analyze` response).
4. Metric sanity: 1-day directional accuracy in the 52–58% band and 1-day MAE
   no worse than ~1.5× the zero-return baseline is a healthy training set;
   1-day directional accuracy dramatically above ~65% usually indicates
   leakage — investigate before trusting.
5. After copying artifacts: `docker compose ... restart backend-dev` and smoke
   test `GET /api/v1/stocks/analyze?symbol=JKH.N0000&include_news=false` —
   `observation_date` = latest CSE trading day, `model_status: "loaded"`,
   horizons present, no parity warnings.

---

## 9. Known approximations (document them, don't "fix" them)

- `Open_Pct` is a return-in-disguise (prevClose/Close − 1) because the CSE
  payload has no Open — training now uses the same approximation on purpose.
- CSE `quantity` (trades per bar) vs Yahoo consolidated `Volume` differ in
  scale; `Rel_Volume` is a per-stock ratio and absorbs most of it.
- A 5-bar window can span holidays/gaps; after `drop_non_trading_rows()` both
  sides deal in consecutive *traded* bars, which is the agreed serial unit.
- No sentiment input — the FinBERT blend stays post-hoc in
  `prediction_engine.py` (`expected_return += 0.005 × √h × score`).
