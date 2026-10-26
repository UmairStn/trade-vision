import { useEffect, useMemo, useState } from 'react';
import { ArrowsClockwise, ChartBar, TrendDown, TrendUp } from '@phosphor-icons/react';
import { fetchSectors, type SectorItem } from '../services/api';
import { Badge, Button, Delta, Notice, Skeleton } from './ui';
import { formatCompact, formatInt } from '../lib/format';
import { cn } from '../lib/cn';

interface SectorHeatmapProps {
  className?: string;
  compact?: boolean;
}

type FilterOption = 'all' | 'gainers' | 'losers';
type SortOption = 'turnover' | 'change' | 'name';

export const SectorHeatmap = ({ className, compact = false }: SectorHeatmapProps) => {
  const [sectors, setSectors] = useState<SectorItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterOption>('all');
  const [sortBy, setSortBy] = useState<SortOption>('turnover');

  const loadSectors = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchSectors();
      setSectors(res.sectors || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load sector performance');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadSectors();
  }, []);

  const { gainersCount, losersCount, flatCount, totalTurnover } = useMemo(() => {
    let g = 0;
    let l = 0;
    let flat = 0;
    let t = 0;
    for (const s of sectors) {
      if (s.percentage_change > 0) g++;
      else if (s.percentage_change < 0) l++;
      else flat++;
      t += s.turnover || 0;
    }
    return { gainersCount: g, losersCount: l, flatCount: flat, totalTurnover: t };
  }, [sectors]);

  const filteredSectors = useMemo(() => {
    let list = [...sectors];
    if (filter === 'gainers') {
      list = list.filter((s) => s.percentage_change > 0);
    } else if (filter === 'losers') {
      list = list.filter((s) => s.percentage_change < 0);
    }

    list.sort((a, b) => {
      if (sortBy === 'turnover') return (b.turnover || 0) - (a.turnover || 0);
      if (sortBy === 'change') return (b.percentage_change || 0) - (a.percentage_change || 0);
      return a.name.localeCompare(b.name);
    });

    return compact ? list.slice(0, 12) : list;
  }, [sectors, filter, sortBy, compact]);

  return (
    <div className={cn('rounded-2xl border border-line bg-surface/50 p-6 backdrop-blur shadow-sm', className)}>
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
        <div>
          <div className="flex items-center gap-2">
            <ChartBar className="h-5 w-5 text-brand" />
            <h3 className="text-h3 font-semibold text-ink">CSE Sector Performance</h3>
            <Badge tone="neutral" size="sm">
              {sectors.length} Industry Groups
            </Badge>
          </div>
          <p className="mt-1 text-xs text-ink-muted">
            Live performance, index movements, and intraday turnover distribution across all Colombo Stock Exchange sectors.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Quick Breadth Pills */}
          <div className="flex items-center gap-1.5 text-xs font-medium mr-2">
            <span className="flex items-center gap-1 text-emerald-500">
              <TrendUp className="h-3.5 w-3.5" />
              {gainersCount} Up
            </span>
            <span className="text-ink-muted">·</span>
            <span className="flex items-center gap-1 text-rose-500">
              <TrendDown className="h-3.5 w-3.5" />
              {losersCount} Down
            </span>
            <span className="text-ink-muted">·</span>
            <span className="text-ink-muted">{flatCount} Flat</span>
          </div>

          <Button
            size="sm"
            variant="ghost"
            onClick={() => void loadSectors()}
            loading={loading}
            leftIcon={<ArrowsClockwise className="h-3.5 w-3.5" />}
          >
            Refresh
          </Button>
        </div>
      </div>

      {/* Filter / Sort bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-y border-line/60 py-3 mb-6 text-xs text-ink-muted">
        <div className="flex items-center gap-1">
          <span className="mr-1 font-medium">Filter:</span>
          {(['all', 'gainers', 'losers'] as FilterOption[]).map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => setFilter(opt)}
              className={cn(
                'rounded-lg px-2.5 py-1 capitalize transition-colors',
                filter === opt
                  ? 'bg-ink text-page font-medium'
                  : 'hover:bg-sunken text-ink-secondary'
              )}
            >
              {opt}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <span className="font-medium">Sort by:</span>
          {(['turnover', 'change', 'name'] as SortOption[]).map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => setSortBy(opt)}
              className={cn(
                'rounded-lg px-2 py-0.5 capitalize transition-colors',
                sortBy === opt
                  ? 'bg-brand/10 text-brand font-medium'
                  : 'hover:bg-sunken text-ink-secondary'
              )}
            >
              {opt}
            </button>
          ))}
          {totalTurnover > 0 && (
            <span className="ml-2 font-mono text-[11px] text-ink-muted hidden md:inline">
              Total Turn: Rs {formatCompact(totalTurnover)}
            </span>
          )}
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }, (_, i) => (
            <div key={i} className="rounded-xl border border-line/60 p-4 bg-card/60">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="mt-3 h-6 w-20" />
              <Skeleton className="mt-2 h-3 w-24" />
            </div>
          ))}
        </div>
      ) : error ? (
        <Notice
          tone="error"
          title="Sector data unavailable"
          action={
            <Button size="sm" variant="secondary" onClick={() => void loadSectors()}>
              Try again
            </Button>
          }
        >
          {error}
        </Notice>
      ) : filteredSectors.length === 0 ? (
        <div className="py-8 text-center text-sm text-ink-muted">
          No sectors matched your current filter.
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {filteredSectors.map((sector) => {
            const isUp = sector.percentage_change > 0;
            const isDown = sector.percentage_change < 0;
            const pct = sector.percentage_change;

            return (
              <div
                key={sector.id || sector.sector_id || sector.name}
                className={cn(
                  'group relative flex flex-col justify-between rounded-xl border p-4 transition-all duration-200',
                  'hover:scale-[1.01] hover:shadow-md',
                  isUp
                    ? 'border-emerald-500/20 bg-emerald-500/[0.03] hover:border-emerald-500/40 hover:bg-emerald-500/[0.06]'
                    : isDown
                    ? 'border-rose-500/20 bg-rose-500/[0.03] hover:border-rose-500/40 hover:bg-rose-500/[0.06]'
                    : 'border-line bg-card/60 hover:border-line-strong hover:bg-sunken'
                )}
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <span
                      className="font-medium text-sm text-ink line-clamp-1 group-hover:text-brand-ink"
                      title={sector.name}
                    >
                      {sector.name}
                    </span>
                    <Delta
                      value={sector.change}
                      percent={pct}
                      size="sm"
                      variant="pill"
                      className="shrink-0"
                    />
                  </div>

                  <div className="mt-2 flex items-baseline gap-2">
                    <span className="font-mono text-base font-semibold text-ink">
                      {sector.index_value ? sector.index_value.toLocaleString(undefined, { maximumFractionDigits: 2 }) : '—'}
                    </span>
                    <span className="font-mono text-[10px] text-ink-muted">
                      Index
                    </span>
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-line/40 pt-2 text-[11px] text-ink-muted font-mono">
                  <span>Turn: Rs {formatCompact(sector.turnover || 0)}</span>
                  <span>{formatInt(sector.trades || 0)} trades</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
