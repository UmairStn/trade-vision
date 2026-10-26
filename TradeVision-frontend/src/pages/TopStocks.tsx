import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lightning, ArrowsClockwise, MagnifyingGlass, TrendDown, TrendUp, WifiSlash } from '@phosphor-icons/react';
import { useStockContext } from '../context/StockContext';
import { usePageTitle } from '../hooks/usePageTitle';
import type { StockQuote } from '../types/stock';
import { formatCompact, formatInt, formatPrice } from '../lib/format';
import {
  Badge,
  Button,
  DataTable,
  Delta,
  EmptyState,
  Notice,
  PageHeader,
  PageShell,
  SegmentedControl,
  Stat,
} from '../components/ui';
import type { Column } from '../components/ui';

type MoverList = 'gainers' | 'losers' | 'active';

const columns: Column<StockQuote>[] = [
  {
    id: 'ticker',
    header: 'Symbol',
    primary: true,
    mobile: 'title',
    sortBy: (r) => r.ticker,
    cell: (r) => (
      <div className="flex items-center gap-2.5">
        <span
          aria-hidden="true"
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-surface border border-line font-mono text-[10px] font-bold text-ink-muted"
        >
          {r.ticker.split('.')[0].slice(0, 3)}
        </span>
        <span className="font-semibold text-ink">{r.ticker}</span>
      </div>
    ),
  },
  {
    id: 'name',
    header: 'Company',
    mobile: 'subtitle',
    hideBelow: 'lg',
    sortBy: (r) => r.name,
    cell: (r) => (
      <span className="block max-w-64 truncate" title={r.name}>
        {r.name}
      </span>
    ),
  },
  {
    id: 'price',
    header: 'Price',
    headerHint: 'Last traded price in rupees',
    numeric: true,
    mobile: 'value',
    sortBy: (r) => r.price,
    cell: (r) => (
      <span className="text-body font-bold text-ink tabular-nums">
        Rs {formatPrice(r.price)}
      </span>
    ),
  },
  {
    id: 'change',
    header: 'Change',
    numeric: true,
    sortBy: (r) => r.changePercent,
    cell: (r) => (
      <Delta
        value={r.change}
        percent={r.changePercent}
        size="sm"
        variant="pill"
        className="justify-end"
      />
    ),
  },
  {
    id: 'volume',
    header: 'Volume',
    headerHint: 'Shares traded today',
    numeric: true,
    sortBy: (r) => r.volume,
    cell: (r) => formatInt(r.volume),
  },
  {
    id: 'turnover',
    header: 'Turnover',
    headerHint: 'Value traded today, in rupees',
    numeric: true,
    hideBelow: 'xl',
    // `turnover` is optional — the CSE's mover endpoints omit it — so it sorts
    // last rather than as zero.
    sortBy: (r) => r.turnover ?? null,
    cell: (r) => (r.turnover != null ? `Rs ${formatCompact(r.turnover)}` : '—'),
  },
];

