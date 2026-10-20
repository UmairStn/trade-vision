import { useEffect, useId, useRef, useState } from 'react';
import type { KeyboardEvent, ReactNode } from 'react';
import { CircleNotch, MagnifyingGlass, X } from '@phosphor-icons/react';
import type { StockQuote } from '../types/stock';
import { searchStocks } from '../services/api';
import { formatPrice } from '../lib/format';
import { cn } from '../lib/cn';
import { Delta } from './ui/Delta';

/**
 * Ticker picker: a real ARIA combobox over `searchStocks`.
 *
 * Three things this fixes at once:
 *
 *  - The analyzer's symbol list was a permanently-open column with its own
 *    `overflow-y-auto`, inside a `100vh` page — two nested scrollbars plus the
 *    document's. A popup listbox is the same list without the scroll trap.
 *  - The old search box was an unlabelled `<input type="text">` with
 *    `focus:outline-none`: no role, no `aria-expanded`, no keyboard path to the
 *    results, and no visible focus ring.
 *  - **Each instance owns its query and results.** The Dashboard ran both of its
 *    add-forms off one shared `searchResults`/`showResults` pair, so typing in
 *    one modal populated the other's dropdown. Two instances cannot do that.
 *
 * Results come from the module-cached symbol list, so a keystroke costs no
 * request once the list is warm.
 */

interface SymbolSearchProps {
  onSelect: (quote: StockQuote) => void;
  /** Accessible name; also the visible `<label>` when `showLabel` is set. */
  label: string;
  showLabel?: boolean;
  placeholder?: string;
  /**
   * Keeps the box in step with a symbol owned elsewhere (the analyzer's URL
   * param). Every change resets what's typed. Omit for form use, where the
   * field's value is the user's own.
   */
  syncValue?: string;
  hint?: ReactNode;
  error?: string | null;
  required?: boolean;
  /** `sm` (40px) lines up with a medium Button; `md` (44px) with `Input`. */
  size?: 'sm' | 'md';
  className?: string;
}

