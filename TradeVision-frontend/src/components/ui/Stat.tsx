import type { ReactNode } from 'react';
import { cn } from '../../lib/cn';

/**
 * A headline number with its label and optional delta.
 *
 * Values use the default *proportional* figures, not `tabular-nums` — equal-width
 * digits make `121` look loose at display sizes. Tabular figures are for columns
 * that must align vertically, which is `DataTable`'s job, not this one.
 */
export const Stat = ({
  label,
  value,
  delta,
  hint,
  icon,
  sparkline,
  size = 'md',
  align = 'left',
  className,
}: {
  label: ReactNode;
  value: ReactNode;
  /** Pass a `<Delta />`. */
  delta?: ReactNode;
  hint?: ReactNode;
  icon?: ReactNode;
  /** Pass a `<Sparkline />`; sits under the value. */
  sparkline?: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'hero';
  align?: 'left' | 'right';
  className?: string;
}) => {
  const valueSize = {
    sm: 'text-h3',
    md: 'text-h2',
    lg: 'text-h1',
    xl: 'text-h1 sm:text-display',
    hero: 'text-h1 sm:text-display',
  }[size];

  return (
    <div className={cn('min-w-0', align === 'right' && 'text-right', className)}>
      <div
        className={cn(
          'flex items-center gap-2',
          align === 'right' && 'justify-end',
        )}
      >
        {icon && <span className="shrink-0 text-ink-muted">{icon}</span>}
        <span className="truncate text-xs font-medium tracking-wide text-ink-muted uppercase">
          {label}
        </span>
      </div>

      <div
        className={cn(
          'mt-1.5 flex flex-wrap items-baseline gap-x-2.5 gap-y-1',
          align === 'right' && 'justify-end',
        )}
      >
        <span className={cn(valueSize, 'font-semibold text-ink')}>{value}</span>
        {delta}
      </div>

      {sparkline && <div className="mt-2">{sparkline}</div>}
      {hint && <p className="mt-1 text-sm text-ink-muted">{hint}</p>}
    </div>
  );
};
