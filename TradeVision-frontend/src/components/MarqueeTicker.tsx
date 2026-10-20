import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Pause, Play } from '@phosphor-icons/react';
import type { StockQuote } from '../types/stock';
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion';
import { formatPrice } from '../lib/format';
import { Delta } from './ui/Delta';
import { cn } from '../lib/cn';

/**
 * Scrolling price tape.
 *
 * Three fixes over the previous version:
 *
 *   - It injected a `<style>` element from render (one per mount, appended to the
 *     document) and applied a `hover:pause` class that does not exist in Tailwind.
 *     The keyframes now live in `index.css`, and hover-pause is a real arbitrary
 *     property.
 *   - Auto-scrolling content that lasts more than five seconds needs a pause
 *     mechanism (WCAG 2.2.2), and hover is not one — it is unreachable by
 *     keyboard and by touch. There is now an actual button.
 *   - `prefers-reduced-motion` stopped nothing here. Under that preference the
 *     tape becomes a plain horizontal scroller with no duplicated half.
 */

const Row = ({ items, duplicate }: { items: StockQuote[]; duplicate?: boolean }) => (
  <ul
    // The second copy exists only so `translateX(-50%)` can loop seamlessly. It
    // would otherwise read every symbol twice to a screen reader.
    aria-hidden={duplicate || undefined}
    className="flex shrink-0 items-center"
  >
    {items.map((quote) => (
      <li key={quote.ticker} className="border-r border-brand/10 last:border-r-0">
        <Link
          to={`/analyzer?ticker=${encodeURIComponent(quote.ticker)}`}
          tabIndex={duplicate ? -1 : undefined}
          className="flex items-center gap-2.5 px-6 py-1.5 whitespace-nowrap
                     transition-colors duration-150 hover:bg-brand/8
                     focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand"
        >
          <span className="text-sm font-semibold text-ink">{quote.ticker}</span>
          <span className="text-sm text-ink-secondary tabular-nums">
            {formatPrice(quote.price)}
          </span>
          <Delta percent={quote.changePercent} size="sm" />
        </Link>
      </li>
    ))}
  </ul>
);

export const MarqueeTicker = ({ items }: { items: StockQuote[] }) => {
  const reducedMotion = usePrefersReducedMotion();
  const [paused, setPaused] = useState(false);

  if (!items || items.length === 0) return null;

  const animated = !reducedMotion;

  return (
    <div className="flex w-full items-stretch border-y border-brand/10 bg-linear-to-r from-card via-sunken to-card">
      {/* The unit is stated once here rather than repeated on every symbol, so
          the tape stays scannable without dropping the currency entirely. */}
      <span className="flex shrink-0 items-center rounded-sm border border-brand/20 bg-brand-subtle px-3 text-xs font-semibold tracking-wide text-brand-subtle-ink uppercase">
        LKR
      </span>

      <div
        className={cn(
          'min-w-0 flex-1',
          animated ? 'overflow-hidden mask-fade-x' : 'overflow-x-auto no-scrollbar',
        )}
      >
        <div
          // `data-marquee` is what the reduced-motion block in index.css targets;
          // it also has to reset the transform, or the tape freezes mid-slide.
          data-marquee={animated ? '' : undefined}
          style={paused ? { animationPlayState: 'paused' } : undefined}
          className={cn(
            'flex w-max',
            animated &&
              'animate-marquee hover:[animation-play-state:paused] focus-within:[animation-play-state:paused]',
          )}
        >
          <Row items={items} />
          {animated && <Row items={items} duplicate />}
        </div>
      </div>

      {animated && (
        <button
          type="button"
          onClick={() => setPaused((p) => !p)}
          aria-pressed={paused}
          className="flex shrink-0 items-center gap-1.5 border-l border-line px-3 text-xs
                     font-medium text-ink-muted transition-colors duration-150
                     hover:bg-card hover:text-ink
                     focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand"
        >
          {paused ? (
            <Play className="h-3 w-3" aria-hidden="true" />
          ) : (
            <Pause className="h-3 w-3" aria-hidden="true" />
          )}
          <span className="sr-only sm:not-sr-only">
            {paused ? 'Play ticker' : 'Pause ticker'}
          </span>
        </button>
      )}
    </div>
  );
};
