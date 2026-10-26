"""
Feature engineering — the single source of truth shared by training and serving.

This module implements the serving contract in the trainer repo
(UmairStn/CSE-Stock-Return-Predictor, `docs/serving-contract.md`). Training
featurizes with that repo's byte-equivalent `features.py`; serving runs this
file. If the two ever disagree, the artifact consumes values it never saw in
training and returns confident, wrong predictions with nothing in the stack to
flag it — which is exactly what happened once already.

THE MODEL CONTRACT (feature names/order are positional — XGBoost matches on them):

    Open_Pct, High_Pct, Low_Pct, Rel_Volume,
    RSI_3, Return_Lag1, Return_Lag2, SMA_3_Pct, EMA_3_Pct, MACD_Pct, MACD_Hist_Pct

Conventions that must stay in lockstep with the trainer:

  * Every feature describes the LAST bar of a trailing 5-bar slice of
    COMPLETED trading bars, and every recursive indicator (EMA/MACD) is seeded
    INSIDE that slice — so a value is identical no matter how much history the
    caller happens to hold.
  * `Open` is synthesized as `Close(t-1)`: the CSE chart feed has no open
    (its `o` field is always null), so training was converted to the same
    convention.
  * Ratio features are `x / Close - 1` (centered on 0), never bare `x / Close`.
  * RSI_3 is Cutler-style equal-weight RSI on the 0-100 scale — not Wilder,
    and never divided by 100.
  * Rel_Volume is an uncapped within-slice ratio of like quantities, so a
    Yahoo-vs-CSE unit difference cannot skew it.
  * Only completed bars are ever featurized: `cse_payload_to_ohlcv()` below
    (the ingestion entry point) drops the still-open session.

CROSS-SECTIONAL BY DESIGN. Every feature is scale-free, so the model predicts
ANY CSE ticker, including ones absent from training. Company identity
(Asset_ID) and raw size (Log_Volume) were deliberately removed — re-adding
either would lock the model back to its training universe.

Historical note: an earlier serving build computed `x / Close` ratios (e.g.
Open_Pct ≈ 1.0 instead of ≈ 0.0), divided RSI by 100, and used a Wilder/EMA
variant — nine of eleven features were off-scale against the artifact. The
per-horizon `feature_ranges` tripwire in `prediction_engine.py` now fails loud
instead of silently whenever live values leave their training band.
"""

# pyrefly: ignore [missing-import]
import numpy as np
# pyrefly: ignore [missing-import]
import pandas as pd

import datetime as _dt

# Column order the model is trained on. Positional — never reorder.
FEATURE_COLUMNS = [
    "Open_Pct",
    "High_Pct",
    "Low_Pct",
    "Rel_Volume",
    "RSI_3",
    "Return_Lag1",
    "Return_Lag2",
    "SMA_3_Pct",
    "EMA_3_Pct",
    "MACD_Pct",
    "MACD_Hist_Pct",
]

# Raw OHLCV columns every input frame must carry.
REQUIRED_OHLCV = ["Open", "High", "Low", "Close", "Volume"]

# Lookback for the relative-volume baseline.
VOLUME_WINDOW = 3

# Every feature describes the LAST bar of a trailing slice of this many
# COMPLETED bars. The trainer refuses to build features on anything shorter,
# and all recursive indicators are seeded inside the slice.
SLICE_BARS = 5

# Hard floor — below this many completed bars a prediction is refused outright.
# 3 is the true minimum computable window (Rel_Volume and Return_Lag1 need
# exactly 3 closes; Open/High/Low/SMA need fewer). Between 3 and SLICE_BARS the
# feature row is a WARM-UP APPROXIMATION: undefined values are neutral-filled
# and EMAs are seeded shorter than the contract. This is a deliberate,
# owner-approved deviation from the trainer contract (which demands a full
# 5-bar slice) so thinly traded counters still get a forecast — every
# prediction built from a short history carries an explicit degraded-window
# warning from prediction_engine.
MIN_ROWS = 3


class InsufficientHistoryError(ValueError):
    """Not enough price rows to compute the feature vector."""


