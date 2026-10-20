import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { ArrowDown, ArrowUp, CaretUpDown } from '@phosphor-icons/react';
import { cn } from '../../lib/cn';
import { Skeleton } from './Skeleton';

/**
 * One table implementation for the whole app.
 *
 * Two things it fixes beyond consistency:
 *
 * 1. **Mobile.** The old tables were `overflow-x-auto` and nothing else, so a
 *    seven-column table on a 360px phone was a horizontal-scroll trap. Below
 *    `md` this renders the same rows as cards instead.
 * 2. **Clickable rows.** A `<tr onClick>` is invisible to keyboards and screen
 *    readers. The column marked `primary` becomes a real button carrying the
 *    row's accessible name; the row-level click is only a pointer convenience.
 */

export interface Column<T> {
  id: string;
  header: ReactNode;
  cell: (row: T) => ReactNode;
  /** Enables sorting on this column. Return null to sort last. */
  sortBy?: (row: T) => number | string | null;
  /** Right-aligns and applies tabular figures. Use for every number. */
  numeric?: boolean;
  align?: 'left' | 'right' | 'center';
  /** Marks the row's identity cell — becomes the keyboard-reachable action. */
  primary?: boolean;
  /** Drop this column from the desktop table at narrow widths. */
  hideBelow?: 'lg' | 'xl';
  /** Where this column goes in the mobile card. Defaults to `meta`. */
  mobile?: 'title' | 'subtitle' | 'value' | 'meta' | 'hidden';
  headerHint?: string;
  width?: string;
}

type SortDir = 'asc' | 'desc';

interface DataTableProps<T> {
  columns: Column<T>[];
  rows: T[];
  getRowKey: (row: T) => string;
  /** Fires on row click and on Enter/Space on the primary cell. */
  onRowSelect?: (row: T) => void;
  /** Accessible name for the primary cell button. */
  rowActionLabel?: (row: T) => string;
  /** Renders skeleton rows instead of `rows`. */
  loading?: boolean;
  skeletonRows?: number;
  /** Rendered when `rows` is empty and not loading. */
  empty?: ReactNode;
  defaultSort?: { id: string; dir: SortDir };
  /** Screen-reader description of the table. */
  caption?: string;
  /** Caps height and keeps the header pinned while the body scrolls. */
  maxHeight?: string;
  /** Dims the body without collapsing layout, for a background refresh. */
  refreshing?: boolean;
  className?: string;
}

const alignClass = (col: Column<unknown>) => {
  const a = col.align ?? (col.numeric ? 'right' : 'left');
  return a === 'right' ? 'text-right' : a === 'center' ? 'text-center' : 'text-left';
};

const hideClass = (col: Column<unknown>) =>
  col.hideBelow === 'lg' ? 'hidden lg:table-cell' : col.hideBelow === 'xl' ? 'hidden xl:table-cell' : '';

