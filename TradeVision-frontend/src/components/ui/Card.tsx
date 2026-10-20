import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '../../lib/cn';

/**
 * One card look for the whole app. Radius is fixed at `lg` (14px) — pages used
 * to mix `rounded-md`, `lg`, `xl` and `2xl` inside a single card.
 *
 * In dark mode `elevated` swaps the drop shadow for a 1px top inner highlight,
 * because a shadow against a #141821 surface is invisible.
 */

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /** `flat` for cards nested inside another card; `glass` for the frosted look. */
  variant?: 'raised' | 'flat' | 'sunken' | 'glass';
  /** Lifts on hover. Only for cards that are themselves a link or button. */
  interactive?: boolean;
}

export const Card = ({
  variant = 'raised',
  interactive = false,
  className,
  children,
  ...rest
}: CardProps) => (
  <div
    className={cn(
      'rounded-xl border border-line',
      variant === 'raised' && 'bg-card elevated',
      variant === 'flat' && 'bg-card',
      variant === 'sunken' && 'bg-sunken',
      variant === 'glass' && 'glass elevated',
      interactive &&
        'transition-[transform,box-shadow,border-color] duration-250 ease-out-quart ' +
          'hover:-translate-y-0.5 hover:elevated-pop hover:border-line-strong',
      className,
    )}
    {...rest}
  >
    {children}
  </div>
);

/** Title row. `actions` sits hard right and stays on one line. */
export const CardHeader = ({
  title,
  description,
  actions,
  icon,
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  icon?: ReactNode;
  className?: string;
}) => (
  <div
    className={cn(
      'flex flex-wrap items-start justify-between gap-3 border-b border-line px-5 py-4',
      className,
    )}
  >
    <div className="flex min-w-0 items-start gap-3">
      {icon && (
        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-sm bg-brand-subtle text-brand-subtle-ink">
          {icon}
        </span>
      )}
      <div className="min-w-0">
        <h2 className="text-h3 text-ink">{title}</h2>
        {description && (
          <p className="mt-0.5 text-sm text-ink-muted">{description}</p>
        )}
      </div>
    </div>
    {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
  </div>
);

export const CardBody = ({
  className,
  children,
  ...rest
}: HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('px-5 py-4', className)} {...rest}>
    {children}
  </div>
);

export const CardFooter = ({
  className,
  children,
  ...rest
}: HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      'flex flex-wrap items-center gap-3 border-t border-line px-5 py-3',
      className,
    )}
    {...rest}
  >
    {children}
  </div>
);