export const SymbolSearch = ({
  onSelect,
  label,
  showLabel = false,
  placeholder = 'Search by symbol or company',
  syncValue,
  hint,
  error,
  required,
  size = 'md',
  className,
}: SymbolSearchProps) => {
  const id = useId();
  const listboxId = `${id}-listbox`;
  const optionId = (index: number) => `${id}-option-${index}`;

  const [query, setQuery] = useState(syncValue ?? '');
  const [results, setResults] = useState<StockQuote[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState<string | null>(null);
  const [active, setActive] = useState(-1);

  const inputRef = useRef<HTMLInputElement>(null);
  const optionRefs = useRef<(HTMLLIElement | null)[]>([]);

  // The symbol is owned by the URL on the analyzer, so a change from anywhere
  // else — a movers link, the back button — has to land in the box too.
  useEffect(() => {
    if (syncValue !== undefined) setQuery(syncValue);
  }, [syncValue]);

  // Debounced, and only while the popup is open: a closed combobox has nothing
  // to show, so a page with four of them costs nothing on load.
  useEffect(() => {
    if (!open) return;
    let stale = false;
    setLoading(true);
    const timer = setTimeout(() => {
      searchStocks(query)
        .then((found) => {
          if (stale) return;
          setResults(found);
          setFailed(null);
          setActive(found.length > 0 ? 0 : -1);
        })
        .catch((e: unknown) => {
          if (stale) return;
          setResults([]);
          setActive(-1);
          setFailed(e instanceof Error ? e.message : 'Symbol search failed');
        })
        .finally(() => {
          if (!stale) setLoading(false);
        });
    }, 250);
    return () => {
      stale = true;
      clearTimeout(timer);
    };
  }, [query, open]);

  useEffect(() => {
    if (active >= 0) optionRefs.current[active]?.scrollIntoView({ block: 'nearest' });
  }, [active]);

  const commit = (quote: StockQuote) => {
    setQuery(quote.ticker);
    setOpen(false);
    setActive(-1);
    onSelect(quote);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (!open) {
        setOpen(true);
        return;
      }
      if (results.length === 0) return;
      const step = e.key === 'ArrowDown' ? 1 : -1;
      setActive((i) => (i + step + results.length) % results.length);
      return;
    }
    if (e.key === 'Enter') {
      if (open && active >= 0 && results[active]) {
        // Also stops a form submitting on the keystroke that picks a symbol.
        e.preventDefault();
        commit(results[active]);
      }
      return;
    }
    if (e.key === 'Escape' && open) {
      // Swallowed so Escape closes the listbox and not the dialog around it.
      e.stopPropagation();
      setOpen(false);
      setActive(-1);
      return;
    }
    if (e.key === 'Tab') setOpen(false);
  };

  const describedBy = error
    ? `${id}-error`
    : hint
      ? `${id}-hint`
      : undefined;

  return (
    <div
      className={cn('relative', className)}
      // Options are not focusable (see `onMouseDown` below), so the only way out
      // is a real focus move — closing on any blur outside the widget.
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
          setOpen(false);
          setActive(-1);
        }
      }}
    >
      {showLabel && (
        <label
          htmlFor={id}
          className="mb-1.5 block text-sm font-medium text-ink-secondary"
        >
          {label}
          {required && (
            <span className="ml-0.5 text-down" aria-hidden="true">
              *
            </span>
          )}
        </label>
      )}

      <div className="relative">
        <MagnifyingGlass
          className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-ink-muted"
          aria-hidden="true"
        />
        <input
          ref={inputRef}
          id={id}
          type="text"
          role="combobox"
          autoComplete="off"
          spellCheck={false}
          required={required}
          value={query}
          placeholder={placeholder}
          aria-label={showLabel ? undefined : label}
          aria-expanded={open}
          aria-controls={listboxId}
          aria-autocomplete="list"
          aria-activedescendant={open && active >= 0 ? optionId(active) : undefined}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={(e) => {
            setOpen(true);
            // Typing replaces the symbol already in the box instead of appending
            // to it, which is what a re-search almost always means here.
            e.currentTarget.select();
          }}
          onKeyDown={onKeyDown}
          className={cn(
            'w-full rounded-md border bg-sunken pr-10 pl-9 text-body text-ink',
            'placeholder:text-ink-muted',
            'transition-[border-color,box-shadow] duration-150 ease-out-quart',
            'focus:border-brand focus:ring-2 focus:ring-brand/40 focus:outline-none',
            size === 'sm' ? 'h-10' : 'h-11',
            error ? 'border-down' : 'border-line',
          )}
        />

        {loading ? (
          <CircleNotch
            className="absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 animate-spin text-ink-muted"
            aria-hidden="true"
          />
        ) : (
          query.length > 0 && (
            <button
              type="button"
              onClick={() => {
                setQuery('');
                setOpen(true);
                inputRef.current?.focus();
              }}
              aria-label="Clear the symbol search"
              className="absolute top-1/2 right-1 -translate-y-1/2 rounded-sm p-2 text-ink-muted transition-colors hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          )
        )}
      </div>

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

      {/* Count spoken on change, so a screen-reader user knows the list moved
          without having to arrow into it. */}
      <span className="sr-only" role="status">
        {open && !loading
          ? `${results.length} ${results.length === 1 ? 'symbol' : 'symbols'} available`
          : ''}
      </span>

      {open && (
        <div
          className="animate-scale-in absolute z-30 mt-1.5 max-h-80 w-full origin-top overflow-y-auto rounded-md border border-line bg-card py-1 elevated-pop"
        >
          <ul id={listboxId} role="listbox" aria-label={label}>
            {results.length === 0 ? (
              <li role="presentation" className="px-3 py-6 text-center text-sm text-ink-muted">
                {loading
                  ? 'Searching…'
                  : (failed ??
                    (query.trim()
                      ? `No CSE symbol matches “${query.trim()}”.`
                      : 'No symbols returned.'))}
              </li>
            ) : (
              results.map((quote, index) => (
                <li
                  key={quote.ticker}
                  ref={(el) => {
                    optionRefs.current[index] = el;
                  }}
                  id={optionId(index)}
                  role="option"
                  aria-selected={index === active}
                  // Keeps focus in the input so the click isn't cancelled by the
                  // container's blur handler.
                  onMouseDown={(e) => e.preventDefault()}
                  onMouseEnter={() => setActive(index)}
                  onClick={() => commit(quote)}
                  className={cn(
                    'flex cursor-pointer items-center gap-3 px-3 py-2',
                    index === active && 'bg-sunken',
                  )}
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-ink">
                      {quote.ticker}
                    </span>
                    <span className="block truncate text-xs text-ink-muted">
                      {quote.name}
                    </span>
                  </span>
                  <span className="shrink-0 text-right">
                    <span className="block text-sm text-ink tabular-nums">
                      Rs {formatPrice(quote.price)}
                    </span>
                    <Delta
                      percent={quote.changePercent}
                      size="sm"
                      className="justify-end"
                    />
                  </span>
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
};
