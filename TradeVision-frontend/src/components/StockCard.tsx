import { Link } from 'react-router-dom';
import type { StockQuote } from '../types/stock';
import { Delta } from './ui/Delta';
import { formatPrice } from '../lib/format';
import { cn } from '../lib/cn';

/**
 * One quote as a compact row.
 *
 * Was a tall card with its own inline `text-accent-green`/`accent-red` change
 * text and a direction icon in a tinted tile — three separate colour-only
 * signals for the same fact. The change now goes through `Delta`, which is the
 * only component allowed to render one, so the arrow-plus-sign guarantee holds
 * here too.
 *
 * It also used `onClick` on a `<div>`: not focusable, not keyboard-operable, and
 * invisible to assistive tech. This renders a real `<a>` or `<button>`.
 */

interface StockCardProps {
  quote: StockQuote;
  /** 1-based position in a ranked list. Rendered as a muted numeral. */
  rank?: number;
  /** Navigates. Takes precedence over `onClick`. */
  to?: string;
  onClick?: () => void;
  selected?: boolean;
  className?: string;
}

export const StockCard = ({
  quote,
  rank,
  to,
  onClick,
  selected = false,
  className,
}: StockCardProps) => {
  const body = (
    <>
      {rank !== undefined && (
        <span
          aria-hidden="true"
          className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-sunken text-xs font-medium text-ink-muted tabular-nums"
        >
          {rank}
        </span>
      )}

      <span
        aria-hidden="true"
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface border border-line/80 font-mono text-[11px] font-bold text-ink-secondary"
      >
        {quote.ticker.split('.')[0].slice(0, 3)}
      </span>

      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-ink">
          {quote.ticker}
        </span>
        <span className="block truncate text-xs text-ink-muted">{quote.name}</span>
      </span>

      <span className="shrink-0 text-right">
        <span className="block text-sm font-semibold text-ink tabular-nums">
          Rs {formatPrice(quote.price)}
        </span>
        <Delta
          value={quote.change}
          percent={quote.changePercent}
          size="sm"
          className="justify-end"
        />
      </span>
    </>
  );

  const classes = cn(
    'flex w-full items-center gap-3 rounded-md border border-l-2 px-3 py-2.5 text-left',
    'transition-[background-color,border-color,transform] duration-150 ease-out-quart',
    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand',
    selected
      ? 'border-brand border-l-brand bg-brand-subtle'
      : 'border-line border-l-transparent bg-card hover:border-line-strong hover:border-l-brand hover:bg-sunken',
    className,
  );

  if (to) {
    return (
      <Link to={to} className={classes} aria-current={selected ? 'true' : undefined}>
        {body}
      </Link>
    );
  }

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={classes} aria-pressed={selected}>
        {body}
      </button>
    );
  }

  return <div className={classes}>{body}</div>;
};
