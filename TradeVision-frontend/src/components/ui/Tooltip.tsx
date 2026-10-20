import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import type { ReactNode } from 'react';

/**
 * Mount once, near the router. Radix requires a provider above every tooltip.
 */
export const TooltipProvider = ({ children }: { children: ReactNode }) => (
  <TooltipPrimitive.Provider delayDuration={250} skipDelayDuration={100}>
    {children}
  </TooltipPrimitive.Provider>
);

/**
 * Tooltips explain, they never carry a value that appears nowhere else — a
 * hover-only figure is unreachable by keyboard and touch. `asChild` keeps the
 * trigger's own element so focus behaviour is unchanged.
 */
export const Tooltip = ({
  content,
  children,
  side = 'top',
}: {
  content: ReactNode;
  children: ReactNode;
  side?: 'top' | 'right' | 'bottom' | 'left';
}) => (
  <TooltipPrimitive.Root>
    <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Content
        side={side}
        sideOffset={6}
        collisionPadding={8}
        className="z-50 max-w-xs rounded-sm border border-line bg-card px-2.5 py-1.5 text-sm text-ink-secondary elevated-pop data-[state=delayed-open]:animate-fade-in"
      >
        {content}
        <TooltipPrimitive.Arrow className="fill-card" />
      </TooltipPrimitive.Content>
    </TooltipPrimitive.Portal>
  </TooltipPrimitive.Root>
);