def drop_non_trading_rows(df: "pd.DataFrame") -> "pd.DataFrame":
    """
    Keep only bars that actually traded. Shared by training and serving.

    A zero-volume row is not "a quiet day" — no shares changed hands, so its
    Close is the previous close carried forward. Yahoo's CSE feed makes this
    impossible to ignore: it keeps emitting daily rows long after it loses the
    exchange. Measured on JKH-N0000.CM, ~85% of days traded across 5 years but
    only 7 of the most recent 129 did, with the last 8 closes byte-identical.

    Left in, those rows do damage at both ends of the pipeline:
      * Training  — they manufacture zero-return observations and zero-return
        labels, teaching the model that "nothing happens" is the common case.
      * Inference — they are the LAST rows, so they are the ones the prediction
        is built from. Every return goes to 0, RSI pins at 50, and the 20-day
        volume mean tends to 0, so Rel_Volume either goes NaN (a loud failure,
        which is the good case) or clips to REL_VOLUME_CAP on the one day
        something traded (a confident prediction from an artefact, which is not).

    Dropping them is not cleaning-to-taste: it is removing rows that record the
    absence of data. This MUST stay identical on both paths — a model trained on
    traded-only bars and served forward-filled ones is exactly the train/serve
    skew this module exists to prevent.
    """
    if "Volume" not in df.columns:
        return df
    volume = pd.to_numeric(df["Volume"], errors="coerce").fillna(0.0)
    return df[volume > 0]


# ─────────────────────────────────────────────────────────────────────────────
# CSE ingestion — ported byte-for-byte from the trainer repo's features.py
# (UmairStn/CSE-Stock-Return-Predictor). This is the single mapping entry
# point for live CSE bars; do not hand-roll the mapping anywhere else.
# ─────────────────────────────────────────────────────────────────────────────

# Columns the wire mapper produces before Open is synthesized. Deliberately
# does NOT include Open: the CSE feed has none, and prepare_ohlcv creates it.
_INGEST_COLUMNS = ["High", "Low", "Close", "Volume"]

# Sri Lanka has used a fixed UTC+05:30 offset since 2006 (no DST), so a fixed
# offset keeps the trade-date conversion dependency-free (no tz database).
_COLOMBO_TZ = _dt.timezone(_dt.timedelta(hours=5, minutes=30), name="Asia/Colombo")


def prepare_ohlcv(df: "pd.DataFrame") -> "pd.DataFrame":
    """Shared ingestion contract: validate -> drop non-trading -> synthesize Open.

    The real ``Open`` column (Yahoo's, or a live feed's) is always overwritten
    with ``Open(t) = Close(t-1)``, because the CSE payload reports ``o: null``:
    on both training and serving data the "open" is by definition the previous
    close. The first row of a history has no previous close (``NaN``); its
    features are dropped later because a full slice is unavailable.
    """
    missing = [c for c in _INGEST_COLUMNS if c not in df.columns]
    if missing:
        raise ValueError(f"Missing required OHLCV columns: {', '.join(missing)}")
    if df.empty:
        raise ValueError("Price data is empty")
    clean = drop_non_trading_rows(df)
    close = pd.to_numeric(clean["Close"], errors="coerce").astype("float64")
    clean = clean.assign(Open=close.shift(1))
    return clean


def _trade_date(raw_timestamp: float) -> "_dt.date":
    """Convert a CSE epoch timestamp (ms, or s tolerated) to its Colombo date."""
    seconds = raw_timestamp if abs(raw_timestamp) < 1e12 else raw_timestamp / 1000.0
    return _dt.datetime.fromtimestamp(seconds, tz=_COLOMBO_TZ).date()


