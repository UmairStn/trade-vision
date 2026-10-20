import { ArrowDown, ArrowUp, Minus } from '@phosphor-icons/react';
import { cn } from '../../lib/cn';
import { formatSigned, formatSignedPercent } from '../../lib/format';

/**
 * The only component allowed to render a price change.
 *
 * Why it's centralised: the up/down pair measures a CVD separation of ΔE 7.4
 * (deuteranopia, OKLab ×100). That sits in the 6–8 band, which is permissible
 * *only* with a secondary encoding — and red/green is a market convention we
 * can't re-hue our way out of. So direction is never carried by colour alone
 * here: every Delta emits an arrow glyph **and** an explicit +/− sign alongside
 * the value. In a greyscale screenshot the direction is still readable.
 *
 * Scattering `text-up`/`text-down` inline across pages is what lets that
 * guarantee rot, so pages import this instead.
 */

export type DeltaSize = 'sm' | 'md' | 'lg' | 'xl';

interface DeltaProps {
  /** Absolute change, e.g. `-1.25`. Omit to show percent only. */
  value?: number | null;
  /** Percentage change, e.g. `-2.4`. Omit to show the absolute only. */
  percent?: number | null;
  size?: DeltaSize;
  /** Render as a filled pill. Used in tables and beside hero figures. */
  variant?: 'text' | 'pill';
  /** Hide the arrow. Only legal where an adjacent Delta already shows one. */
  hideIcon?: boolean;
  className?: string;
}

const sizeText: Record<DeltaSize, string> = {
  sm: 'text-xs',
  md: 'text-sm',
  lg: 'text-body',
  xl: 'text-h3',
};

const sizeIcon: Record<DeltaSize, string> = {
  sm: 'h-3 w-3',
  md: 'h-3.5 w-3.5',
  lg: 'h-4 w-4',
  xl: 'h-5 w-5',
};

const sizePill: Record<DeltaSize, string> = {
  sm: 'gap-1 px-1.5 py-0.5',
  md: 'gap-1 px-2 py-0.5',
  lg: 'gap-1.5 px-2.5 py-1',
  xl: 'gap-1.5 px-3 py-1.5',
};

/** Positive / negative / flat, from whichever number was supplied. */
const directionOf = (value?: number | null, percent?: number | null) => {
  // Prefer the absolute change; fall back to the percentage. Both can legitimately
  // be absent (a symbol with no previous close), which is distinct from zero.
  const primary = [value, percent].find(
    (n): n is number => typeof n === 'number' && Number.isFinite(n),
  );
  if (primary === undefined) return 'unknown' as const;
  if (primary > 0) return 'up' as const;
  if (primary < 0) return 'down' as const;
  return 'flat' as const;
};

export const Delta = ({
  value,
  percent,
  size = 'md',
  variant = 'text',
  hideIcon = false,
  className,
}: DeltaProps) => {
  const direction = directionOf(value, percent);

  const tone =
    direction === 'up'
      ? 'text-up'
      : direction === 'down'
        ? 'text-down'
        : 'text-ink-muted';

  const pillTone =
    direction === 'up'
      ? 'bg-up-subtle text-up'
      : direction === 'down'
        ? 'bg-down-subtle text-down'
        : 'bg-sunken text-ink-muted';

  const Icon = direction === 'up' ? ArrowUp : direction === 'down' ? ArrowDown : Minus;

  const hasValue = value !== null && value !== undefined && Number.isFinite(value);
  const hasPercent =
    percent !== null && percent !== undefined && Number.isFinite(percent);

  if (direction === 'unknown') {
    return (
      <span className={cn('text-ink-muted tabular-nums', sizeText[size], className)}>
        —
      </span>
    );
  }

  // Screen readers get words, not glyphs: "+2.40%" reads as "plus two point
  // four zero percent" without this, and the arrow is decorative to them.
  const spokenDirection =
    direction === 'up' ? 'up' : direction === 'down' ? 'down' : 'unchanged';
  const spoken = [
    spokenDirection,
    hasValue ? `${Math.abs(value).toFixed(2)} rupees` : null,
    hasPercent ? `${Math.abs(percent).toFixed(2)} percent` : null,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <span
      className={cn(
        'inline-flex items-center font-medium tabular-nums whitespace-nowrap',
        variant === 'pill'
          ? cn('rounded-sm', sizePill[size], pillTone)
          : cn('gap-1', tone),
        sizeText[size],
        className,
      )}
    >
      {!hideIcon && <Icon className={cn(sizeIcon[size], 'shrink-0')} aria-hidden="true" />}
      <span className="sr-only">{spoken}</span>
      <span aria-hidden="true">
        {hasValue && formatSigned(value)}
        {hasValue && hasPercent && ' '}
        {hasPercent && (hasValue ? `(${formatSignedPercent(percent)})` : formatSignedPercent(percent))}
      </span>
    </span>
  );
};
