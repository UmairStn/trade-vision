import { useRef } from 'react';
import type { ReactNode } from 'react';
import { cn } from '../../lib/cn';

/**
 * Pick one of N.
 *
 * Modelled as a `radiogroup` with roving tabindex, not as tabs: most uses here
 * (gainers/losers/most-active, chart range) aren't tab panels, and a
 * `role="tab"` whose `aria-controls` points at nothing is worse than no ARIA.
 * Arrow keys move and select; Tab enters and leaves the group once.
 */

export interface SegmentOption<T extends string> {
  value: T;
  label: string;
  icon?: ReactNode;
  /** Trailing count, e.g. the number of rows behind this filter. */
  badge?: ReactNode;
  /** Optional filled colour for the selected state, e.g. market up/down. */
  tone?: 'brand' | 'up' | 'down';
}

export const SegmentedControl = <T extends string>({
  options,
  value,
  onChange,
  label,
  size = 'md',
  fullWidth = false,
  className,
}: {
  options: SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  /** Accessible group name, e.g. "Filter movers". */
  label: string;
  size?: 'sm' | 'md';
  fullWidth?: boolean;
  className?: string;
}) => {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  const move = (from: number, delta: number) => {
    const next = (from + delta + options.length) % options.length;
    onChange(options[next].value);
    refs.current[next]?.focus();
  };

  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cn(
        'inline-flex max-w-full items-center gap-1 overflow-x-auto rounded-xl border border-line bg-sunken p-1 no-scrollbar',
        fullWidth && 'w-full',
        className,
      )}
    >
      {options.map((option, index) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            ref={(el) => {
              refs.current[index] = el;
            }}
            type="button"
            role="radio"
            aria-checked={selected}
            // Roving tabindex: only the selected option is a tab stop.
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(option.value)}
            onKeyDown={(e) => {
              if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
                e.preventDefault();
                move(index, 1);
              } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
                e.preventDefault();
                move(index, -1);
              }
            }}
            className={cn(
              'inline-flex flex-1 shrink-0 items-center justify-center gap-1.5 rounded-full font-medium whitespace-nowrap',
              'transition-[background-color,color,box-shadow] duration-150 ease-out-quart',
              'focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand',
              size === 'sm' ? 'h-7 px-2.5 text-xs' : 'h-8 px-3 text-sm',
              selected
                ? {
                    brand: 'bg-brand text-on-brand',
                    up: 'bg-up-subtle text-up',
                    down: 'bg-down-subtle text-down',
                  }[option.tone ?? 'brand']
                : 'text-ink-muted hover:text-ink',
            )}
          >
            {option.icon}
            {option.label}
            {option.badge !== undefined && (
              <span
                className={cn(
                  'tabular-nums',
                  selected && !option.tone ? 'text-on-brand/70' : 'text-ink-muted/70',
                )}
              >
                {option.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};
