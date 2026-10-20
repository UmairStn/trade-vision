import { cn } from '../../lib/cn';

/**
 * A single ratio against a limit — one hue, filled proportionally.
 *
 * Replaces the confidence bar that switched green/amber/red on thresholds. That
 * was a status palette doing a magnitude job: it implied a good/bad verdict the
 * model never made, and the three-way switch made 74% and 76% look categorically
 * different. One hue, and the number beside it.
 */
export const Meter = ({
  value,
  max = 100,
  label,
  valueLabel,
  hint,
  size = 'md',
  className,
}: {
  value: number;
  max?: number;
  /** Visible label. Also used as the accessible name. */
  label: string;
  /** Overrides the rendered value text, e.g. `"68%"`. */
  valueLabel?: string;
  hint?: string;
  size?: 'sm' | 'md';
  className?: string;
}) => {
  const safeMax = max > 0 ? max : 100;
  const clamped = Math.min(Math.max(Number.isFinite(value) ? value : 0, 0), safeMax);
  const pct = (clamped / safeMax) * 100;
  const text = valueLabel ?? `${Math.round(pct)}%`;

  return (
    <div className={cn('w-full', className)}>
      <div className="mb-1.5 flex items-baseline justify-between gap-3">
        <span className="text-sm text-ink-secondary">{label}</span>
        <span className="text-body font-semibold text-ink tabular-nums">{text}</span>
      </div>
      <div
        role="meter"
        aria-label={label}
        aria-valuenow={Number(clamped.toFixed(2))}
        aria-valuemin={0}
        aria-valuemax={safeMax}
        aria-valuetext={text}
        className={cn(
          'w-full overflow-hidden rounded-full bg-sunken',
          size === 'sm' ? 'h-1.5' : 'h-2',
        )}
      >
        <div
          className="h-full rounded-full bg-brand transition-[width] duration-700 ease-out-quart"
          style={{ width: `${pct}%` }}
        />
      </div>
      {hint && <p className="mt-1.5 text-xs text-ink-muted">{hint}</p>}
    </div>
  );
};
