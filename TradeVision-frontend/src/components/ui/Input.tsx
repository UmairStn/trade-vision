import { useId, useState } from 'react';
import type {
  InputHTMLAttributes,
  ReactNode,
  TextareaHTMLAttributes,
} from 'react';
import { Eye, EyeClosed } from '@phosphor-icons/react';
import { cn } from '../../lib/cn';

/**
 * `id`/`htmlFor` are wired by `useId` rather than left to the caller. The app had
 * 13 `<label>` elements and one `htmlFor`, so clicking a label did nothing and
 * screen readers announced unlabelled fields. Making the label part of the input
 * component means the pairing can't be forgotten.
 *
 * Also fixes the focus ring: five inputs used `focus:outline-none
 * focus:border-accent-green`, a 1px border change that is nearly invisible.
 */

const fieldShell =
  'w-full rounded-md border bg-sunken text-ink placeholder:text-ink-muted ' +
  'transition-[border-color,box-shadow,background-color] duration-150 ease-out-quart ' +
  'focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand ' +
  'disabled:cursor-not-allowed disabled:opacity-60';

/** Wrapper for controls that aren't a plain `<input>` (comboboxes, groups). */
export const Field = ({
  id,
  label,
  hint,
  error,
  required,
  labelSuffix,
  children,
  className,
}: {
  id: string;
  label: ReactNode;
  hint?: ReactNode;
  error?: string | null;
  required?: boolean;
  /** Right-aligned link/action in the label row, e.g. "Forgot password?". */
  labelSuffix?: ReactNode;
  children: ReactNode;
  className?: string;
}) => (
  <div className={cn('w-full', className)}>
    <div className="mb-1.5 flex items-baseline justify-between gap-3">
      <label htmlFor={id} className="text-sm font-medium text-ink-secondary">
        {label}
        {required && (
          <span className="ml-0.5 text-down" aria-hidden="true">
            *
          </span>
        )}
      </label>
      {labelSuffix}
    </div>
    {children}
    {error ? (
      <p id={`${id}-error`} className="mt-1.5 text-sm text-down" role="alert">
        {error}
      </p>
    ) : (
      hint && (
        <p id={`${id}-hint`} className="mt-1.5 text-sm text-ink-muted">
          {hint}
        </p>
      )
    )}
  </div>
);

interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label: ReactNode;
  hint?: ReactNode;
  error?: string | null;
  leftIcon?: ReactNode;
  /** Trailing content inside the box — a unit, a clear button. */
  rightSlot?: ReactNode;
  labelSuffix?: ReactNode;
  /** Adds a show/hide toggle and manages `type` itself. */
  revealable?: boolean;
  containerClassName?: string;
}

export const Input = ({
  label,
  hint,
  error,
  leftIcon,
  rightSlot,
  labelSuffix,
  revealable = false,
  required,
  className,
  containerClassName,
  type = 'text',
  id: idProp,
  ...rest
}: InputProps) => {
  const autoId = useId();
  const id = idProp ?? autoId;
  const [revealed, setRevealed] = useState(false);
  const resolvedType = revealable ? (revealed ? 'text' : 'password') : type;

  return (
    <Field
      id={id}
      label={label}
      hint={hint}
      error={error}
      required={required}
      labelSuffix={labelSuffix}
      className={containerClassName}
    >
      <div className="relative">
        {leftIcon && (
          <span
            className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-ink-muted"
            aria-hidden="true"
          >
            {leftIcon}
          </span>
        )}
        <input
          id={id}
          type={resolvedType}
          required={required}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
          className={cn(
            fieldShell,
            'h-11 px-3.5 text-body',
            leftIcon && 'pl-10',
            (rightSlot || revealable) && 'pr-11',
            error ? 'border-down' : 'border-line',
            className,
          )}
          {...rest}
        />
        {revealable ? (
          <button
            type="button"
            onClick={() => setRevealed((v) => !v)}
            // Not in the tab order of the form's happy path, but still reachable:
            // it's a genuine control, so it keeps its focus ring.
            className="absolute top-1/2 right-1 -translate-y-1/2 rounded-sm p-2 text-ink-muted transition-colors hover:text-ink"
            aria-label={revealed ? 'Hide password' : 'Show password'}
            aria-pressed={revealed}
          >
            {revealed ? (
              <EyeClosed className="h-4 w-4" aria-hidden="true" />
            ) : (
              <Eye className="h-4 w-4" aria-hidden="true" />
            )}
          </button>
        ) : (
          rightSlot && (
            <span className="absolute top-1/2 right-3 -translate-y-1/2 text-sm text-ink-muted">
              {rightSlot}
            </span>
          )
        )}
      </div>
    </Field>
  );
};

/** Same contract as `Input`, for multi-line text. */
export const Textarea = ({
  label,
  hint,
  error,
  required,
  className,
  id: idProp,
  rows = 3,
  ...rest
}: {
  label: ReactNode;
  hint?: ReactNode;
  error?: string | null;
} & TextareaHTMLAttributes<HTMLTextAreaElement>) => {
  const autoId = useId();
  const id = idProp ?? autoId;
  return (
    <Field id={id} label={label} hint={hint} error={error} required={required}>
      <textarea
        id={id}
        rows={rows}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
        className={cn(
          fieldShell,
          'resize-y px-3.5 py-2.5 text-body',
          error ? 'border-down' : 'border-line',
          className,
        )}
        {...rest}
      />
    </Field>
  );
};

/** Bare input styling, for search boxes that supply their own label/aria. */
export const inputClass = (extra?: string) =>
  cn(fieldShell, 'h-11 border-line px-3.5 text-body', extra);
