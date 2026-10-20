import type { ReactNode } from 'react';
import { cn } from '../../lib/cn';

export type BadgeTone = 'neutral' | 'brand' | 'up' | 'down' | 'warn' | 'outline';

/**
 * Status tones always ship with a label, and callers pass an icon for anything
 * that carries meaning — a badge never communicates by colour alone. `warn` in
 * light mode is a deliberately dark amber (#b45309, 4.9:1) rather than the usual
 * bright one, which measures under 2:1 on white.
 */
const tones: Record<BadgeTone, string> = {
  neutral: 'bg-sunken text-ink-secondary border-transparent',
  brand: 'bg-brand-subtle text-brand-subtle-ink border-transparent',
  up: 'bg-up-subtle text-up border-transparent',
  down: 'bg-down-subtle text-down border-transparent',
  warn: 'bg-warn-subtle text-warn border-transparent',
  outline: 'bg-transparent text-ink-secondary border-line-strong',
};

export const Badge = ({
  tone = 'neutral',
  icon,
  dot = false,
  size = 'md',
  className,
  children,
}: {
  tone?: BadgeTone;
  icon?: ReactNode;
  /** Small leading dot, for live/closed status. Pulses when the tone is `up`. */
  dot?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  children: ReactNode;
}) => (
  <span
    className={cn(
      'inline-flex items-center gap-1.5 rounded-sm border font-medium whitespace-nowrap',
      size === 'sm' ? 'px-1.5 py-0.5 text-xs' : size === 'lg' ? 'px-3 py-1 text-sm' : 'px-2 py-1 text-xs',
      tones[tone],
      className,
    )}
  >
    {dot && (
      <span
        className={cn(
          'h-1.5 w-1.5 shrink-0 rounded-full bg-current',
          tone === 'up' && 'motion-safe:animate-pulse',
        )}
        aria-hidden="true"
      />
    )}
    {icon}
    {children}
  </span>
);
