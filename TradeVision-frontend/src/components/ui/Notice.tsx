import type { ReactNode } from 'react';
import { Warning, Info } from '@phosphor-icons/react';
import { cn } from '../../lib/cn';

export type NoticeTone = 'warn' | 'info' | 'error';

/**
 * Inline banner for conditions the user must see but that aren't failures —
 * chiefly the backend's own `warnings[]` arrays and prediction staleness.
 *
 * Always icon + text: the tone colour is a reinforcement, never the message.
 */
const tones: Record<
  NoticeTone,
  { wrap: string; icon: typeof Info }
> = {
  warn: { wrap: 'border-warn/35 bg-warn-subtle text-warn', icon: Warning },
  info: { wrap: 'border-brand/30 bg-brand-subtle text-brand-subtle-ink', icon: Info },
  error: {
    wrap: 'border-l-4 border-l-danger border-down/35 bg-down-subtle text-down',
    icon: Warning,
  },
};

export const Notice = ({
  tone = 'warn',
  title,
  children,
  action,
  className,
}: {
  tone?: NoticeTone;
  title?: ReactNode;
  children?: ReactNode;
  action?: ReactNode;
  className?: string;
}) => {
  const { wrap, icon: Icon } = tones[tone];
  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      className={cn(
        'flex items-start gap-3 rounded-md border px-4 py-3 text-sm',
        wrap,
        className,
      )}
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <div className="min-w-0 flex-1">
        {title && <p className="font-semibold">{title}</p>}
        {children && <div className={cn(title && 'mt-0.5', 'opacity-95')}>{children}</div>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
};
