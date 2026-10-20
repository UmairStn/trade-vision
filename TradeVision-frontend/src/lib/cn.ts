/**
 * Conditional className joiner.
 *
 * Deliberately not `tailwind-merge`: the primitives in `components/ui` expose
 * variants for anything that could conflict, so callers never need to override a
 * colour or padding via `className`. Two competing utilities would resolve by
 * stylesheet order, not attribute order, so silently relying on that is a trap.
 */
export type ClassValue = unknown;

export const cn = (...values: ClassValue[]): string =>
  values.filter((v) => typeof v === 'string' && v.length > 0).join(' ');