export function DataTable<T>({
  columns,
  rows,
  getRowKey,
  onRowSelect,
  rowActionLabel,
  loading = false,
  skeletonRows = 6,
  empty,
  defaultSort,
  caption,
  maxHeight,
  refreshing = false,
  className,
}: DataTableProps<T>) {
  const [sort, setSort] = useState<{ id: string; dir: SortDir } | null>(
    defaultSort ?? null,
  );

  const sorted = useMemo(() => {
    if (!sort) return rows;
    const col = columns.find((c) => c.id === sort.id);
    if (!col?.sortBy) return rows;
    const factor = sort.dir === 'asc' ? 1 : -1;
    // Copy first: mutating the caller's array would reorder the source data.
    return [...rows].sort((a, b) => {
      const av = col.sortBy!(a);
      const bv = col.sortBy!(b);
      // Nulls sink to the bottom regardless of direction — an absent value is
      // not "the smallest value".
      if (av === null && bv === null) return 0;
      if (av === null) return 1;
      if (bv === null) return -1;
      if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * factor;
      return String(av).localeCompare(String(bv)) * factor;
    });
  }, [rows, sort, columns]);

  const toggleSort = (col: Column<T>) => {
    if (!col.sortBy) return;
    setSort((prev) =>
      prev?.id === col.id
        ? { id: col.id, dir: prev.dir === 'asc' ? 'desc' : 'asc' }
        : // Numbers open descending (biggest gainer first); text opens A→Z.
          { id: col.id, dir: col.numeric ? 'desc' : 'asc' },
    );
  };

  const primaryCol = columns.find((c) => c.primary) ?? columns[0];

  /** Wraps the identity cell in a button when rows are selectable. */
  const renderPrimaryCell = (row: T, col: Column<T>) => {
    if (!onRowSelect || col.id !== primaryCol?.id) return col.cell(row);
    return (
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onRowSelect(row);
        }}
        className="rounded-sm text-left transition-colors hover:text-brand-ink"
        aria-label={rowActionLabel?.(row)}
      >
        {col.cell(row)}
      </button>
    );
  };

  if (!loading && rows.length === 0 && empty) {
    return <div className={className}>{empty}</div>;
  }

  const bodyRows = loading ? [] : sorted;

  return (
    <div className={cn('w-full', className)}>
      {/* ---- Desktop table ---- */}
      <div
        className={cn('hidden md:block', maxHeight && 'overflow-y-auto')}
        style={maxHeight ? { maxHeight } : undefined}
      >
        <table className="w-full border-collapse text-sm">
          {caption && <caption className="sr-only">{caption}</caption>}
          <thead>
            <tr className="border-b border-line">
              {columns.map((col) => {
                const active = sort?.id === col.id;
                const SortIcon = !active
                  ? CaretUpDown
                  : sort.dir === 'asc'
                    ? ArrowUp
                    : ArrowDown;
                return (
                  <th
                    key={col.id}
                    scope="col"
                    style={col.width ? { width: col.width } : undefined}
                    aria-sort={
                      col.sortBy
                        ? active
                          ? sort.dir === 'asc'
                            ? 'ascending'
                            : 'descending'
                          : 'none'
                        : undefined
                    }
                    className={cn(
                      'sticky top-0 z-10 border-b border-line bg-card/95 px-4 py-3 text-xs font-semibold tracking-wide text-ink-muted uppercase',
                      'backdrop-blur-sm',
                      alignClass(col as Column<unknown>),
                      hideClass(col as Column<unknown>),
                    )}
                  >
                    {col.sortBy ? (
                      <button
                        type="button"
                        onClick={() => toggleSort(col)}
                        title={col.headerHint}
                        className={cn(
                          'inline-flex items-center gap-1 rounded-sm transition-colors hover:text-ink',
                          active && 'text-ink',
                          (col.align ?? (col.numeric ? 'right' : 'left')) === 'right' &&
                            'flex-row-reverse',
                        )}
                      >
                        {col.header}
                        <SortIcon className="h-3 w-3 shrink-0" aria-hidden="true" />
                      </button>
                    ) : (
                      <span title={col.headerHint}>{col.header}</span>
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody
            className={cn(
              'transition-opacity duration-200',
              refreshing && 'opacity-55',
            )}
          >
            {loading &&
              Array.from({ length: skeletonRows }, (_, i) => (
                <tr key={`sk-${i}`} className="border-b border-line/60">
                  {columns.map((col) => (
                    <td
                      key={col.id}
                      className={cn('px-4 py-3.5', hideClass(col as Column<unknown>))}
                    >
                      <Skeleton
                        className={cn(
                          'h-3.5',
                          col.numeric ? 'ml-auto w-16' : 'w-28',
                        )}
                      />
                    </td>
                  ))}
                </tr>
              ))}

            {bodyRows.map((row, i) => (
              <tr
                key={getRowKey(row)}
                onClick={onRowSelect ? () => onRowSelect(row) : undefined}
                className={cn(
                  'border-b border-line/60 transition-colors last:border-0',
                  // Even/odd differentiation is subtle; hover is the strong signal.
                  i % 2 === 1 && 'bg-sunken/40',
                  onRowSelect && 'cursor-pointer hover:bg-brand-subtle/40',
                )}
              >
                {columns.map((col) => (
                  <td
                    key={col.id}
                    className={cn(
                      'px-4 py-3.5 text-ink-secondary',
                      col.numeric && 'tabular-nums',
                      alignClass(col as Column<unknown>),
                      hideClass(col as Column<unknown>),
                    )}
                  >
                    {renderPrimaryCell(row, col)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ---- Mobile cards ---- */}
      <div
        className={cn(
          'divide-y divide-line md:hidden',
          refreshing && 'opacity-55',
        )}
      >
        {loading &&
          Array.from({ length: Math.min(skeletonRows, 4) }, (_, i) => (
            <div key={`mk-${i}`} className="space-y-2 px-4 py-4">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-3 w-40" />
            </div>
          ))}

        {bodyRows.map((row) => {
          const pick = (role: Column<T>['mobile']) =>
            columns.filter((c) => c.mobile === role);
          const title = pick('title')[0] ?? primaryCol;
          const subtitle = pick('subtitle')[0];
          const value = pick('value')[0];
          const meta = columns.filter(
            (c) =>
              c.mobile !== 'hidden' &&
              c.id !== title?.id &&
              c.id !== subtitle?.id &&
              c.id !== value?.id,
          );

          return (
            <div
              key={getRowKey(row)}
              onClick={onRowSelect ? () => onRowSelect(row) : undefined}
              className={cn('px-4 py-4', onRowSelect && 'active:bg-sunken')}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-body font-semibold text-ink">
                    {title && renderPrimaryCell(row, title)}
                  </div>
                  {subtitle && (
                    <div className="mt-0.5 truncate text-sm text-ink-muted">
                      {subtitle.cell(row)}
                    </div>
                  )}
                </div>
                {value && (
                  <div className="shrink-0 text-right tabular-nums">
                    {value.cell(row)}
                  </div>
                )}
              </div>

              {meta.length > 0 && (
                <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2">
                  {meta.map((col) => (
                    <div key={col.id} className="min-w-0">
                      <dt className="text-xs tracking-wide text-ink-muted uppercase">
                        {col.header}
                      </dt>
                      <dd
                        className={cn(
                          'mt-0.5 text-sm text-ink-secondary',
                          col.numeric && 'tabular-nums',
                        )}
                      >
                        {col.cell(row)}
                      </dd>
                    </div>
                  ))}
                </dl>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
