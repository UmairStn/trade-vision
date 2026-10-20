import type { CSSProperties } from 'react';
import { cn } from '../../lib/cn';

/**
 * Shimmer placeholder. Opacity-based rather than a moving gradient so the global
 * `prefers-reduced-motion` rule can stop it without leaving a half-painted sweep.
 *
 * `style` exists for the one case a class can't cover: standing in for something
 * whose height is a runtime number, like a chart's `height` prop. Reserving the
 * exact space is the point — a skeleton that's the wrong size still shifts layout.
 */
export const Skeleton = ({
  className,
  style,
}: {
  className?: string;
  style?: CSSProperties;
}) => (
  <div
    className={cn(
      'animate-shimmer rounded-sm',
      'bg-linear-to-r from-sunken via-card to-sunken bg-size-[200%_100%]',
      className,
    )}
    style={style}
    aria-hidden="true"
  />
);

/** Text-shaped skeleton lines with a shortened last line. */
export const SkeletonText = ({
  lines = 3,
  className,
}: {
  lines?: number;
  className?: string;
}) => (
  <div className={cn('space-y-2', className)} aria-hidden="true">
    {Array.from({ length: lines }, (_, i) => (
      <Skeleton
        key={i}
        className={cn('h-3.5', i === lines - 1 ? 'w-2/3' : 'w-full')}
      />
    ))}
  </div>
);