def cse_payload_to_ohlcv(
    payload,
    *,
    now: "_dt.datetime | None" = None,
    drop_open_session: bool = True,
) -> "pd.DataFrame":
    """Map raw CSE API price-history records to the canonical OHLCV frame.

    Observed record shape (the CSE wire keys)::

        {"h": 18.1, "l": 17.6, "o": null, "s": 108923744269,
         "q": 6308277, "p": 17.7, "c": null, "pc": null,
         "t": 1792348200000, "n": null, "id": 297}

    Mapping and rules (mirrors the training-time hygiene exactly):

    * ``p`` -> Close, ``h`` -> High, ``l`` -> Low, ``q`` -> Volume,
      ``t`` -> trade date (Asia/Colombo, fixed UTC+05:30);
    * ``o``, ``c``, ``pc``, ``n``, ``id``, ``s`` are *never read* -- Open is
      synthesized from the previous close by :func:`prepare_ohlcv`;
    * a bar with ``not (l <= p <= h)`` or missing/invalid price fields is
      rejected (never clamped); malformed records are skipped;
    * duplicate trade dates are collapsed to the latest record;
    * today's still-open session is dropped by default (the model only ever
      predicts *from* a completed close -- override ``drop_open_session`` for
      replay/shadow testing);
    * raises ``ValueError`` when fewer than :data:`MIN_ROWS` (3) completed bars
      survive: below that nothing computable remains, so the predictor refuses
      instead of guessing. Between 3 and :data:`SLICE_BARS` bars the prediction
      runs in degraded warm-up mode with an explicit caller-side warning.
    """
    if not payload:
        raise ValueError("CSE payload is empty")
    now = now or _dt.datetime.now(tz=_COLOMBO_TZ)
    today = now.astimezone(_COLOMBO_TZ).date()

    parsed = []
    for record in payload:
        try:
            close = float(record["p"])
            high = float(record["h"])
            low = float(record["l"])
            trade_date = _trade_date(float(record["t"]))
        except (KeyError, TypeError, ValueError):
            continue
        if not all(np.isfinite(value) for value in (high, low, close)):
            continue
        if not low <= close <= high:
            continue  # impossible bar: reject, never clamp
        try:
            quantity = float(record["q"]) if record.get("q") is not None else np.nan
        except (TypeError, ValueError):
            quantity = np.nan
        parsed.append((float(record["t"]), trade_date, {
            "Date": pd.Timestamp(trade_date), "High": high, "Low": low,
            "Close": close, "Volume": quantity,
        }))
    if not parsed:
        raise ValueError("CSE payload contained no price bars")

    parsed.sort(key=lambda entry: entry[0])
    frame = pd.DataFrame(
        [entry[2] for entry in parsed],
        columns=["Date", "High", "Low", "Close", "Volume"],
    )
    frame = frame.drop_duplicates(subset="Date", keep="last")
    if drop_open_session and frame["Date"].iloc[-1].date() == today:
        frame = frame.iloc[:-1]
    if len(frame) < MIN_ROWS:
        raise ValueError(
            f"CSE payload has {len(frame)} completed bar(s); "
            f"at least {MIN_ROWS} are required for prediction"
        )
    return prepare_ohlcv(frame).reset_index(drop=True)


def _wilder_smooth(values: "pd.Series", period: int) -> "pd.Series":
    """
    Wilder's smoothing, seeded with a simple average (TA-Lib / pandas_ta style).

    pandas' `ewm(alpha=1/period, adjust=False)` seeds from the first observation
    instead, which gives different early values. Both converge, but seeding this
    way matches the mainstream TA libraries most likely to have produced the RSI
    columns in the training CSVs. See rsi_ewm() for the other convention and
    test/verify_features.py for the check that decides which one your data used.
    """
    arr = values.to_numpy(dtype=float)
    out = np.full(len(arr), np.nan)

    if len(arr) < period + 1:
        return pd.Series(out, index=values.index)

    # arr[0] is NaN (it comes from .diff()); seed at index `period`.
    out[period] = np.nanmean(arr[1:period + 1])
    for i in range(period + 1, len(arr)):
        out[i] = (out[i - 1] * (period - 1) + arr[i]) / period

    return pd.Series(out, index=values.index)


def _rsi_from_averages(avg_gain: "pd.Series", avg_loss: "pd.Series") -> "pd.Series":
    """
    Convert Wilder averages into RSI, handling both degenerate cases.

    Guarding only `avg_loss == 0` (the common shortcut) maps a completely flat
    series to RSI 100 — identical to a stock that rose every single day. That is
    wrong and it matters here: illiquid CSE counters print stale, unchanged closes
    for days at a time, and a false 100 would tell the model "extremely
    overbought" when nothing traded.

    no losses, some gains -> 100  (genuinely overbought)
    no gains,  some losses->   0  (genuinely oversold)
    neither  (flat)       ->  50  (no information, neutral)
    """
    rs = avg_gain / avg_loss.replace(0.0, np.nan)
    out = 100.0 - (100.0 / (1.0 + rs))

    flat = (avg_gain == 0.0) & (avg_loss == 0.0)
    no_loss = (avg_loss == 0.0) & (avg_gain > 0.0)

    out = out.where(~no_loss, 100.0)
    out = out.where(~flat, 50.0)

    # Preserve the warm-up NaNs; a missing average must not become a number.
    return out.where(avg_gain.notna() & avg_loss.notna())


