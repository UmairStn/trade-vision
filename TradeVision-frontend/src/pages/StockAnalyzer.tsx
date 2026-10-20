import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Brain, Calendar, Eye, ArrowSquareOut, Newspaper, ArrowsClockwise, Warning, Sparkle, TrendDown, TrendUp, WifiSlash } from '@phosphor-icons/react';
import { SymbolSearch } from '../components/SymbolSearch';
import { PriceChart } from '../components/charts/PriceChart';
import { Sparkline } from '../components/charts/Sparkline';
import type {
  AiAnalysisResult,
  PredictionResult,
  StockPrice,
  StockQuote,
} from '../types/stock';
import {
  fetchAiAnalysis,
  fetchPrediction,
  fetchRiskFlags,
  type RiskFlagsResponse,
  fetchStockHistory,
  fetchStockQuote,
} from '../services/api';
import { useAuth } from '../context/AuthContext';
import { usePageTitle } from '../hooks/usePageTitle';
import {
  daysSince,
  formatDate,
  formatDayGap,
  formatCompact,
  formatInt,
  formatPrice,
} from '../lib/format';
import { cn } from '../lib/cn';
import {
  Badge,
  Button,
  Delta,
  EmptyState,
  Meter,
  Notice,
  PageHeader,
  PageShell,
  SegmentedControl,
  Skeleton,
  Stat,
} from '../components/ui';

/**
 * One symbol, in depth.
 *
 * The previous version was a `h-[calc(100vh-64px)]` flex row holding two
 * `overflow-y-auto` panes, sitting inside a page that also had the global footer
 * below it — three scrollbars, and the footer permanently past the fold. This is
 * one document scroll: the symbol list moved into the header combobox, and every
 * panel below it is a normal block.
 */

const RANGE_DAYS = { '1M': 30, '3M': 90, '6M': 180, '1Y': 365 } as const;
type RangeKey = keyof typeof RANGE_DAYS;

const RANGE_WORDS: Record<RangeKey, string> = {
  '1M': 'the last month',
  '3M': 'the last three months',
  '6M': 'the last six months',
  '1Y': 'the last year',
};

/** The CSE's own trade summary omits these for thinly-traded names. */
const DASH = '—';

/**
 * Deep AI analysis is disabled for the initial release. Set
 * VITE_AI_ANALYSIS_ENABLED=true in TradeVision-frontend/.env to turn it back on
 * (a Vite var, so it is read at build/dev-server start, not at runtime).
 *
 * Everything else on this page — quote, chart, XGBoost prediction, FinBERT
 * sentiment — is unaffected, and the chatbot uses its own endpoint entirely.
 */
const AI_ANALYSIS_ENABLED = import.meta.env.VITE_AI_ANALYSIS_ENABLED === 'true';

