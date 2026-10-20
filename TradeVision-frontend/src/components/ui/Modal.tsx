import * as Dialog from '@radix-ui/react-dialog';
import type { ReactNode } from 'react';
import { X } from '@phosphor-icons/react';
import { cn } from '../../lib/cn';

/**
 * Built on Radix Dialog rather than by hand.
 *
 * The three dialogs this replaces were `fixed inset-0` divs with no `role`, no
 * focus trap, no Escape handler, no scroll lock and no return focus — so a
 * keyboard user could tab out of an open modal into the page behind it, and a
 * screen reader never announced that anything had opened. Radix supplies all of
 * that; none of it is worth reimplementing.
 */

export type ModalSize = 'sm' | 'md' | 'lg';

const sizes: Record<ModalSize, string> = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-2xl',
};

export const Modal = ({
  open,
  onOpenChange,
  title,
  description,
  size = 'md',
  footer,
  children,
  /** Set when the body owns a dropdown that must not be clipped. */
  overflowVisible = false,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  size?: ModalSize;
  footer?: ReactNode;
  children: ReactNode;
  overflowVisible?: boolean;
}) => (
  <Dialog.Root open={open} onOpenChange={onOpenChange}>
    <Dialog.Portal>
      <Dialog.Overlay
        className={cn(
          'fixed inset-0 z-50 bg-black/55 backdrop-blur-sm',
          'data-[state=open]:animate-fade-in',
        )}
      />
      <Dialog.Content
        className={cn(
          'fixed top-1/2 left-1/2 z-50 w-[calc(100vw-2rem)] -translate-x-1/2 -translate-y-1/2',
          sizes[size],
          'rounded-lg border border-line bg-card elevated-pop',
          'data-[state=open]:animate-scale-in',
          // The header and footer stay put; only the body scrolls, so a long form
          // on a short viewport never hides its own submit button.
          'flex max-h-[calc(100dvh-2rem)] flex-col',
        )}
      >
        <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
          <div className="min-w-0">
            <Dialog.Title className="text-h3 text-ink">{title}</Dialog.Title>
            {description && (
              <Dialog.Description className="mt-1 text-sm text-ink-muted">
                {description}
              </Dialog.Description>
            )}
          </div>
          <Dialog.Close
            className="-mt-1 -mr-1 rounded-sm p-2 text-ink-muted transition-colors hover:bg-sunken hover:text-ink"
            aria-label="Close dialog"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </Dialog.Close>
        </div>

        <div
          className={cn(
            'min-h-0 flex-1 px-5 py-4',
            overflowVisible ? 'overflow-visible' : 'overflow-y-auto',
          )}
        >
          {children}
        </div>

        {footer && (
          <div className="flex flex-wrap items-center justify-end gap-2 border-t border-line px-5 py-3">
            {footer}
          </div>
        )}
      </Dialog.Content>
    </Dialog.Portal>
  </Dialog.Root>
);

export const ModalClose = Dialog.Close;