def rsi(close: "pd.Series", period: int) -> "pd.Series":
    """Relative Strength Index on the classic 0-100 scale, Wilder smoothing."""
    delta = close.diff()
    gain = delta.clip(lower=0.0)
    loss = -delta.clip(upper=0.0)

    return _rsi_from_averages(
        _wilder_smooth(gain, period),
        _wilder_smooth(loss, period),
    )


def rsi_ewm(close: "pd.Series", period: int) -> "pd.Series":
    """
    RSI using pandas' ewm seeding instead of an SMA seed.

    Alternative convention, kept so test/verify_features.py can compare both
    against your training CSVs and tell us which one they used.
    """
    delta = close.diff()
    gain = delta.clip(lower=0.0)
    loss = -delta.clip(upper=0.0)

    return _rsi_from_averages(
        gain.ewm(alpha=1.0 / period, adjust=False, min_periods=period).mean(),
        loss.ewm(alpha=1.0 / period, adjust=False, min_periods=period).mean(),
    )


def add_indicators(df: "pd.DataFrame") -> "pd.DataFrame":
    """
    Attach every indicator this system reports, on a copy of `df`.

    Two distinct groups:
      * Model features — RSI_3 (Cutler, 0-100), used by build_feature_row.
      * Display only — SMA/EMA/MACD, surfaced in the API's technical_summary.

    All windows are short (<= 3) and the RSI is equal-weight rather than
    recursive-Wilder, so values depend only on the trailing few bars — the
    slice-scope parity rule from the serving contract.
    """
    missing = [c for c in REQUIRED_OHLCV if c not in df.columns]
    if missing:
        raise ValueError(f"Price frame is missing required columns: {missing}")

    out = df.copy()
    close = out["Close"].astype(float)

    # --- Model feature: Cutler RSI (simple equal-weight mean of the last 3
    # daily changes), on the standard 0-100 scale. Wilder smoothing would be
    # recursive over whatever history the caller passed, breaking the
    # "identical on any history length" guarantee the trainer relies on.
    # min_periods=1: on a full 5-bar slice the last row always has its 3
    # changes (identical value); on a 3-4 bar short history it falls back to
    # the available changes instead of NaN — part of the degraded-window mode.
    delta = close.diff()
    gain = delta.clip(lower=0.0)
    loss = -delta.clip(upper=0.0)
    out["RSI_3"] = _rsi_from_averages(
        gain.rolling(3, min_periods=1).mean(),
        loss.rolling(3, min_periods=1).mean(),
    )

    # --- Display only ---
    out["SMA_3"] = close.rolling(window=3).mean()
    out["EMA_3"] = close.ewm(span=3, adjust=False).mean()
    out["MACD"] = out["EMA_3"] - close.ewm(span=5, adjust=False).mean()
    # Signal = EMA(3) of MACD (was span=2 — a 1-point change that moved every
    # MACD_Hist_Pct off its trained distribution).
    out["MACD_Signal"] = out["MACD"].ewm(span=3, adjust=False).mean()
    out["MACD_Hist"] = out["MACD"] - out["MACD_Signal"]

    return out


