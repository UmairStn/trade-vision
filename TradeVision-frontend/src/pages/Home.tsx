import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Bell, Brain, Circle, Stack, ChartPieSlice, Receipt, TrendDown, TrendUp, Wallet } from '@phosphor-icons/react';
import { MarqueeTicker } from '../components/MarqueeTicker';
import { StockCard } from '../components/StockCard';
import { PriceChart } from '../components/charts/PriceChart';
import { useStockContext } from '../context/StockContext';
import { usePageTitle } from '../hooks/usePageTitle';
import { fetchStockHistory } from '../services/api';
import { SectorHeatmap } from '../components/SectorHeatmap';
import type { StockPrice } from '../types/stock';
import { formatCompact, formatInt, formatPrice } from '../lib/format';
import { cn } from '../lib/cn';
import {
  Badge,
  Delta,
  Notice,
  Skeleton,
  Stat,
} from '../components/ui';
import { buttonClass } from '../components/ui/Button';

const FEATURES = [
  {
    icon: Brain,
    title: 'Model-backed forecasts',
    body:
      'A next-day price and direction probability for any listed symbol, with the ' +
      'confidence and the date it was computed from both shown, not hidden.',
  },
  {
    icon: ChartPieSlice,
    title: 'Portfolio tracking',
    body:
      'Record holdings at cost and see position value, unrealised gain and day ' +
      'change against live CSE prices.',
  },
  {
    icon: Bell,
    title: 'AI research assistant',
    body:
      'Ask about a company in plain language. Every figure in the answer is ' +
      'labelled with the data lookup it came from.',
  },
] as const;

/** Market-status pill, driven by the CSE's own status string. */
const StatusBadge = ({ status }: { status?: string }) => {
  if (!status) return null;
  const open = /open/i.test(status);
  return (
    <Badge tone={open ? 'up' : 'neutral'} dot size="lg" className="px-3 py-1 text-sm">
      {status}
    </Badge>
  );
};

