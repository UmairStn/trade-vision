/**
 * Display identity for a signed-in Supabase user.
 *
 * Supabase has no canonical display-name field: ours lands in `full_name` (the
 * register form writes it there), OAuth providers use `name`, and a plain
 * email/password signup has neither. The navbar and the dashboard both need the
 * same answer, so the fallback chain lives here instead of being re-guessed in
 * each component.
 */
export const displayName = (
  meta: Record<string, unknown> | undefined,
  email?: string,
): string => {
  const named = meta?.full_name ?? meta?.name;
  if (typeof named === 'string' && named.trim()) return named.trim();
  // The local part of the address, not the whole thing: a display name that
  // wraps onto two lines in a sidebar is not a display name.
  if (email) return email.split('@')[0] || email;
  return 'Account';
};

/** One or two letters for an avatar chip. */
export const initialsOf = (name: string): string => {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

/** `YYYY-MM-DD` for *today in the visitor's timezone*.
 *
 * Not `toISOString().slice(0, 10)`, which is UTC — in Sri Lanka (+05:30) that
 * returns yesterday's date between midnight and 05:30, so a date input with
 * `max={today}` would reject the trade the user just made.
 */
export const todayLocal = (): string => {
  const d = new Date();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${month}-${day}`;
};