export const StockAnalyzer = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const ticker = searchParams.get('ticker') || searchParams.get('symbol') || 'JKH.N0000';

  const [quote, setQuote] = useState<StockQuote | null>(null);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(true);

  const [range, setRange] = useState<RangeKey>('3M');
  const [history, setHistory] = useState<StockPrice[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyError, setHistoryError] = useState<string | null>(null);

  const [prediction, setPrediction] = useState<PredictionResult | null>(null);
  const [predictionLoading, setPredictionLoading] = useState(true);
  const [predictionError, setPredictionError] = useState<string | null>(null);
  const [newsLoading, setNewsLoading] = useState(false);

  const [ai, setAi] = useState<AiAnalysisResult | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  // Set when a locked-out user clicks the deep-analysis button, so the
  // "coming soon" notice only appears after they ask for it.
  const [aiComingSoon, setAiComingSoon] = useState(false);

  // Bumped by the retry/refresh buttons. The old "Retry prediction" button called
  // `setSearchParams({ ticker })` with the ticker it already had, so React Router
  // saw no change and nothing was re-requested — the button did nothing.
  const [dataKey, setDataKey] = useState(0);
  const [predictionKey, setPredictionKey] = useState(0);

  usePageTitle(quote ? `${quote.ticker} · ${quote.name}` : ticker);

  // --- quote -----------------------------------------------------------------
  // Split from the history request so changing the chart range doesn't re-fetch
  // the quote and blank the hero.
  useEffect(() => {
    let stale = false;
    setQuoteLoading(true);
    setQuoteError(null);
    fetchStockQuote(ticker)
      .then((next) => {
        if (!stale) setQuote(next);
      })
      .catch((e: unknown) => {
        if (stale) return;
        setQuote(null);
        setQuoteError(e instanceof Error ? e.message : 'Failed to load this quote');
      })
      .finally(() => {
        if (!stale) setQuoteLoading(false);
      });
    return () => {
      stale = true;
    };
  }, [ticker, dataKey]);

  // --- price history ---------------------------------------------------------
  useEffect(() => {
    let stale = false;
    setHistoryLoading(true);
    setHistoryError(null);
    fetchStockHistory(ticker, RANGE_DAYS[range])
      .then((points) => {
        if (!stale) setHistory(points);
      })
      .catch((e: unknown) => {
        if (stale) return;
        setHistory([]);
        setHistoryError(
          e instanceof Error ? e.message : 'Failed to load price history',
        );
      })
      .finally(() => {
        if (!stale) setHistoryLoading(false);
      });
    return () => {
      stale = true;
    };
  }, [ticker, range, dataKey]);

  // --- prediction ------------------------------------------------------------
  useEffect(() => {
    let stale = false;
    setPredictionLoading(true);
    setPredictionError(null);
    setPrediction(null);
    fetchPrediction(ticker)
      .then((result) => {
        if (!stale) setPrediction(result);
      })
      .catch((e: unknown) => {
        if (!stale) {
          setPredictionError(e instanceof Error ? e.message : 'Prediction failed');
        }
      })
      .finally(() => {
        if (!stale) setPredictionLoading(false);
      });
    return () => {
      stale = true;
    };
  }, [ticker, predictionKey]);

  // --- regulatory risk flags -------------------------------------------------
  const [riskData, setRiskData] = useState<RiskFlagsResponse | null>(null);
  useEffect(() => {
    let stale = false;
    fetchRiskFlags(ticker)
      .then((res) => {
        if (!stale) setRiskData(res);
      })
      .catch(() => {
        if (!stale) setRiskData(null);
      });
    return () => {
      stale = true;
    };
  }, [ticker]);

  // A finished deep analysis belongs to one symbol, so it is discarded when the
  // symbol changes — but *not* when the prediction is merely retried.
  useEffect(() => {
    setAi(null);
    setAiError(null);
    setAiComingSoon(false);
  }, [ticker]);

  const loadNewsSentiment = useCallback(async () => {
    setNewsLoading(true);
    setPredictionError(null);
    try {
      setPrediction(await fetchPrediction(ticker, true));
    } catch (e) {
      setPredictionError(e instanceof Error ? e.message : 'News sentiment failed');
    } finally {
      setNewsLoading(false);
    }
  }, [ticker]);

  const loadAiAnalysis = useCallback(async () => {
    if (!AI_ANALYSIS_ENABLED) {
      setAiComingSoon(true);
      return;
    }
    if (!user) {
      navigate('/login', { state: { from: `/analyzer?ticker=${ticker}` } });
      return;
    }
    setAiLoading(true);
    setAiError(null);
    setAi(null);
    try {
      setAi(await fetchAiAnalysis(ticker));
    } catch (e) {
      setAiError(e instanceof Error ? e.message : 'AI analysis failed');
    } finally {
      setAiLoading(false);
    }
  }, [ticker, user, navigate]);

  const selectSymbol = (next: StockQuote) => {
    setSearchParams({ ticker: next.ticker });
  };

  const hasSentiment = prediction != null && prediction.sentimentStatus !== 'skipped';

  // Yahoo has stopped updating some CSE symbols, so the bar the model ran on can
  // be months old. That gap is the single most important caveat on this page.
  const asOfGap = daysSince(prediction?.asOf);
  const asOfStale = asOfGap !== null && asOfGap > 5;

  const stats = useMemo(
    () =>
      [
        {
          label: 'Open',
          value: quote?.dayOpen != null ? `Rs ${formatPrice(quote.dayOpen)}` : DASH,
        },
        {
          label: 'Day high',
          value: quote?.dayHigh != null ? `Rs ${formatPrice(quote.dayHigh)}` : DASH,
        },
        {
          label: 'Day low',
          value: quote?.dayLow != null ? `Rs ${formatPrice(quote.dayLow)}` : DASH,
        },
        {
          label: 'Prev close',
          value:
            quote?.previousClose != null
              ? `Rs ${formatPrice(quote.previousClose)}`
              : DASH,
        },
        {
          label: 'Turnover',
          value: quote?.turnover != null ? `Rs ${formatCompact(quote.turnover)}` : DASH,
        },
        { label: 'Market cap', value: quote?.marketCap ?? DASH },
      ] as const,
    [quote],
  );

  return (
    <PageShell>
      <PageHeader
        eyebrow={
          <>
            <Brain className="h-3.5 w-3.5" aria-hidden="true" />
            Stock analyzer
          </>
        }
        title={quote?.name ?? ticker}
        description={
          <span className="text-gradient-brand text-h3 font-bold">{ticker}</span>
        }
        actions={
          <>
            <SymbolSearch
              label="Change symbol"
              placeholder="Search CSE symbols"
              size="sm"
              syncValue={ticker}
              onSelect={selectSymbol}
              className="w-full sm:w-80"
            />
            <Button
              variant="secondary"
              onClick={() => {
                setDataKey((n) => n + 1);
                setPredictionKey((n) => n + 1);
              }}
              leftIcon={<ArrowsClockwise className="h-4 w-4" aria-hidden="true" />}
            >
              Refresh
            </Button>
          </>
        }
      />

      {/* ------------------------------------------------------------ quote hero */}
      {quoteLoading ? (
        <div className="mt-12 mb-16">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="mt-4 h-16 w-64" />
          <Skeleton className="mt-4 h-5 w-48" />
        </div>
      ) : quoteError || !quote ? (
        <div className="mt-12 mb-16 border-t border-line py-12">
          <EmptyState
            icon={<WifiSlash className="h-6 w-6" aria-hidden="true" />}
            title={`Could not load ${ticker}`}
            description={
              quoteError ??
              'The CSE returned no quote for this symbol. It may be suspended or delisted.'
            }
            action={
              <Button
                onClick={() => setDataKey((n) => n + 1)}
                leftIcon={<ArrowsClockwise className="h-4 w-4" aria-hidden="true" />}
              >
                Try again
              </Button>
            }
          />
        </div>
      ) : (
        <div className="mb-16 mt-12">
          {riskData?.has_risk && (
            <Notice
              tone="warn"
              title="CSE Non-Compliance / Regulatory Risk Notice"
              className="mb-8"
            >
              The exchange has published active non-compliance or penalty notices for this security.
              {riskData.notices?.[0]?.title && ` (${riskData.notices[0].title})`}
              <span className="block mt-1 font-medium">
                Exercise caution and review full disclosures in the News & Signals Hub.
              </span>
            </Notice>
          )}

          <div className="flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="font-mono text-xs uppercase tracking-wider text-ink-muted">
                Last traded price
              </p>
              <div className="mt-3 flex items-baseline gap-4">
                <span className="text-display font-medium tracking-tight text-ink">
                  Rs {formatPrice(quote.price)}
                </span>
                <Delta
                  value={quote.change}
                  percent={quote.changePercent}
                  size="xl"
                  variant="pill"
                />
              </div>
              <p className="mt-3 font-mono text-sm text-ink-muted">
                Vol {formatInt(quote.volume)} · CSE Real-time
              </p>
            </div>

            {history.length > 1 && (
              <div className="shrink-0 md:text-right">
                <Sparkline
                  data={history}
                  width={168}
                  height={48}
                  label={`Closing price over ${RANGE_WORDS[range]}, ${history.length} trading days`}
                />
                <p className="mt-2 text-xs text-ink-muted">
                  {range} trend · detail below
                </p>
              </div>
            )}
          </div>

          <div className="mt-12 grid grid-cols-2 gap-x-6 gap-y-8 border-t border-line pt-8 sm:grid-cols-3 lg:grid-cols-6">
            {stats.map((stat) => (
              <Stat 
                key={stat.label} 
                size="sm" 
                label={stat.label} 
                value={stat.value} 
                className="[&_p]:font-mono [&_p]:text-xs [&_p]:uppercase [&_p]:tracking-wider [&_span]:text-lg [&_span]:font-medium"
              />
            ))}
          </div>
        </div>
      )}

      {/* ----------------------------------------------------------------- chart */}
      <section className="mb-16 border-t border-line pt-12">
        <div className="mb-8 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-h2 font-medium tracking-tight text-ink">Price history</h2>
            <p className="mt-2 text-sm text-ink-muted">
              Daily bars from the same feed the forecast is computed on.
            </p>
          </div>
          <SegmentedControl
            label="Date range"
            size="sm"
            value={range}
            onChange={(val) => setRange(val as RangeKey)}
            options={[
              { value: '1M', label: '1M' },
              { value: '3M', label: '3M' },
              { value: '6M', label: '6M' },
              { value: '1Y', label: '1Y' },
            ]}
          />
        </div>

        {historyError ? (
          <Notice
            tone="error"
            title="Price history unavailable"
            action={
              <Button
                size="sm"
                variant="secondary"
                onClick={() => setDataKey((n) => n + 1)}
              >
                Retry
              </Button>
            }
          >
            {historyError}
          </Notice>
        ) : (
          <PriceChart
            data={history}
            ticker={ticker}
            loading={historyLoading}
            height={360}
          />
        )}
      </section>

      {/* ------------------------------------------------------------ prediction */}
      <section className="mb-16 border-t border-line pt-12">
        <div className="grid gap-12 lg:grid-cols-12">
          {/* Header Column */}
          <div className="lg:col-span-4">
            <h2 className="flex items-center gap-2 text-h2 font-medium tracking-tight text-ink">
              <Brain className="h-6 w-6 text-brand" />
              Trend Outlook
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-ink-muted">
              Multi-horizon XGBoost regressor predicting cumulative returns across 1, 7, and 30 sessions, calibrated with FinBERT sentiment.
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              {prediction?.asOf && (
                <Badge
                  tone={asOfStale ? 'warn' : 'neutral'}
                  icon={<Calendar className="h-3.5 w-3.5" aria-hidden="true" />}
                >
                  Close of {formatDate(prediction.asOf)} · {formatDayGap(asOfGap)}
                </Badge>
              )}
              {prediction && prediction.modelStatus !== 'loaded' && (
                <Badge
                  tone="down"
                  icon={<Warning className="h-3.5 w-3.5" aria-hidden="true" />}
                >
                  Model not loaded
                </Badge>
              )}
            </div>

            {/* Deep Analysis Trigger Button (Moved from footer) */}
            {!ai && !aiLoading && (
              <div className="mt-12 pt-12 border-t border-line">
                <h3 className="flex items-center gap-2 text-h3 font-medium text-ink">
                  <Sparkle className="h-5 w-5 text-brand" aria-hidden="true" />
                  Deep Analysis
                </h3>
                {AI_ANALYSIS_ENABLED ? (
                  <>
                    <p className="mt-2 mb-6 text-sm text-ink-muted">
                      {user
                        ? 'DeepSeek reads the price data, filings, and news for this symbol to provide a full qualitative breakdown.'
                        : 'Deep analysis is limited to signed-in accounts because each run is a paid model call.'}
                    </p>
                    <Button
                      fullWidth
                      size="lg"
                      onClick={() => void loadAiAnalysis()}
                    >
                      {user ? 'Generate analysis' : 'Log in to generate'}
                    </Button>
                  </>
                ) : (
                  <>
                    <p className="mt-2 mb-6 text-sm text-ink-muted">
                      Deep AI analysis is being finalised for release.
                    </p>
                    <Button
                      fullWidth
                      size="lg"
                      variant="subtle"
                      onClick={() => setAiComingSoon(true)}
                    >
                      Coming soon
                    </Button>
                    {aiComingSoon && (
                      <Notice tone="info" title="Almost there" className="mt-4">
                        The chatbot is live, but the qualitative page analysis will be unlocked in the next update.
                      </Notice>
                    )}
                  </>
                )}
              </div>
            )}
          </div>

          {/* Content Column */}
          <div className="lg:col-span-8">
            {predictionLoading ? (
              <div className="grid gap-8 sm:grid-cols-3">
                {[0, 1, 2].map((i) => (
                  <div key={i}>
                    <Skeleton className="h-3 w-24" />
                    <Skeleton className="mt-4 h-8 w-32" />
                    <Skeleton className="mt-3 h-3 w-40" />
                  </div>
                ))}
              </div>
            ) : predictionError ? (
              <Notice
                tone="error"
                title="The forecast could not be produced"
                action={
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => setPredictionKey((n) => n + 1)}
                    leftIcon={<ArrowsClockwise className="h-4 w-4" aria-hidden="true" />}
                  >
                    Retry
                  </Button>
                }
              >
                {predictionError}
              </Notice>
            ) : prediction ? (
              <>
                {/* 3 Horizons Grid */}
                <div className="grid gap-4 sm:grid-cols-3">
                  {[
                    { key: '1d', label: '1-Day (Next Session)', horizon: prediction.horizons?.['1d'], badge: 'Session' },
                    { key: '7d', label: '7-Day (Weekly Swing)', horizon: prediction.horizons?.['7d'], badge: 'Swing Focus' },
                    { key: '30d', label: '30-Day (Monthly Trend)', horizon: prediction.horizons?.['30d'], badge: 'Position' },
                  ].map(({ key, label, horizon }) => {
                    const isUp = horizon?.direction === 'UP';
                    const isDown = horizon?.direction === 'DOWN';
                    const pct = horizon?.predictedPercent ?? prediction.changePercent ?? 0;
                    return (
                      <div
                        key={key}
                        className={cn(
                          'relative rounded-xl border p-4 transition-all duration-200',
                          key === '7d'
                            ? 'border-brand/40 bg-brand/[0.03] shadow-sm ring-1 ring-brand/20'
                            : 'border-line bg-surface/50'
                        )}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-mono text-xs font-medium uppercase tracking-wider text-ink-muted">
                            {label}
                          </span>
                          <Badge
                            tone={isUp ? 'up' : isDown ? 'down' : 'neutral'}
                            size="sm"
                          >
                            {horizon?.direction || 'NEUTRAL'}
                          </Badge>
                        </div>

                        <div className="mt-3 flex items-baseline gap-2">
                          <span className="text-2xl font-bold tracking-tight text-ink">
                            {pct > 0 ? `+${pct.toFixed(2)}%` : `${pct.toFixed(2)}%`}
                          </span>
                          <span className="text-xs text-ink-muted">
                            {pct > 0 ? 'expected gain' : 'expected move'}
                          </span>
                        </div>

                        <div className="mt-3 flex items-center justify-between text-xs text-ink-muted border-t border-line/40 pt-2">
                          <span>Target: Rs {formatPrice(horizon?.predictedClose ?? prediction.nextDayPrice ?? 0)}</span>
                          {horizon?.directionalAccuracy && (
                            <span className="font-mono text-[10px] text-ink-muted/80">
                              {horizon.directionalAccuracy}% acc.
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Secondary Indicators: Confidence & News Sentiment */}
                <div className="mt-8 grid gap-8 sm:grid-cols-2 border-t border-line/60 pt-6">
                  <div>
                    <Meter
                      label="Model Bullishness Confidence"
                      value={prediction.confidence}
                      valueLabel={`${prediction.confidence.toFixed(1)}%`}
                      hint={
                        prediction.asOf
                          ? `Calculated from technical momentum features as of ${formatDate(prediction.asOf)}.`
                          : undefined
                      }
                    />
                  </div>

                  <div>
                    <p className="font-mono text-xs tracking-wider text-ink-muted uppercase">
                      News Sentiment (FinBERT)
                    </p>
                    {hasSentiment ? (
                      <>
                        <div className="mt-2 flex items-center gap-2">
                          <Badge tone={prediction.sentimentLabel === 'Bullish' ? 'up' : prediction.sentimentLabel === 'Bearish' ? 'down' : 'neutral'}>
                            {prediction.sentimentLabel || 'Neutral'}
                          </Badge>
                          <span className="text-sm text-ink-muted font-mono">
                            score {prediction.sentimentScore.toFixed(3)}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-ink-muted">
                          Evaluated over {formatInt(prediction.headlineCount)}{' '}
                          {prediction.headlineCount === 1 ? 'headline' : 'headlines'}.
                        </p>
                      </>
                    ) : (
                      <>
                        <p className="mt-2 text-xs text-ink-muted">
                          On-demand FinBERT headline sentiment scoring.
                        </p>
                        <Button
                          variant="subtle"
                          size="sm"
                          className="mt-3"
                          loading={newsLoading}
                          loadingText="Analysing…"
                          onClick={() => void loadNewsSentiment()}
                          leftIcon={<Newspaper className="h-4 w-4" aria-hidden="true" />}
                        >
                          Analyse news sentiment
                        </Button>
                      </>
                    )}
                  </div>
                </div>

                {/* Methodology & Disclaimer Notice */}
                <div className="mt-6 rounded-lg bg-surface-muted/40 border border-line/50 p-3 text-xs text-ink-muted flex items-start gap-2">
                  <Brain className="h-4 w-4 text-brand shrink-0 mt-0.5" />
                  <p>
                    <strong>Research Screener:</strong> Multi-horizon cross-sectional XGBoost regressor evaluated against a zero-return baseline. Outputs are probabilistic estimates, not financial advice.
                  </p>
                </div>

                {prediction.warnings.length > 0 && (
                  <div className="mt-8 space-y-3">
                    {prediction.warnings.map((warning) => (
                      <Notice key={warning} tone="warn">
                        {warning}
                      </Notice>
                    ))}
                  </div>
                )}

                <p className="mt-12 text-sm text-ink-muted">
                  {prediction.latestPrice != null && prediction.asOf
                    ? `Computed from a Rs ${formatPrice(prediction.latestPrice)} close on ${formatDate(prediction.asOf)}, which is the model's feed and not the live CSE price above. `
                    : ''}
                  A direction probability is not a price target, and none of this is
                  financial advice.
                </p>
              </>
            ) : null}
          </div>
        </div>
      </section>

      {/* --------------------------------------------------------- deep analysis */}
      {aiLoading && (
        <section className="mb-24 border-t border-line pt-12">
          <div
            className="flex flex-col items-center gap-4 py-12 text-center"
            role="status"
            aria-live="polite"
          >
            <Sparkle
              className="h-8 w-8 animate-pulse text-brand"
              aria-hidden="true"
            />
            <h2 className="text-h3 font-medium tracking-tight text-ink">Running the deep analysis</h2>
            <p className="max-w-md text-sm leading-relaxed text-ink-muted">
              Reading the price series, weighing the technicals and gathering
              recent coverage for {ticker}. This usually takes 30–60 seconds and
              will not interrupt the rest of the page.
            </p>
          </div>
        </section>
      )}

      {aiError && !aiLoading && (
        <section className="mb-24 border-t border-line pt-12">
          <Notice
            tone="error"
            title="AI deep analysis failed"
            action={
              <Button
                size="sm"
                variant="secondary"
                onClick={() => void loadAiAnalysis()}
                leftIcon={<ArrowsClockwise className="h-4 w-4" aria-hidden="true" />}
              >
                Retry
              </Button>
            }
          >
            {aiError}
          </Notice>
        </section>
      )}

      {ai && !aiLoading && (
        <section className="mb-24 border-t border-line pt-12">
          <div className="grid gap-12 lg:grid-cols-12">
            {/* Header Column */}
            <div className="lg:col-span-4">
              <h2 className="flex items-center gap-2 text-h2 font-medium tracking-tight text-ink">
                <Sparkle className="h-6 w-6 text-brand" aria-hidden="true" />
                Deep analysis
              </h2>
              <p className="mt-4 text-sm leading-relaxed text-ink-muted">
                Generated for {ticker} from the data shown on this page.
              </p>
              
              <div className="mt-6">
                <Badge
                  tone={
                    ai.overall_verdict === 'Bullish'
                      ? 'up'
                      : ai.overall_verdict === 'Bearish'
                        ? 'down'
                        : 'neutral'
                  }
                  icon={
                    ai.overall_verdict === 'Bullish' ? (
                      <TrendUp className="h-3.5 w-3.5" aria-hidden="true" />
                    ) : ai.overall_verdict === 'Bearish' ? (
                      <TrendDown className="h-3.5 w-3.5" aria-hidden="true" />
                    ) : (
                      <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                    )
                  }
                >
                  {ai.overall_verdict} · {ai.verdict_confidence.toLowerCase()} confidence
                </Badge>
              </div>

              <div className="mt-12 space-y-3">
                <p className="text-xs leading-relaxed text-ink-muted">
                  {ai.recommendation_note ||
                    'Model output for information only. Not financial advice.'}
                </p>
                <p className="text-xs leading-relaxed text-ink-muted">
                  Generated by DeepSeek from the market data on this page — it has no
                  access to anything else.
                </p>
              </div>
            </div>

            {/* Content Column */}
            <div className="lg:col-span-8 space-y-12">
              {ai.summary && (
                <p className="text-base leading-relaxed text-ink-secondary">
                  {ai.summary}
                </p>
              )}

              {ai.key_insights?.length > 0 && (
                <section aria-labelledby="ai-insights">
                  <h3
                    id="ai-insights"
                    className="font-mono text-xs font-semibold tracking-wider text-ink-muted uppercase"
                  >
                    Key insights
                  </h3>
                  <ul className="mt-4 space-y-3">
                    {ai.key_insights.map((insight) => (
                      <li key={insight} className="flex gap-4">
                        <span
                          className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-brand"
                          aria-hidden="true"
                        />
                        <span className="text-sm leading-relaxed text-ink-secondary">
                          {insight}
                        </span>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {ai.recent_news?.length > 0 && (
                <section aria-labelledby="ai-news">
                  <h3
                    id="ai-news"
                    className="flex items-center gap-2 font-mono text-xs font-semibold tracking-wider text-ink-muted uppercase"
                  >
                    <Newspaper className="h-3.5 w-3.5" aria-hidden="true" />
                    Recent coverage
                  </h3>
                  <ul className="mt-4 space-y-3">
                    {ai.recent_news.map((item) => (
                      <li key={item.url || item.headline}>
                        <a
                          href={item.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="group flex gap-4 rounded-xl border border-line bg-card px-4 py-3 transition-[background-color,border-color] duration-150 ease-out-quart hover:border-line-strong hover:bg-sunken focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
                        >
                          <ArrowSquareOut
                            className="mt-0.5 h-4 w-4 shrink-0 text-ink-muted"
                            aria-hidden="true"
                          />
                          <span className="min-w-0">
                            <span className="block text-sm font-medium text-ink group-hover:text-brand-ink">
                              {item.headline}
                            </span>
                            <span className="mt-1 block font-mono text-xs text-ink-muted">
                              {[item.source, item.date && formatDate(item.date)]
                                .filter(Boolean)
                                .join(' · ')}
                              <span className="sr-only"> (opens in a new tab)</span>
                            </span>
                            {item.relevance && (
                              <span className="mt-1 block text-sm text-ink-muted">
                                {item.relevance}
                              </span>
                            )}
                          </span>
                        </a>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {ai.risk_factors?.length > 0 && (
                <section aria-labelledby="ai-risks">
                  <h3
                    id="ai-risks"
                    className="flex items-center gap-2 font-mono text-xs font-semibold tracking-wider text-ink-muted uppercase"
                  >
                    <Warning className="h-3.5 w-3.5" aria-hidden="true" />
                    Risk factors
                  </h3>
                  <ul className="mt-4 space-y-3">
                    {ai.risk_factors.map((risk) => (
                      <li key={risk} className="flex gap-4">
                        <span
                          className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-warn"
                          aria-hidden="true"
                        />
                        <span className="text-sm leading-relaxed text-ink-secondary">
                          {risk}
                        </span>
                      </li>
                    ))}
                  </ul>
                </section>
              )}
            </div>
          </div>
        </section>
      )}
    </PageShell>
  );
};
