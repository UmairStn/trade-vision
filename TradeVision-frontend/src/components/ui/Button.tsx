import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { CircleNotch } from '@phosphor-icons/react';
import { cn } from '../../lib/cn';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'subtle';
export type ButtonSize = 'sm' | 'md' | 'lg' | 'xl';

/**
 * Filled buttons use `--on-brand`, which is white in light mode and near-black
 * in dark mode. That asymmetry is the point: the old `bg-accent-green text-white`
 * measured 2.28:1 in light and 1.74:1 in dark, both far below the 4.5:1 floor.
 * Light indigo with dark ink measures 6.48:1.
 */
const variants: Record<ButtonVariant, string> = {
  primary:
    'bg-brand text-on-brand hover:bg-brand-hover ' +
    'active:translate-y-px',
  secondary:
    'bg-card text-ink border border-line-strong hover:bg-sunken hover:border-line-strong ' +
    'active:translate-y-px',
  subtle: 'bg-brand-subtle text-brand-subtle-ink hover:bg-brand hover:text-on-brand',
  ghost: 'text-ink-secondary hover:bg-sunken hover:text-ink',
  danger: 'bg-danger text-on-brand hover:bg-danger-hover active:translate-y-px',
};

const sizes: Record<ButtonSize, string> = {
  // 36 / 40 / 48 / 56px tall. Even `sm` clears the 24px minimum-target guidance
  // with room to spare, because these sit in dense table rows.
  sm: 'h-9 gap-1.5 px-3 text-sm rounded-sm',
  md: 'h-10 gap-2 px-4 text-sm rounded-md',
  lg: 'h-12 gap-2 px-6 text-body rounded-md',
  xl: 'h-14 gap-2.5 px-8 text-base rounded-xl',
};

const base =
  'inline-flex items-center justify-center font-medium whitespace-nowrap ' +
  'transition-[background-color,color,border-color,box-shadow,transform] duration-150 ' +
  'ease-out-quart select-none ' +
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand ' +
  'disabled:pointer-events-none disabled:opacity-50';

/**
 * Class string for the button look, for cases that must render a different
 * element — `<Link>`, `<a>`, a Radix trigger. Keeps anchors and buttons visually
 * identical without a polymorphic `as` prop.
 */
export const buttonClass = ({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  className,
}: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  className?: string;
} = {}) =>
  cn(base, variants[variant], sizes[size], fullWidth && 'w-full', className);

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  /** Swaps the leading icon for a spinner and disables the button. */
  loading?: boolean;
  /** Announced while `loading` is true. */
  loadingText?: string;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
}

export const Button = ({
  variant = 'primary',
  size = 'md',
  fullWidth,
  loading = false,
  loadingText,
  leftIcon,
  rightIcon,
  className,
  children,
  disabled,
  type = 'button',
  ...rest
}: ButtonProps) => (
  <button
    type={type}
    disabled={disabled || loading}
    aria-busy={loading || undefined}
    className={buttonClass({ variant, size, fullWidth, className })}
    {...rest}
  >
    {loading ? (
      <CircleNotch
        className={cn('animate-spin shrink-0', size === 'lg' ? 'h-5 w-5' : 'h-4 w-4')}
        aria-hidden="true"
      />
    ) : (
      leftIcon
    )}
    {loading && loadingText ? loadingText : children}
    {!loading && rightIcon}
  </button>
);
