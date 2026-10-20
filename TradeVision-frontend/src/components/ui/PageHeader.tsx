import type { ReactNode } from 'react';
import { cn } from '../../lib/cn';

/** Consistent page-title block. Actions wrap below the title on narrow screens. */
export const PageHeader = ({
  eyebrow,
  title,
  description,
  actions,
  className,
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) => (
  <div
    className={cn(
      'flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between',
      className,
    )}
  >
    <div className="min-w-0">
      {eyebrow && (
        <div className="mb-2 flex items-center gap-2 text-xs font-medium tracking-wide text-ink-muted uppercase">
          {eyebrow}
        </div>
      )}
      <h1 className="text-h1 text-ink">{title}</h1>
      {description && (
        <p className="mt-2 max-w-2xl text-body text-ink-muted">{description}</p>
      )}
    </div>
    {actions && (
      <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>
    )}
  </div>
);

/** Standard page shell: max width, gutters, and vertical rhythm. */
export const PageShell = ({
  children,
  className,
  width = 'default',
}: {
  children: ReactNode;
  className?: string;
  width?: 'default' | 'wide' | 'narrow';
}) => (
  <div
    className={cn(
      'mx-auto w-full px-4 py-8 sm:px-6 sm:py-10 lg:px-8',
      width === 'default' && 'max-w-7xl',
      width === 'wide' && 'max-w-[1600px]',
      width === 'narrow' && 'max-w-3xl',
      className,
    )}
  >
    {children}
  </div>
);