def add_model_features(df: "pd.DataFrame") -> "pd.DataFrame":
    """
    Attach the model features. Expects add_indicators() to have run already.

    Every ratio is `x / Close - 1`, centered on 0 (0.0 = flat) — the same
    convention the trainer uses. No company identity is taken or added; see
    the module docstring.
    """
    out = df.copy()
    close = out["Close"].astype(float)

    # Intraday shape relative to the same day's close. Close_Pct is omitted
    # because it is identically 0.0. Open is the previous close (see
    # cse_payload_to_ohlcv), so Open_Pct is the overnight move.
    out["Open_Pct"] = out["Open"].astype(float) / close - 1.0
    out["High_Pct"] = out["High"].astype(float) / close - 1.0
    out["Low_Pct"] = out["Low"].astype(float) / close - 1.0

    # Volume relative to this stock's OWN recent average: ~1.0 is a normal
    # day, 2.0 is twice usual activity. An uncapped within-slice ratio (the
    # trainer applies no cap either); the replace(0 -> NaN) guard keeps a
    # dormant window from yielding inf, which XGBoost accepts silently.
    volume = out["Volume"].astype(float)
    avg_volume = volume.rolling(VOLUME_WINDOW, min_periods=VOLUME_WINDOW).mean()
    out["Rel_Volume"] = volume / avg_volume.replace(0.0, np.nan)

    # RSI_3 stays on the 0-100 Cutler scale computed in add_indicators().
    # (The old build divided it by 100 here, feeding the model a 100x-smaller
    # value than the trainer's 0-100 column.)

    # Scale-free trend position, all centered on 0.
    out["SMA_3_Pct"] = out["SMA_3"] / close - 1.0
    out["EMA_3_Pct"] = out["EMA_3"] / close - 1.0
    # MACD values are already differences — they are centered naturally, so
    # they get the plain Close normalization (no -1), matching the trainer.
    out["MACD_Pct"] = out["MACD"] / close
    out["MACD_Hist_Pct"] = out["MACD_Hist"] / close

    out["Current_Return"] = close.pct_change()
    out["Return_Lag1"] = out["Current_Return"].shift(1)
    out["Return_Lag2"] = out["Current_Return"].shift(2)

    return out


def build_feature_row(df: "pd.DataFrame") -> "pd.DataFrame":
    """
    Build the single feature row for the most recent trading day.

    `df` must be date-ascending OHLCV with at least MIN_ROWS (3) completed
    trading bars. Only the trailing SLICE_BARS (5) rows are ever read:
    indicators are seeded inside that slice, exactly as the trainer seeds
    them, so on a full history the produced values are history-length
    independent and byte-comparable with the training featurizer's output.

    SHORT HISTORY (3-4 bars, owner-approved degraded mode): features that
    cannot exist (Return_Lag2 needs 4 closes) are neutral-filled with 0.0,
    RSI uses the available changes, and EMAs are warm-seeded on the short
    window. The caller (prediction_engine) attaches an explicit
    degraded-window warning — never a silent approximation.

    Returns a DataFrame (not a numpy array) so XGBoost can match on feature name
    and raise on a mismatch rather than silently predicting from misaligned
    columns.
    """
    if len(df) < MIN_ROWS:
        raise InsufficientHistoryError(
            f"Need at least {MIN_ROWS} trading days to build features, got {len(df)}."
        )

    # Slice-scoped: all recursion (EMA/MACD) is seeded on the trailing
    # SLICE_BARS rows only, never on the caller's full history.
    slice_df = df.iloc[-SLICE_BARS:]
    enriched = add_model_features(add_indicators(slice_df))
    row = enriched.iloc[[-1]][FEATURE_COLUMNS].astype(float)

    if len(df) < SLICE_BARS:
        # Degraded-window mode: with 3 bars Return_Lag2 is undefined (needs 4
        # closes). Fill with the in-distribution neutral (0.0 = no change — the
        # training mean of both lags sits at ~0), then proceed. The engine has
        # already promised a warning alongside any prediction built from this.
        row = row.fillna(0.0)

    if row.isna().any().any():
        bad = row.columns[row.isna().iloc[0]].tolist()
        raise InsufficientHistoryError(
            f"Feature(s) {bad} are NaN on the latest row. This usually means too "
            f"little price history, or gaps in the series."
        )

    return row


def latest_technicals(df_with_indicators: "pd.DataFrame") -> dict:
    """Display indicators for the newest row, as plain floats for JSON."""
    last = df_with_indicators.iloc[-1]
    fields = [
        "RSI_3", "SMA_3", "EMA_3", "MACD", "MACD_Signal", "MACD_Hist",
    ]
    out = {}
    for name in fields:
        value = last.get(name)
        out[name.lower()] = (
            None if value is None or pd.isna(value) else round(float(value), 4)
        )
    return out


def realized_volatility(df: "pd.DataFrame", window: int = 20) -> float:
    """
    Std-dev of recent daily returns, used to size the predicted move.

    The classifier only emits a probability, so magnitude comes from the stock's
    own recent behaviour rather than from the model.
    """
    returns = df["Close"].astype(float).pct_change().dropna()
    if len(returns) < 2:
        return 0.0
    sigma = returns.tail(window).std()
    return 0.0 if pd.isna(sigma) else float(sigma)