export const Home = () => {
  usePageTitle();
  const { selectedTicker, marketSummary, isLoading, error } = useStockContext();

  const [heroSeries, setHeroSeries] = useState<StockPrice[]>([]);
  const [heroLoading, setHeroLoading] = useState(true);

  // The hero used to be an empty radial gradient. One real series is a better
  // advertisement for the product than a decorative glow, and it is the same
  // request the analyzer makes, so the cost is one round trip.
  useEffect(() => {
    let stale = false;
    setHeroLoading(true);
    fetchStockHistory(selectedTicker, 90)
      .then((points) => {
        if (!stale) setHeroSeries(points);
      })
      .catch(() => {
        // A failed hero chart must not take the landing page with it; PriceChart
        // renders its own empty state from the untouched array.
        if (!stale) setHeroSeries([]);
      })
      .finally(() => {
        if (!stale) setHeroLoading(false);
      });
    return () => {
      stale = true;
    };
  }, [selectedTicker]);

  const indices = marketSummary?.indices;
  const tickerItems = marketSummary
    ? [...marketSummary.gainers, ...marketSummary.losers]
    : [];
  const topGainers = marketSummary?.gainers.slice(0, 5) ?? [];
  const topLosers = marketSummary?.losers.slice(0, 5) ?? [];

  const last = heroSeries.at(-1);
  const prev = heroSeries.at(-2);
  const heroChange = last && prev ? last.close - prev.close : null;
  const heroChangePct =
    last && prev && prev.close !== 0 ? ((last.close - prev.close) / prev.close) * 100 : null;

  const kpis = [
    {
      label: 'ASPI',
      icon: <Stack className="h-4 w-4" aria-hidden="true" />,
      value: indices?.aspi != null ? formatPrice(indices.aspi) : '—',
      delta:
        indices?.aspiChange != null || indices?.aspiChangePercent != null ? (
          <Delta value={indices.aspiChange} percent={indices.aspiChangePercent} size="md" />
        ) : undefined,
      hint: 'All Share Price Index',
    },
    {
      label: 'Turnover',
      icon: <Wallet className="h-4 w-4" aria-hidden="true" />,
      value: indices?.turnover != null ? `Rs ${formatCompact(indices.turnover)}` : '—',
      hint: 'Value traded today',
    },
    {
      label: 'Trades',
      icon: <Receipt className="h-4 w-4" aria-hidden="true" />,
      value: formatInt(indices?.trades),
      hint: 'Executed today',
    },
    {
      label: 'Share volume',
      icon: <Circle className="h-4 w-4" aria-hidden="true" />,
      value: formatCompact(indices?.shareVolume),
      hint: 'Shares changing hands',
    },
    {
      label: 'Listed',
      icon: <Stack className="h-4 w-4" aria-hidden="true" />,
      value: formatInt(indices?.listedCompanies),
      hint: 'Companies on the CSE',
    },
  ];

  return (
    <div>
      {/* ---------------------------------------------------------------- hero */}
      <section className="border-b border-line bg-page">
        <div className="mx-auto grid max-w-7xl px-4 sm:px-6 lg:grid-cols-12 lg:px-8">
          <div className="animate-fade-in-up py-20 lg:col-span-6 lg:py-32 lg:pr-12">
            <StatusBadge status={marketSummary?.status} />
            <h1 className="mt-8 text-[3rem] font-medium leading-[1.05] tracking-tight text-ink sm:text-[4rem]">
              Multi-horizon intelligence for the{' '}
              <span className="italic">Colombo Stock Exchange</span>.
            </h1>
            <p
              className="mt-6 max-w-lg text-lg leading-relaxed text-ink-secondary"
              style={{ animationDelay: '80ms' }}
            >
              1-day, 7-day swing and 30-day position forecasts powered by cross-sectional
              XGBoost regressors and live CSE announcement sentiment via FinBERT.
            </p>
            <div
              className="mt-10 flex flex-wrap gap-4"
              style={{ animationDelay: '160ms' }}
            >
              <Link
                to="/register"
                className={buttonClass({ size: 'lg' })}
              >
                Create free account
                <ArrowRight className="h-5 w-5" aria-hidden="true" />
              </Link>
              <Link
                to="/top-stocks"
                className={buttonClass({
                  variant: 'subtle',
                  size: 'lg',
                })}
              >
                Explore today's movers
              </Link>
            </div>
            <p
              className="mt-6 font-mono text-xs tracking-wider text-ink-muted uppercase"
              style={{ animationDelay: '240ms' }}
            >
              Free while in development. Forecasts are statistical estimates.
            </p>
          </div>

          <div
            className="animate-fade-in-up border-t border-line lg:col-span-6 lg:border-t-0 lg:border-l"
            style={{ animationDelay: '120ms' }}
          >
            <div className="flex h-full flex-col bg-sunken p-8 lg:p-12">
              <div className="mb-12 flex items-end justify-between">
                <div>
                  <h3 className="font-mono text-xs tracking-wider text-ink-muted uppercase">Preview: {selectedTicker}</h3>
                  <p className="mt-2 text-sm text-ink-muted">Last 90 trading days</p>
                </div>
                {heroLoading ? (
                   <Skeleton className="h-8 w-28" />
                ) : last ? (
                   <div className="text-right">
                     <p className="text-h2 font-medium tracking-tight text-ink">
                       Rs {formatPrice(last.close)}
                     </p>
                     <Delta
                       value={heroChange}
                       percent={heroChangePct}
                       size="sm"
                       className="mt-1 justify-end"
                     />
                   </div>
                ) : null}
              </div>
              
              <div className="mt-auto">
                <PriceChart
                  data={heroSeries}
                  ticker={selectedTicker}
                  loading={heroLoading}
                  height={280}
                  showVolume={false}
                  showViewToggle={false}
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      <MarqueeTicker items={tickerItems} />

      {/* ----------------------------------------------------------------- kpis */}
      {/* ----------------------------------------------------------------- kpis */}
      <section
        aria-labelledby="market-today"
        className="border-b border-line bg-page"
      >
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <h2 id="market-today" className="text-h2 font-medium tracking-tight text-ink">
              Market today
            </h2>
            <StatusBadge status={marketSummary?.status} />
          </div>

          {error && (
            <Notice tone="error" title="Live market data is unavailable" className="mt-8">
              {error}
            </Notice>
          )}
          {!error && marketSummary?.warnings?.length ? (
            <Notice tone="warn" title="Some figures are incomplete" className="mt-8">
              <ul className="list-inside list-disc space-y-1">
                {marketSummary.warnings.map((w) => (
                  <li key={w}>{w}</li>
                ))}
              </ul>
            </Notice>
          ) : null}

          <div className="mt-12 grid grid-cols-2 gap-x-12 gap-y-12 border-t border-line pt-12 sm:grid-cols-3 lg:grid-cols-5">
            {kpis.map((kpi, i) => (
              <div
                key={String(kpi.label)}
                className="animate-fade-in-up transition-opacity duration-250 ease-out-quart"
                style={{ animationDelay: `${i * 80}ms` }}
              >
                {isLoading ? (
                  <>
                    <Skeleton className="h-3 w-20" />
                    <Skeleton className="mt-3 h-7 w-24" />
                    <Skeleton className="mt-2 h-3 w-28" />
                  </>
                ) : (
                  <Stat
                    label={kpi.label}
                    value={kpi.value}
                    delta={kpi.delta}
                    hint={kpi.hint}
                    className="[&_p]:font-mono [&_p]:text-xs [&_p]:tracking-wider [&_p]:uppercase"
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* --------------------------------------------------------------- movers */}
      {(isLoading || topGainers.length > 0 || topLosers.length > 0) && (
        <section aria-labelledby="movers" className="border-b border-line bg-page">
          <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 id="movers" className="text-h2 font-medium tracking-tight text-ink">
                  Today's biggest movers
                </h2>
                <p className="mt-2 text-sm text-ink-muted">
                  Ranked by percentage change, live from the CSE.
                </p>
              </div>
              <Link
                to="/top-stocks"
                className={buttonClass({ variant: 'ghost', size: 'sm' })}
              >
                View all
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>

            <div className="mt-12 grid gap-12 lg:grid-cols-2">
              {(
                [
                  { key: 'gainers', title: 'Gainers', icon: TrendUp, rows: topGainers, accent: 'border-t-2 border-t-up', iconTone: 'text-up' },
                  { key: 'losers', title: 'Losers', icon: TrendDown, rows: topLosers, accent: 'border-t-2 border-t-down', iconTone: 'text-down' },
                ] as const
              ).map(({ key, title, icon: Icon, rows, accent, iconTone }) => (
                <div key={key} className={cn('pt-8', accent)}>
                  <h3 className="flex items-center gap-2 text-h3 font-medium text-ink">
                    <Icon className={cn('h-5 w-5', iconTone)} aria-hidden="true" />
                    {title}
                  </h3>
                  <div className="mt-8 space-y-4">
                    {isLoading
                      ? Array.from({ length: 5 }, (_, i) => (
                          <Skeleton key={i} className="h-16 w-full" />
                        ))
                      : rows.map((quote, i) => (
                          <StockCard
                            key={quote.ticker}
                            quote={quote}
                            rank={i + 1}
                            to={`/analyzer?ticker=${encodeURIComponent(quote.ticker)}`}
                          />
                        ))}
                    {!isLoading && rows.length === 0 && (
                      <p className="py-8 text-center text-sm text-ink-muted">
                        No {title.toLowerCase()} reported — the market may be closed.
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ------------------------------------------------------ sector heatmap */}
      <section aria-labelledby="sectors" className="border-b border-line bg-page">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <SectorHeatmap />
        </div>
      </section>

      {/* ------------------------------------------------------------- features */}
      {/* ------------------------------------------------------------- features */}
      <section
        aria-labelledby="features"
        className="border-b border-line bg-page"
      >
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
          <div className="grid gap-16 lg:grid-cols-2 lg:items-center">
            {/* Image Column */}
            <div className="relative aspect-square lg:aspect-auto lg:h-[600px] overflow-hidden rounded-sm bg-sunken">
              <img
                src="/assets/bento.jpg"
                alt="Sleek glass dashboard showing financial data and market trends"
                className="absolute inset-0 h-full w-full object-cover grayscale-[0.2]"
              />
            </div>
            
            {/* Features Column */}
            <div>
              <h2 id="features" className="text-[2.5rem] leading-tight font-medium tracking-tight text-ink">
                Everything you need to research a CSE listing
              </h2>
              <div className="mt-12 space-y-12">
                {FEATURES.map(({ icon: Icon, title, body }, i) => (
                  <div
                    key={title}
                    className="animate-fade-in-up transition-all duration-300 ease-out-quart"
                    style={{ animationDelay: `${i * 100}ms` }}
                  >
                    <div className="flex items-center gap-4">
                      <span
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-sm bg-ink text-page"
                      >
                        <Icon className="h-5 w-5" aria-hidden="true" />
                      </span>
                      <h3 className="text-h3 font-medium text-ink transition-colors duration-150">
                        {title}
                      </h3>
                    </div>
                    <p className="mt-4 pl-14 text-lg leading-relaxed text-ink-muted">{body}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------------ cta */}
      <section className="bg-sunken">
        <div className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8 lg:py-32">
          <div className="flex flex-col items-center border border-line bg-page p-12 text-center lg:p-24">
            <h2 className="text-[3rem] font-medium leading-tight tracking-tight text-ink sm:text-[4rem]">
              Start tracking <span className="italic">your positions</span>.
            </h2>
            <p className="mt-6 max-w-2xl text-lg leading-relaxed text-ink-secondary">
              Create an account to save a watchlist, record holdings and keep the AI
              assistant's thread between sessions.
            </p>
            <div className="mt-10 flex flex-wrap justify-center gap-4">
              <Link
                to="/register"
                className={buttonClass({ size: 'lg' })}
              >
                Create free account
                <ArrowRight className="h-5 w-5" aria-hidden="true" />
              </Link>
              <Link
                to="/login"
                className={buttonClass({ variant: 'subtle', size: 'lg' })}
              >
                I already have one
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
