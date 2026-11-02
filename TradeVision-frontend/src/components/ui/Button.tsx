import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { CircleNotch } from '@phosphor-icons/react';
import { cn } from '../../lib/cn';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'subtle';
export type ButtonSize = 'sm' | 'md' | 'lg' | 'xl';

/**
 * Filled primary uses --ink (off-black) with white text — high contrast, no
 * shadow, no glow. Secondary/ghost use warm neutrals. Brand accent lives in
 * active nav, links, and chips instead of competing with every CTA.
 *
 * No `rounded-full` on primary buttons (minimalist-ui). Crisp radius only.
 */
const variants: Record<ButtonVariant, string> = {
  primary:
    'bg-ink text-on-brand hover:bg-ink-secondary ' +
    'active:scale-[0.98] active:transition-transform duration-150',
  secondary:
    'bg-card text-ink border border-line-strong hover:bg-sunken hover:border-line-strong ' +
    'active:translate-y-px',
  subtle: 'bg-brand-subtle text-brand-subtle-ink hover:bg-brand hover:text-on-brand',
  ghost: 'text-ink-secondary hover:bg-sunken hover:text-ink',
  danger: 'bg-danger text-on-brand hover:bg-danger-hover active:scale-[0.98] active:transition-transform duration-150',
};

const sizes: Record<ButtonSize, string> = {
  sm: 'h-9 gap-1.5 px-3 text-sm rounded-sm',
  md: 'h-10 gap-2 px-4 text-sm rounded-md',
  lg: 'h-12 gap-2 px-6 text-body rounded-md',
  xl: 'h-14 gap-2.5 px-8 text-base rounded-xl',
};

const base =
  'inline-flex items-center justify-center font-medium whitespace-nowrap ' +
  'transition-[background-color,color,border-color,transform] duration-150 ' +
  'ease-out-quart select-none ' +
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand ' +
  'disabled:pointer-events-none disabled:opacity-50';

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
  loading?: boolean;
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
