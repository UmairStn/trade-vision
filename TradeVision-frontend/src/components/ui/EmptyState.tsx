import type { ReactNode } from 'react';
import { cn } from '../../lib/cn';

/**
 * Shown where a list has legitimately nothing in it. The holdings and watchlist
 * tables used to render bare column headers over blank space, which reads as a
 * loading failure rather than "you haven't added anything yet".
 */
export const EmptyState = ({
  icon,
  title,
  description,
  action,
  size = 'md',
  className,
}: {
  icon?: ReactNode;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  size?: 'sm' | 'md';
  className?: string;
}) => (
  <div
    className={cn(
      'flex flex-col items-center justify-center text-center',
      size === 'sm' ? 'gap-2 px-4 py-8' : 'gap-3 px-6 py-14',
      className,
    )}
  >
    {icon && (
      <span
        className={cn(
          'flex items-center justify-center rounded-full',
          'bg-linear-to-br from-brand to-brand-hover text-on-brand',
          size === 'sm' ? 'h-10 w-10' : 'h-14 w-14',
        )}
        aria-hidden="true"
      >
        {icon}
      </span>
    )}
    <h3 className={cn('text-ink', size === 'sm' ? 'text-body font-semibold' : 'text-h3')}>
      {title}
    </h3>
    {description && (
      <p className="max-w-sm text-sm text-ink-muted">{description}</p>
    )}
    {action && <div className="mt-1">{action}</div>}
  </div>
);
