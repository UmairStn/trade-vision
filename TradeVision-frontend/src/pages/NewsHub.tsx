import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Newspaper,
  ArrowsClockwise,
  MagnifyingGlass,
  FilePdf,
  ArrowSquareOut,
  TrendUp,
  TrendDown,
  ShieldCheck,
  Funnel,
} from '@phosphor-icons/react';
import { usePageTitle } from '../hooks/usePageTitle';
import { fetchNewsFeed, type NewsItem, type MarketMood } from '../services/api';
import {
  Badge,
  Button,
  EmptyState,
  Notice,
  PageHeader,
  PageShell,
  SegmentedControl,
  Skeleton,
} from '../components/ui';
import { cn } from '../lib/cn';

const CATEGORIES = [
  { id: 'all', label: 'All Disclosures' },
  { id: 'financial', label: 'Financial Reports' },
  { id: 'dividend', label: 'Dividends & Actions' },
  { id: 'director', label: 'Board & Management' },
  { id: 'compliance', label: 'Regulatory Notices' },
];

export const NewsHub = () => {
  usePageTitle('News & Signals Hub');
  const navigate = useNavigate();

  const [feed, setFeed] = useState<NewsItem[]>([]);
  const [mood, setMood] = useState<MarketMood | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedSentiment, setSelectedSentiment] = useState<'all' | 'bullish' | 'neutral' | 'bearish'>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const loadFeed = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchNewsFeed();
      setFeed(res.feed || []);
      setMood(res.mood || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load news feed');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadFeed();
  }, []);

  const filteredFeed = useMemo(() => {
    return feed.filter((item) => {
      // Sentiment filter
      const itemLabel = (item.sentiment_label || item.label || 'Neutral').toLowerCase();
      if (selectedSentiment !== 'all' && itemLabel !== selectedSentiment) {
        return false;
      }
      // Category filter
      if (selectedCategory === 'financial' && !item.category.toLowerCase().includes('financial') && !item.category.toLowerCase().includes('report')) {
        return false;
      }
      if (selectedCategory === 'dividend' && !item.category.toLowerCase().includes('dividend') && !item.category.toLowerCase().includes('corporate')) {
        return false;
      }
      if (selectedCategory === 'director' && !item.category.toLowerCase().includes('director') && !item.category.toLowerCase().includes('appointment')) {
        return false;
      }
      if (selectedCategory === 'compliance' && !item.category.toLowerCase().includes('compliance') && !item.category.toLowerCase().includes('notice')) {
        return false;
      }
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const comp = (item.company || '').toLowerCase();
        const sym = (item.symbol || '').toLowerCase();
        const cat = (item.category || '').toLowerCase();
        if (!comp.includes(q) && !sym.includes(q) && !cat.includes(q)) {
          return false;
        }
      }
      return true;
    });
  }, [feed, selectedSentiment, selectedCategory, searchQuery]);

  return (
    <PageShell>
      <PageHeader
        title="News & Signals Hub"
        description="Official Colombo Stock Exchange disclosures and regulatory filings — scored with FinBERT financial sentiment."
        actions={
          <Button
            size="sm"
            variant="secondary"
            onClick={() => void loadFeed()}
            loading={loading}
            leftIcon={<ArrowsClockwise className="h-4 w-4" />}
          >
            Refresh Feed
          </Button>
        }
      />

      {/* --- Market Mood Banner ------------------------------------------------ */}
      {mood && (
        <div className="mb-10 rounded-2xl border border-line bg-surface/70 p-6 shadow-sm backdrop-blur">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-4">
              <div
                className={cn(
                  'flex h-12 w-12 shrink-0 items-center justify-center rounded-xl',
                  mood.label === 'Bullish'
                    ? 'bg-emerald-500/10 text-emerald-500 ring-1 ring-emerald-500/20'
                    : mood.label === 'Bearish'
                    ? 'bg-rose-500/10 text-rose-500 ring-1 ring-rose-500/20'
                    : 'bg-slate-500/10 text-slate-500 ring-1 ring-slate-500/20'
                )}
              >
                {mood.label === 'Bullish' ? (
                  <TrendUp className="h-6 w-6" />
                ) : mood.label === 'Bearish' ? (
                  <TrendDown className="h-6 w-6" />
                ) : (
                  <ShieldCheck className="h-6 w-6" />
                )}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-semibold text-ink">
                    Overall Market Mood:{' '}
                    <span
                      className={cn(
                        mood.label === 'Bullish'
                          ? 'text-emerald-500'
                          : mood.label === 'Bearish'
                          ? 'text-rose-500'
                          : 'text-ink'
                      )}
                    >
                      {mood.label}
                    </span>
                  </h3>
                  <Badge tone="neutral" size="sm">
                    FinBERT Score: {mood.score > 0 ? `+${mood.score}` : mood.score}
                  </Badge>
                </div>
                <p className="mt-1 text-sm text-ink-muted">
                  Aggregated from {mood.total_analyzed} active official announcements on the Colombo Stock Exchange.
                </p>
              </div>
            </div>

            {/* Visual Mood Distribution Bar */}
            <div className="w-full lg:max-w-md">
              <div className="flex justify-between text-xs font-medium text-ink-muted mb-2">
                <span className="text-emerald-500 flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  {mood.bullish_count} Bullish ({mood.bullish_pct}%)
                </span>
                <span className="text-slate-400 flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-slate-400" />
                  {mood.neutral_count} Neutral
                </span>
                <span className="text-rose-500 flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-rose-500" />
                  {mood.bearish_count} Bearish
                </span>
              </div>
              <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-surface-muted ring-1 ring-line">
                <div
                  className="bg-emerald-500 transition-all duration-500"
                  style={{ width: `${(mood.bullish_count / Math.max(mood.total_analyzed, 1)) * 100}%` }}
                />
                <div
                  className="bg-slate-400/60 transition-all duration-500"
                  style={{ width: `${(mood.neutral_count / Math.max(mood.total_analyzed, 1)) * 100}%` }}
                />
                <div
                  className="bg-rose-500 transition-all duration-500"
                  style={{ width: `${(mood.bearish_count / Math.max(mood.total_analyzed, 1)) * 100}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- Filter Controls --------------------------------------------------- */}
      <div className="mb-8 space-y-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <SegmentedControl
            label="Filter announcements by sentiment"
            value={selectedSentiment}
            onChange={(val) => setSelectedSentiment(val as typeof selectedSentiment)}
            options={[
              { value: 'all', label: 'All Sentiments' },
              { value: 'bullish', label: 'Bullish Signals' },
              { value: 'neutral', label: 'Neutral' },
              { value: 'bearish', label: 'Bearish / Caution' },
            ]}
          />

          <div className="relative w-full sm:w-72">
            <MagnifyingGlass className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search ticker or company…"
              className="h-10 w-full rounded-lg border border-line bg-surface pl-9 pr-4 text-sm text-ink placeholder-ink-muted transition-colors focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
            />
          </div>
        </div>

        {/* Category Filter Pills */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <span className="flex items-center gap-1.5 text-xs font-mono uppercase tracking-wider text-ink-muted mr-1">
            <Funnel className="h-3.5 w-3.5" />
            Category:
          </span>
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={cn(
                'rounded-full px-3 py-1 text-xs font-medium transition-all',
                selectedCategory === cat.id
                  ? 'bg-ink text-surface shadow-xs'
                  : 'bg-surface-muted/60 text-ink-muted hover:bg-surface-muted hover:text-ink border border-line/60'
              )}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* --- Feed List --------------------------------------------------------- */}
      {error && (
        <Notice tone="error" title="Could not load announcement feed" className="mb-8">
          {error}
        </Notice>
      )}

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="rounded-xl border border-line bg-surface/50 p-5 space-y-3">
              <div className="flex justify-between">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-4 w-16" />
              </div>
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-8 w-full mt-4" />
            </div>
          ))}
        </div>
      ) : filteredFeed.length === 0 ? (
        <EmptyState
          icon={<Newspaper className="h-8 w-8 text-ink-muted" />}
          title="No disclosures found"
          description="Try adjusting your sentiment or category filter criteria."
          action={
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                setSelectedSentiment('all');
                setSelectedCategory('all');
                setSearchQuery('');
              }}
            >
              Reset Filters
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredFeed.map((item) => {
            const labelText = item.sentiment_label || item.label || 'Neutral';
            const isBullish = labelText === 'Bullish';
            const isBearish = labelText === 'Bearish';

            return (
              <div
                key={item.id}
                className="group relative flex flex-col justify-between rounded-xl border border-line bg-surface/60 p-5 transition-all duration-200 hover:border-brand/40 hover:bg-surface hover:shadow-md"
              >
                <div>
                  {/* Category & Sentiment Badges */}
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-[11px] font-medium uppercase tracking-wider text-ink-muted truncate">
                      {item.category}
                    </span>
                    <Badge
                      tone={isBullish ? 'up' : isBearish ? 'down' : 'neutral'}
                      size="sm"
                      icon={isBullish ? <TrendUp className="h-3 w-3" /> : isBearish ? <TrendDown className="h-3 w-3" /> : undefined}
                    >
                      {labelText}
                    </Badge>
                  </div>

                  {/* Company Name & Symbol */}
                  <div className="mt-3">
                    <h4 className="text-base font-semibold tracking-tight text-ink group-hover:text-brand transition-colors line-clamp-2">
                      {item.company}
                    </h4>
                    {item.type && (
                      <p className="mt-1 text-xs text-ink-muted line-clamp-1">
                        {item.type}
                      </p>
                    )}
                  </div>
                </div>

                {/* Footer metadata & actions */}
                <div className="mt-5 border-t border-line/50 pt-3">
                  <div className="flex items-center justify-between text-xs text-ink-muted">
                    <span>{item.date || 'Recent CSE Filing'}</span>
                    <span className="font-mono text-[10px] text-ink-muted/80">
                      Score: {item.sentiment_score > 0 ? `+${item.sentiment_score.toFixed(2)}` : item.sentiment_score.toFixed(2)}
                    </span>
                  </div>

                  <div className="mt-3 flex items-center gap-2">
                    {item.symbol && (
                      <Button
                        size="sm"
                        variant="subtle"
                        onClick={() => navigate(`/analyzer?ticker=${encodeURIComponent(item.symbol!)}`)}
                      >
                        Analyze {item.symbol}
                      </Button>
                    )}

                    {item.pdf_url && (
                      <a
                        href={item.pdf_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium text-brand hover:bg-brand/10 transition-colors ml-auto"
                      >
                        <FilePdf className="h-3.5 w-3.5" />
                        PDF Report
                        <ArrowSquareOut className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </PageShell>
  );
};
