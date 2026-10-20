import { Toaster as Sonner } from 'sonner';
import { useTheme } from '../../context/ThemeContext';

/**
 * Replaces three `window.alert()` calls in the dashboard. An alert blocks the
 * main thread, can't be styled, and on a failed "add position" it discarded the
 * user's context entirely.
 *
 * Colours come from the token layer rather than sonner's own theme so toasts
 * match the app in both modes.
 */
export const Toaster = () => {
  const { theme } = useTheme();

  return (
    <Sonner
      theme={theme}
      position="bottom-right"
      closeButton
      // Long enough to read a backend error message, which can be a full
      // sentence about an unreachable API.
      duration={5000}
      toastOptions={{
        classNames: {
          toast:
            'group rounded-lg border border-line bg-card text-ink elevated-pop text-sm',
          title: 'text-ink font-medium',
          description: 'text-ink-muted',
          actionButton: 'bg-brand text-on-brand rounded-sm',
          cancelButton: 'bg-sunken text-ink-secondary rounded-sm',
          closeButton: 'bg-card border-line text-ink-muted hover:text-ink',
          success: 'border-l-2 border-l-up',
          error: 'border-l-2 border-l-down',
          warning: 'border-l-2 border-l-warn',
          info: 'border-l-2 border-l-brand',
        },
      }}
    />
  );
};
