import { Moon, Sun } from '@phosphor-icons/react';
import { useTheme } from '../context/ThemeContext';
import { Tooltip } from './ui/Tooltip';

/**
 * The glyph shows the *destination* theme, not the current one — a moon in light
 * mode means "go dark". That matches the label, so the icon and the accessible
 * name can never disagree.
 *
 * Replaces a version with `focus:outline-none` and no substitute ring, which made
 * this control invisible to keyboard users.
 */
export const ThemeToggle = () => {
  const { theme, toggleTheme } = useTheme();
  const label = theme === 'light' ? 'Switch to dark theme' : 'Switch to light theme';

  return (
    <Tooltip content={label}>
      <button
        type="button"
        onClick={toggleTheme}
        aria-label={label}
        className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md
                   text-ink-secondary transition-colors duration-150 ease-out-quart
                   hover:bg-sunken hover:text-ink
                   focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
      >
        {theme === 'light' ? (
          <Moon
            className="h-4.5 w-4.5 motion-safe:animate-scale-in"
            key="moon"
            aria-hidden="true"
          />
        ) : (
          <Sun
            className="h-4.5 w-4.5 motion-safe:animate-scale-in"
            key="sun"
            aria-hidden="true"
          />
        )}
      </button>
    </Tooltip>
  );
};
