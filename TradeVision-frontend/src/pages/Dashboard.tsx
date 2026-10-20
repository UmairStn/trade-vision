import { useCallback, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { NavLink, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Bell, Eye, SquaresFour, ChartLine, SignOut, Plus, ArrowsClockwise, Trash, Warning, Wallet } from '@phosphor-icons/react';
import type {
  PortfolioHolding,
  UserPortfolio,
  WatchlistItem,
} from '../types/stock';
import {
  addToWatchlist,
  fetchPortfolio,
  fetchWatchlist,
  removeFromWatchlist,
} from '../services/api';
import { useAuth } from '../context/AuthContext';
import { usePageTitle } from '../hooks/usePageTitle';
import { formatInt, formatPrice, formatSigned } from '../lib/format';
import { displayName, initialsOf } from '../lib/user';
import { cn } from '../lib/cn';
import {
  Badge,
  Button,
  buttonClass,
  Card,
  CardBody,
  CardHeader,
  DataTable,
  Delta,
  EmptyState,
  Notice,
  PageHeader,
  PageShell,
  Skeleton,
  Stat,
} from '../components/ui';
import type { Column } from '../components/ui';
import { AddPositionModal } from '../components/dashboard/AddPositionModal';
import { AddWatchlistModal } from '../components/dashboard/AddWatchlistModal';
import { HoldingDetailsModal } from '../components/dashboard/HoldingDetailsModal';

/**
 * The dashboard.
 *
 * The previous version was a 615-line single view with a decorative sidebar: its
 * "Portfolio" and "Alerts" entries were styled `<button>`s with no handler, and
 * "Overview" was permanently highlighted. Those are now four real routes under
 * `/dashboard/*`, so the highlight reflects where you actually are and nothing in
 * the sidebar is a prop.
 *
 * Also fixed here: the sidebar "Log out" only called `navigate('/login')` and
 * never `signOut()`, so the session survived and the next protected route let the
 * user straight back in.
 */

const SECTIONS = [
  { to: '/dashboard', label: 'Overview', icon: SquaresFour, end: true },
  { to: '/dashboard/holdings', label: 'Holdings', icon: Wallet, end: false },
  { to: '/dashboard/watchlist', label: 'Watchlist', icon: Eye, end: false },
  { to: '/dashboard/alerts', label: 'Alerts', icon: Bell, end: false },
] as const;

interface Totals {
  cost: number;
  value: number;
  gain: number;
  /** Null when there is no cost basis to divide by — a flat 0% would be a lie. */
  gainPct: number | null;
  open: number;
  closed: number;
}

const emptyTotals: Totals = {
  cost: 0,
  value: 0,
  gain: 0,
  gainPct: null,
  open: 0,
  closed: 0,
};

const totalsOf = (portfolio: UserPortfolio | null): Totals => {
  if (!portfolio) return emptyTotals;
  let cost = 0;
  let value = 0;
  let open = 0;
  for (const h of portfolio.holdings) {
    cost += h.totalShares * h.avgCost;
    value += h.totalShares * h.currentPrice;
    if (h.totalShares > 0) open += 1;
  }
  const gain = value - cost;
  return {
    cost,
    value,
    gain,
    gainPct: cost > 0 ? (gain / cost) * 100 : null,
    open,
    closed: portfolio.holdings.length - open,
  };
};

/** Cost, value and return for one holding, with the divide-by-zero cases named. */
const holdingMath = (h: PortfolioHolding) => {
  const cost = h.totalShares * h.avgCost;
  const value = h.totalShares * h.currentPrice;
  const gain = value - cost;
  return {
    cost,
    value,
    gain,
    // A closed position has no basis, and the old code divided by it anyway —
    // rendering `Infinity%` or `NaN%` for any holding sold down to zero.
    gainPct: cost > 0 ? (gain / cost) * 100 : null,
    closed: h.totalShares === 0,
  };
};

/* -------------------------------------------------------------------- data */

const useDashboardData = () => {
  const [portfolio, setPortfolio] = useState<UserPortfolio | null>(null);
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Distinguishes the first load (skeletons) from a reload after a mutation
  // (existing rows stay put and dim). The old page had one state for both, so
  // adding a position blanked the whole dashboard to a pulsing dot.
  const hasLoaded = useRef(false);

  const load = useCallback(async () => {
    if (hasLoaded.current) setRefreshing(true);
    else setLoading(true);
    try {
      const [p, w] = await Promise.all([fetchPortfolio(), fetchWatchlist()]);
      setPortfolio(p);
      setWatchlist(w);
      setError(null);
      hasLoaded.current = true;
    } catch (e) {
      setError(
        e instanceof Error ? e.message : 'Could not load your portfolio.',
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return { portfolio, watchlist, loading, refreshing, error, reload: load };
};

/* ---------------------------------------------------------------- columns */

const holdingColumns: Column<PortfolioHolding>[] = [
  {
    id: 'ticker',
    header: 'Symbol',
    primary: true,
    mobile: 'title',
    sortBy: (h) => h.ticker,
    cell: (h) => (
      <span className="flex items-center gap-2">
        <span className="rounded-md bg-brand-subtle px-2 py-0.5 font-semibold text-brand-subtle-ink">
          {h.ticker}
        </span>
        {h.totalShares === 0 && (
          <Badge tone="neutral" size="sm">
            Closed
          </Badge>
        )}
      </span>
    ),
  },
  {
    id: 'name',
    header: 'Company',
    mobile: 'subtitle',
    hideBelow: 'xl',
    sortBy: (h) => h.name,
    cell: (h) => (
      <span className="block max-w-56 truncate" title={h.name}>
        {h.name}
      </span>
    ),
  },
  {
    id: 'shares',
    header: 'Shares',
    numeric: true,
    sortBy: (h) => h.totalShares,
    cell: (h) => formatInt(h.totalShares),
  },
  {
    id: 'avgCost',
    header: 'Avg cost',
    headerHint: 'Weighted average price paid per share',
    numeric: true,
    hideBelow: 'lg',
    sortBy: (h) => h.avgCost,
    cell: (h) => `Rs ${formatPrice(h.avgCost)}`,
  },
  {
    id: 'price',
    header: 'Last price',
    numeric: true,
    sortBy: (h) => h.currentPrice,
    cell: (h) => `Rs ${formatPrice(h.currentPrice)}`,
  },
  {
    id: 'value',
    header: 'Value',
    numeric: true,
    mobile: 'value',
    sortBy: (h) => holdingMath(h).value,
    cell: (h) => (
      <span className="font-semibold text-ink">
        Rs {formatPrice(holdingMath(h).value)}
      </span>
    ),
  },
  {
    id: 'return',
    header: 'Return',
    headerHint: 'Unrealised gain or loss against your average cost',
    numeric: true,
    // Sorts by percentage so a big position doesn't outrank a better one.
    sortBy: (h) => holdingMath(h).gainPct,
    cell: (h) => {
      const { gain, gainPct, closed } = holdingMath(h);
      if (closed) return <span className="text-ink-muted">—</span>;
      return (
        <span
          className={cn(
            'inline-flex rounded-md px-2 py-0.5',
            gain > 0 ? 'bg-up-subtle' : gain < 0 ? 'bg-down-subtle' : 'bg-sunken',
          )}
        >
          <Delta value={gain} percent={gainPct} size="sm" variant="pill" />
        </span>
      );
    },
  },
];

/* --------------------------------------------------------------- sections */

interface SectionProps {
  portfolio: UserPortfolio | null;
  watchlist: WatchlistItem[];
  totals: Totals;
  loading: boolean;
  refreshing: boolean;
  removingId: string | null;
  onAddPosition: () => void;
  onAddWatchlist: () => void;
  onShowDetails: (ticker: string) => void;
  onRemoveWatchlist: (item: WatchlistItem) => void;
}

const HoldingsEmpty = ({ onAddPosition }: { onAddPosition: () => void }) => (
  <EmptyState
    icon={<Wallet className="h-6 w-6" aria-hidden="true" />}
    title="No positions yet"
    description="Record what you own and TradeVision marks it to the latest CSE price, so you can see day change and unrealised return in one place."
    action={
      <Button onClick={onAddPosition} leftIcon={<Plus className="h-4 w-4" aria-hidden="true" />}>
        Add your first position
      </Button>
    }
  />
);

const WatchlistEmpty = ({ onAddWatchlist }: { onAddWatchlist: () => void }) => (
  <EmptyState
    icon={<Eye className="h-6 w-6" aria-hidden="true" />}
    title="Your watchlist is empty"
    description="Follow symbols you don't own yet. They show a live price and day change here, and one click opens the analyzer."
    action={
      <Button onClick={onAddWatchlist} leftIcon={<Plus className="h-4 w-4" aria-hidden="true" />}>
        Add a symbol
      </Button>
    }
  />
);

/** Shared watchlist column set; `onRemove` is per-render so it can close over state. */
const watchlistColumns = (
  onRemove: (item: WatchlistItem) => void,
  removingId: string | null,
): Column<WatchlistItem>[] => [
  {
    id: 'ticker',
    header: 'Symbol',
    primary: true,
    mobile: 'title',
    sortBy: (w) => w.ticker,
    cell: (w) => <span className="font-semibold text-ink">{w.ticker}</span>,
  },
  {
    id: 'name',
    header: 'Company',
    mobile: 'subtitle',
    hideBelow: 'lg',
    sortBy: (w) => w.name,
    cell: (w) => (
      <span className="block max-w-56 truncate" title={w.name}>
        {w.name}
      </span>
    ),
  },
  {
    id: 'price',
    header: 'Last price',
    numeric: true,
    mobile: 'value',
    sortBy: (w) => w.currentPrice ?? null,
    cell: (w) =>
      w.currentPrice != null ? (
        <span className="font-semibold text-ink">Rs {formatPrice(w.currentPrice)}</span>
      ) : (
        <span className="text-ink-muted">—</span>
      ),
  },
  {
    id: 'change',
    header: 'Day change',
    numeric: true,
    sortBy: (w) => w.dayChangePct ?? null,
    cell: (w) => (
      <Delta value={w.dayChange} percent={w.dayChangePct} size="sm" variant="pill" />
    ),
  },
  {
    id: 'remove',
    header: 'Remove',
    align: 'right',
    cell: (w) => (
      <Button
        variant="ghost"
        size="sm"
        disabled={!w.id}
        loading={removingId === w.id}
        aria-label={`Remove ${w.ticker} from your watchlist`}
        className="text-ink-muted hover:text-down"
        onClick={(e) => {
          // The row itself opens the analyzer; this button must not do both.
          e.stopPropagation();
          onRemove(w);
        }}
      >
        <Trash className="h-4 w-4" aria-hidden="true" />
      </Button>
    ),
  },
];

const Overview = ({
  portfolio,
  watchlist,
  totals,
  loading,
  refreshing,
  removingId,
  onAddPosition,
  onAddWatchlist,
  onShowDetails,
  onRemoveWatchlist,
}: SectionProps) => {
  usePageTitle('Dashboard');
  const navigate = useNavigate();

  const holdings = portfolio?.holdings ?? [];
  // Biggest positions first — the point of a summary is what moves the total.
  const topHoldings = [...holdings]
    .sort((a, b) => holdingMath(b).value - holdingMath(a).value)
    .slice(0, 5);

  const tiles: {
    label: string;
    value: string;
    delta?: ReactNode;
    hint: string;
  }[] = [
    {
      label: 'Invested',
      value: `Rs ${formatPrice(totals.cost)}`,
      hint: 'Cost of open positions',
    },
    {
      label: 'Unrealised',
      value: `Rs ${formatSigned(totals.gain)}`,
      delta:
        totals.gainPct !== null ? <Delta percent={totals.gainPct} size="sm" /> : undefined,
      hint: 'Against average cost',
    },
    {
      label: 'Open positions',
      value: formatInt(totals.open),
      hint:
        totals.closed > 0 ? `${formatInt(totals.closed)} closed` : 'Symbols you hold',
    },
    {
      label: 'Watching',
      value: formatInt(watchlist.length),
      hint: 'Symbols on your watchlist',
    },
  ];

  return (
    <div className="space-y-6">
      <Card>
        <CardBody>
          {loading ? (
            <div className="space-y-3">
              <Skeleton className="h-3 w-28" />
              <Skeleton className="h-10 w-64 max-w-full" />
              <Skeleton className="h-4 w-48" />
            </div>
          ) : (
            <Stat
              size="hero"
              label="Portfolio value"
              value={
                <span className="text-gradient-brand">
                  Rs {formatPrice(totals.value)}
                </span>
              }
              delta={
                portfolio && (
                  <Delta
                    value={portfolio.dayChange}
                    percent={portfolio.dayChangePercent}
                    size="xl"
                    variant="pill"
                  />
                )
              }
              hint="Marked to the latest traded price on the CSE for every open position."
            />
          )}
        </CardBody>

        {/* A plain div grid, not a <dl>: Stat renders spans, and a <dl> whose
            children aren't dt/dd pairs is invalid markup. */}
        <div className="grid grid-cols-2 gap-x-4 gap-y-5 border-t border-line bg-sunken px-5 py-4 sm:grid-cols-4">
          {loading
            ? Array.from({ length: 4 }, (_, i) => (
                <div key={i}>
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="mt-2.5 h-6 w-24" />
                </div>
              ))
            : tiles.map((tile) => (
                <Stat
                  key={tile.label}
                  size="sm"
                  label={tile.label}
                  value={tile.value}
                  delta={tile.delta}
                  hint={tile.hint}
                />
              ))}
        </div>
      </Card>

      <Card>
        <CardHeader
          title="Top holdings"
          description={
            holdings.length > topHoldings.length
              ? `Your ${topHoldings.length} largest of ${holdings.length} positions, by value.`
              : 'By position value.'
          }
          actions={
            holdings.length > 0 && (
              <NavLink
                to="/dashboard/holdings"
                className={buttonClass({ variant: 'ghost', size: 'sm' })}
              >
                View all
              </NavLink>
            )
          }
        />
        <DataTable
          columns={holdingColumns}
          rows={topHoldings}
          getRowKey={(h) => h.ticker}
          loading={loading}
          refreshing={refreshing}
          skeletonRows={3}
          defaultSort={{ id: 'value', dir: 'desc' }}
          caption="Your largest portfolio positions, with shares, cost, price, value and return"
          onRowSelect={(h) => onShowDetails(h.ticker)}
          rowActionLabel={(h) => `View the transactions behind ${h.ticker}`}
          empty={<HoldingsEmpty onAddPosition={onAddPosition} />}
        />
      </Card>

      <Card>
        <CardHeader
          title="Watchlist"
          description="Symbols you're following but don't own."
          actions={
            watchlist.length > 0 && (
              <NavLink
                to="/dashboard/watchlist"
                className={buttonClass({ variant: 'ghost', size: 'sm' })}
              >
                View all
              </NavLink>
            )
          }
        />
        <DataTable
          columns={watchlistColumns(onRemoveWatchlist, removingId)}
          rows={watchlist.slice(0, 5)}
          getRowKey={(w) => w.id ?? w.ticker}
          loading={loading}
          refreshing={refreshing}
          skeletonRows={3}
          caption="Watchlist symbols with their last price and day change"
          onRowSelect={(w) =>
            navigate(`/analyzer?ticker=${encodeURIComponent(w.ticker)}`)
          }
          rowActionLabel={(w) => `Analyze ${w.ticker}, ${w.name}`}
          empty={<WatchlistEmpty onAddWatchlist={onAddWatchlist} />}
        />
      </Card>
    </div>
  );
};

const HoldingsSection = ({
  portfolio,
  loading,
  refreshing,
  onAddPosition,
  onShowDetails,
}: SectionProps) => {
  usePageTitle('Holdings');
  const holdings = portfolio?.holdings ?? [];

  return (
    <Card>
      <CardHeader
        title="Holdings"
        description={
          holdings.length > 0
            ? 'Select a row to see every trade behind the position.'
            : undefined
        }
        actions={
          <Button
            size="sm"
            className=""
            onClick={onAddPosition}
            leftIcon={<Plus className="h-4 w-4" aria-hidden="true" />}
          >
            Record a trade
          </Button>
        }
      />
      <DataTable
        columns={holdingColumns}
        rows={holdings}
        getRowKey={(h) => h.ticker}
        loading={loading}
        refreshing={refreshing}
        skeletonRows={5}
        defaultSort={{ id: 'value', dir: 'desc' }}
        caption="Every portfolio position, with shares, average cost, last price, value and return"
        onRowSelect={(h) => onShowDetails(h.ticker)}
        rowActionLabel={(h) => `View the transactions behind ${h.ticker}`}
        empty={<HoldingsEmpty onAddPosition={onAddPosition} />}
      />
    </Card>
  );
};

const WatchlistSection = ({
  watchlist,
  loading,
  refreshing,
  removingId,
  onAddWatchlist,
  onRemoveWatchlist,
}: SectionProps) => {
  usePageTitle('Watchlist');
  const navigate = useNavigate();

  return (
    <Card>
      <CardHeader
        title="Watchlist"
        description="Select a row to open the symbol in the analyzer."
        actions={
          <Button
            size="sm"
            onClick={onAddWatchlist}
            leftIcon={<Plus className="h-4 w-4" aria-hidden="true" />}
          >
            Add symbol
          </Button>
        }
      />
      <DataTable
        columns={watchlistColumns(onRemoveWatchlist, removingId)}
        rows={watchlist}
        getRowKey={(w) => w.id ?? w.ticker}
        loading={loading}
        refreshing={refreshing}
        skeletonRows={5}
        caption="Every watchlist symbol with its last price and day change"
        onRowSelect={(w) =>
          navigate(`/analyzer?ticker=${encodeURIComponent(w.ticker)}`)
        }
        rowActionLabel={(w) => `Analyze ${w.ticker}, ${w.name}`}
        empty={<WatchlistEmpty onAddWatchlist={onAddWatchlist} />}
      />
    </Card>
  );
};

/**
 * Alerts.
 *
 * `fetchWatchlist` hardcodes `targetPrice: null` and `alertEnabled: false`, because
 * the backend stores neither — so the old watchlist bell was a toggle-shaped
 * button with no handler and no state behind it. Rather than delete the feature or
 * fake it, this says plainly that it isn't wired up yet and disables the controls.
 */
const AlertsSection = ({ watchlist, loading, refreshing, onAddWatchlist }: SectionProps) => {
  usePageTitle('Alerts');

  const columns: Column<WatchlistItem>[] = [
    {
      id: 'ticker',
      header: 'Symbol',
      primary: true,
      mobile: 'title',
      sortBy: (w) => w.ticker,
      cell: (w) => <span className="font-semibold text-ink">{w.ticker}</span>,
    },
    {
      id: 'name',
      header: 'Company',
      mobile: 'subtitle',
      hideBelow: 'lg',
      cell: (w) => (
        <span className="block max-w-56 truncate" title={w.name}>
          {w.name}
        </span>
      ),
    },
    {
      id: 'price',
      header: 'Last price',
      numeric: true,
      mobile: 'value',
      sortBy: (w) => w.currentPrice ?? null,
      cell: (w) =>
        w.currentPrice != null ? `Rs ${formatPrice(w.currentPrice)}` : '—',
    },
    {
      id: 'target',
      header: 'Target price',
      numeric: true,
      cell: (w) =>
        w.targetPrice != null ? (
          `Rs ${formatPrice(w.targetPrice)}`
        ) : (
          <span className="text-ink-muted">Not set</span>
        ),
    },
    {
      id: 'status',
      header: 'Alert',
      align: 'right',
      cell: () => (
        <Button
          variant="secondary"
          size="sm"
          disabled
          title="Price alerts are not available yet"
        >
          Set alert
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="glass rounded-xl p-5">
        <Notice tone="info" title="Price alerts aren't live yet">
          Your watchlist is saved to your account, but TradeVision has nowhere to
          store an alert threshold and no way to notify you, so the controls below
          are disabled. Until then, the watchlist day change is the fastest way to
          see a move.
        </Notice>
      </div>

      <Card>
        <CardHeader
          title="Watched symbols"
          description="Every symbol an alert could be set on once the feature lands."
        />
        <DataTable
          columns={columns}
          rows={watchlist}
          getRowKey={(w) => w.id ?? w.ticker}
          loading={loading}
          refreshing={refreshing}
          skeletonRows={4}
          caption="Watchlist symbols with their last price and alert status"
          empty={<WatchlistEmpty onAddWatchlist={onAddWatchlist} />}
        />
      </Card>
    </div>
  );
};

/* -------------------------------------------------------------- section nav */

const SectionNav = ({
  counts,
  orientation,
}: {
  counts: Partial<Record<string, number>>;
  orientation: 'vertical' | 'horizontal';
}) => {
  const vertical = orientation === 'vertical';
  return (
    <ul className={cn(vertical ? 'space-y-1' : 'flex items-center gap-1')}>
      {SECTIONS.map(({ to, label, icon: Icon, end }) => (
        <li key={to} className={cn(!vertical && 'shrink-0')}>
          <NavLink
            to={to}
            end={end}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-2.5 rounded-lg text-sm font-medium',
                'transition-colors duration-150 ease-out-quart',
                'focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand',
                vertical ? 'w-full border-l-2 px-3 py-2.5' : 'h-9 px-3 whitespace-nowrap',
                isActive
                  ? cn(
                      'bg-brand-subtle text-brand-subtle-ink',
                      vertical && 'border-l-brand',
                    )
                  : cn(
                      'text-ink-secondary hover:bg-sunken hover:text-ink',
                      vertical && 'border-l-transparent',
                    ),
              )
            }
          >
            <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
            {label}
            {counts[to] !== undefined && (
              <span
                className={cn(
                  'text-xs tabular-nums text-ink-muted',
                  vertical && 'ml-auto',
                )}
              >
                {counts[to]}
              </span>
            )}
          </NavLink>
        </li>
      ))}
    </ul>
  );
};

/* -------------------------------------------------------------------- page */

export const Dashboard = () => {
  const { user, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { portfolio, watchlist, loading, refreshing, error, reload } =
    useDashboardData();

  const [addPositionOpen, setAddPositionOpen] = useState(false);
  const [addWatchlistOpen, setAddWatchlistOpen] = useState(false);
  const [detailsTicker, setDetailsTicker] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const name = displayName(user?.user_metadata, user?.email);
  const totals = totalsOf(portfolio);

  // Derived, not stored: after a delete the reloaded portfolio flows straight
  // into the open dialog, and if the holding is gone the dialog closes itself.
  const detailsHolding =
    portfolio?.holdings.find((h) => h.ticker === detailsTicker) ?? null;

  const restoreWatchlist = async (item: WatchlistItem) => {
    try {
      await addToWatchlist(item.ticker);
      reload();
      toast.success(`${item.ticker} restored to your watchlist`);
    } catch (err) {
      toast.error(`Could not restore ${item.ticker}`, {
        description: err instanceof Error ? err.message : undefined,
      });
    }
  };

  const removeWatchlist = async (item: WatchlistItem) => {
    if (!item.id) return;
    setRemovingId(item.id);
    try {
      await removeFromWatchlist(item.id);
      reload();
      toast.success(`${item.ticker} removed from your watchlist`, {
        action: { label: 'Undo', onClick: () => void restoreWatchlist(item) },
      });
    } catch (err) {
      // Was `console.error(err)` and nothing else — the row simply stayed put
      // with no indication that anything had failed.
      toast.error(`Could not remove ${item.ticker}`, {
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setRemovingId(null);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/', { replace: true });
    toast.success('Signed out');
  };

  const sectionProps: SectionProps = {
    portfolio,
    watchlist,
    totals,
    loading,
    refreshing,
    removingId,
    onAddPosition: () => setAddPositionOpen(true),
    onAddWatchlist: () => setAddWatchlistOpen(true),
    onShowDetails: setDetailsTicker,
    onRemoveWatchlist: (item) => void removeWatchlist(item),
  };

  const counts: Partial<Record<string, number>> = {
    '/dashboard/holdings': portfolio?.holdings.length,
    '/dashboard/watchlist': watchlist.length,
  };

  return (
    <PageShell>
      <PageHeader
        eyebrow={
          <>
            <ChartLine className="h-3.5 w-3.5" aria-hidden="true" />
            Your account
          </>
        }
        title={`Welcome back, ${name}`}
        description="Your positions, marked to the latest prices the CSE has published."
        actions={
          <>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => void reload()}
              loading={refreshing}
              loadingText="Refreshing…"
              leftIcon={<ArrowsClockwise className="h-4 w-4" aria-hidden="true" />}
            >
              Refresh
            </Button>
            <Button
              size="sm"
              onClick={() => setAddPositionOpen(true)}
              leftIcon={<Plus className="h-4 w-4" aria-hidden="true" />}
            >
              Record a trade
            </Button>
          </>
        }
      />

      {/* A failed reload keeps whatever loaded last on screen; only a cold
          failure replaces the page. */}
      {error && portfolio && (
        <Notice
          tone="warn"
          title="Showing the last successful load"
          className="mt-6"
          action={
            <Button variant="secondary" size="sm" onClick={() => void reload()}>
              Retry
            </Button>
          }
        >
          {error}
        </Notice>
      )}

      <div className="mt-8 lg:grid lg:grid-cols-[14rem_minmax(0,1fr)] lg:gap-8">
        {/* Desktop sidebar. `hidden` removes it from the accessibility tree, so
            the duplicate nav below is not announced twice. */}
        <aside className="hidden lg:block">
          <div className="sticky top-24 space-y-4 rounded-xl bg-linear-to-b from-card to-sunken p-4">
            <div className="flex items-center gap-3">
              <span
                aria-hidden="true"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full
                           bg-linear-to-br from-brand to-brand-hover text-sm font-semibold text-on-brand
                           ring-2 ring-brand/40 ring-offset-2 ring-offset-page"
              >
                {initialsOf(name)}
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-ink">{name}</p>
                {user?.email && (
                  <p className="truncate text-xs text-ink-muted">{user.email}</p>
                )}
              </div>
            </div>

            <nav aria-label="Dashboard sections">
              <SectionNav counts={counts} orientation="vertical" />
            </nav>

            <div className="border-t border-line pt-4">
              <Button
                variant="ghost"
                fullWidth
                onClick={() => void handleSignOut()}
                leftIcon={<SignOut className="h-4 w-4" aria-hidden="true" />}
                className="hover:text-down"
              >
                Sign out
              </Button>
            </div>
          </div>
        </aside>

        {/* Mobile section switcher. Scrolls horizontally rather than wrapping,
            so the content start position doesn't shift between sections. */}
        <nav
          aria-label="Dashboard sections"
          className="-mx-4 mb-6 overflow-x-auto px-4 pb-1 lg:hidden"
        >
          <SectionNav counts={counts} orientation="horizontal" />
        </nav>

        <div className="min-w-0">
          {error && !portfolio ? (
            <Card>
              <EmptyState
                icon={<Warning className="h-6 w-6" aria-hidden="true" />}
                title="Couldn't load your portfolio"
                description={error}
                action={
                  <Button
                    onClick={() => void reload()}
                    leftIcon={<ArrowsClockwise className="h-4 w-4" aria-hidden="true" />}
                  >
                    Try again
                  </Button>
                }
              />
            </Card>
          ) : (
            /* Keyed by the section path so each tab swap replays a soft fade —
               without remounting the page shell, sidebar or data above it. */
            <div key={location.pathname} className="animate-fade-in">
              <Routes>
                <Route index element={<Overview {...sectionProps} />} />
                <Route path="holdings" element={<HoldingsSection {...sectionProps} />} />
                <Route path="watchlist" element={<WatchlistSection {...sectionProps} />} />
                <Route path="alerts" element={<AlertsSection {...sectionProps} />} />
                {/* `/dashboard/anything-else` belongs here, not on the 404 page. */}
                <Route path="*" element={<Navigate to="/dashboard" replace />} />
              </Routes>
            </div>
          )}
        </div>
      </div>

      <AddPositionModal
        open={addPositionOpen}
        onOpenChange={setAddPositionOpen}
        holdings={portfolio?.holdings ?? []}
        onSaved={reload}
      />
      <AddWatchlistModal
        open={addWatchlistOpen}
        onOpenChange={setAddWatchlistOpen}
        existing={watchlist.map((w) => w.ticker)}
        onSaved={reload}
      />
      <HoldingDetailsModal
        open={detailsTicker !== null}
        onOpenChange={(open) => {
          if (!open) setDetailsTicker(null);
        }}
        holding={detailsHolding}
        onChanged={reload}
      />
    </PageShell>
  );
};