export const TopStocks = () => {
  usePageTitle('Market overview');
  const { marketSummary, isLoading, error, refresh } = useStockContext();
  const [list, setList] = useState<MoverList>('gainers');
  const [query, setQuery] = useState('');
  const navigate = useNavigate();

  const source = useMemo<StockQuote[]>(() => {
    if (!marketSummary) return [];
    if (list === 'gainers') return marketSummary.gainers;
    if (list === 'losers') return marketSummary.losers;
    return marketSummary.mostActive;
  }, [marketSummary, list]);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return source;
    return source.filter(
      (s) =>
        s.ticker.toLowerCase().includes(q) || s.name.toLowerCase().includes(q),
    );
  }, [source, query]);

  // Distinct from the loading state: the request finished and failed, so offer a
  // retry rather than spinning forever. (Preserved from the previous version —
  // it was one of the few things this page already got right.)
  if (!isLoading && !marketSummary) {
    return (
      <PageShell width="narrow">
        <EmptyState
          icon={<WifiSlash className="h-6 w-6" aria-hidden="true" />}
          title="Market data unavailable"
          description={error ?? 'Could not load the CSE market summary.'}
          action={
            <Button
              onClick={refresh}
              leftIcon={<ArrowsClockwise className="h-4 w-4" aria-hidden="true" />}
            >
              Try again
            </Button>
          }
        />
      </PageShell>
    );
  }

  const status = marketSummary?.status;
  const isOpen = !!status && /open/i.test(status);
  const indices = marketSummary?.indices;

  return (
    <PageShell>
      <PageHeader
        title="Market overview"
        description="Today's biggest movers on the Colombo Stock Exchange."
        actions={
          <>
            {indices?.aspi != null && (
              <div className="mr-2 rounded-xl border border-line bg-card px-4 py-2">
                <Stat
                  label="ASPI"
                  size="sm"
                  align="right"
                  value={
                    <span className="text-h3 font-bold text-gradient-brand">
                      {formatPrice(indices.aspi)}
                    </span>
                  }
                  delta={
                    <Delta
                      value={indices.aspiChange}
                      percent={indices.aspiChangePercent}
                      size="sm"
                    />
                  }
                />
              </div>
            )}
            {status && (
              <Badge tone={isOpen ? 'up' : 'neutral'} dot size="lg" className="px-3 py-1 text-sm">
                {status}
              </Badge>
            )}
            <Button
              variant="secondary"
              size="sm"
              onClick={refresh}
              leftIcon={<ArrowsClockwise className="h-4 w-4" aria-hidden="true" />}
            >
              Refresh
            </Button>
          </>
        }
      />

      {/* A refresh can fail while stale-but-valid data is still on screen. Warn
          without tearing the table down. */}
      {error && marketSummary && (
        <Notice tone="warn" title="Showing the last successful load" className="mt-6">
          {error}
        </Notice>
      )}

      {marketSummary?.warnings?.length ? (
        <Notice tone="warn" title="Some lists are incomplete" className="mt-6">
          <ul className="list-inside list-disc space-y-0.5">
            {marketSummary.warnings.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
        </Notice>
      ) : null}

      {/* Filters in one row above the table. */}
      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <SegmentedControl
          label="Filter movers"
          value={list}
          onChange={(val) => setList(val as MoverList)}
          options={[
            {
              value: 'gainers',
              label: 'Gainers',
              tone: 'up',
              icon: <TrendUp className="h-3.5 w-3.5" aria-hidden="true" />,
              badge: marketSummary?.gainers.length,
            },
            {
              value: 'losers',
              label: 'Losers',
              tone: 'down',
              icon: <TrendDown className="h-3.5 w-3.5" aria-hidden="true" />,
              badge: marketSummary?.losers.length,
            },
            {
              value: 'active',
              label: 'Most Active',
              icon: <Lightning className="h-3.5 w-3.5" aria-hidden="true" />,
              badge: marketSummary?.mostActive.length,
            },
          ]}
        />

        <div className="relative sm:w-72">
          <MagnifyingGlass
            className="pointer-events-none absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2 text-ink-muted"
            aria-hidden="true"
          />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filter by symbol or company"
            aria-label="Filter this list by symbol or company"
            className="h-10 w-full rounded-full border border-line bg-sunken pr-4 pl-10 text-sm text-ink
                       placeholder:text-ink-muted
                       focus:border-brand focus:ring-2 focus:ring-brand/40 focus:outline-none
                       focus:shadow-[0_0_0_4px_var(--brand-ring)]"
          />
        </div>
      </div>

      <div className="mt-8 border-t border-b border-line bg-page">
        <DataTable
          columns={columns}
          rows={rows}
          getRowKey={(r) => r.ticker}
          loading={isLoading}
          skeletonRows={8}
          caption={`${list} on the Colombo Stock Exchange, with price, change, volume and turnover`}
          onRowSelect={(r) => navigate(`/analyzer?ticker=${encodeURIComponent(r.ticker)}`)}
          rowActionLabel={(r) => `Analyze ${r.ticker}, ${r.name}`}
          empty={
            <EmptyState
              icon={<Lightning className="h-6 w-6" aria-hidden="true" />}
              title={query ? 'No matches' : 'No movers to show'}
              description={
                query
                  ? `Nothing in this list matches "${query.trim()}".`
                  : isOpen
                    ? 'The exchange has not reported movers for this category yet.'
                    : `The market is closed (${status ?? 'no session'}), so this list may stay empty until the next session.`
              }
              action={
                query ? (
                  <Button variant="secondary" onClick={() => setQuery('')}>
                    Clear filter
                  </Button>
                ) : undefined
              }
            />
          }
        />
      </div>
    </PageShell>
  );
};
