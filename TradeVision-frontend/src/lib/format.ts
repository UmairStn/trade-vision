/**
 * Display formatters.
 *
 * Every price/volume string in the app used to be built inline with
 * `Rs. ${n.toFixed(2)}` and bespoke `toLocaleString` calls, so thousands
 * separators and decimal places drifted between pages. These are the only
 * formatters the UI should use.
 *
 * Locale is pinned to `en-LK` with an `en-US` fallback so grouping is stable
 * regardless of the visitor's browser locale — a table of prices that switches
 * separator style per user is not worth the "localisation".
 */

const LOCALE = 'en-LK';

const nf = (options: Intl.NumberFormatOptions) => {
  try {
    return new Intl.NumberFormat(LOCALE, options);
  } catch {
    return new Intl.NumberFormat('en-US', options);
  }
};

const priceFormatter = nf({ minimumFractionDigits: 2, maximumFractionDigits: 2 });
const intFormatter = nf({ maximumFractionDigits: 0 });

/** `1234.5` -> `"1,234.50"`. No currency symbol — pair with a `Rs` label. */
export const formatPrice = (value: number | null | undefined): string =>
  value === null || value === undefined || !Number.isFinite(value)
    ? '—'
    : priceFormatter.format(value);

/** `1234.5` -> `"Rs 1,234.50"`. */
export const formatCurrency = (value: number | null | undefined): string =>
  value === null || value === undefined || !Number.isFinite(value)
    ? '—'
    : `Rs ${priceFormatter.format(value)}`;

/** `1234567` -> `"1,234,567"`. */
export const formatInt = (value: number | null | undefined): string =>
  value === null || value === undefined || !Number.isFinite(value)
    ? '—'
    : intFormatter.format(value);

/**
 * Compact notation for stat tiles and axis ticks: `1234567` -> `"1.23M"`.
 *
 * Hand-rolled rather than `notation: 'compact'` because Intl renders Sri Lankan
 * turnover figures in crore/lakh under some locales, which is not what the CSE
 * itself publishes.
 */
export const formatCompact = (value: number | null | undefined, digits = 2): string => {
  if (value === null || value === undefined || !Number.isFinite(value)) return '—';
  const abs = Math.abs(value);
  const sign = value < 0 ? '-' : '';
  const units: [number, string][] = [
    [1e12, 'T'],
    [1e9, 'B'],
    [1e6, 'M'],
    [1e3, 'K'],
  ];
  for (const [threshold, suffix] of units) {
    if (abs >= threshold) {
      const scaled = abs / threshold;
      // Keep three significant figures: 1.23M, 12.3M, 123M.
      const dp = scaled >= 100 ? 0 : scaled >= 10 ? 1 : digits;
      return `${sign}${scaled.toFixed(dp)}${suffix}`;
    }
  }
  return `${sign}${abs.toFixed(abs < 10 && abs % 1 !== 0 ? digits : 0)}`;
};

/**
 * `2.5` -> `"+2.50%"`.
 *
 * Uses U+2212 MINUS SIGN, not a hyphen: in Inter's tabular figures the true
 * minus is digit-width and the hyphen is not, so a column of gains and losses
 * only aligns with the real glyph.
 */
export const formatSignedPercent = (
  value: number | null | undefined,
  digits = 2,
): string => {
  if (value === null || value === undefined || !Number.isFinite(value)) return '—';
  const sign = value > 0 ? '+' : value < 0 ? '−' : '';
  return `${sign}${Math.abs(value).toFixed(digits)}%`;
};

/** `-1.25` -> `"−1.25"`, with the same true-minus rule as above. */
export const formatSigned = (
  value: number | null | undefined,
  digits = 2,
): string => {
  if (value === null || value === undefined || !Number.isFinite(value)) return '—';
  const sign = value > 0 ? '+' : value < 0 ? '−' : '';
  return `${sign}${priceFormatter.format(Math.abs(Number(value.toFixed(digits))))}`;
};

/** `"2026-08-21"` -> `"21 Aug 2026"`. Invalid/absent dates return an em dash. */
export const formatDate = (value: string | null | undefined): string => {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString(LOCALE, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};

/** Short axis-tick form: `"21 Aug"`. */
export const formatDateShort = (value: string | null | undefined): string => {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value).slice(0, 10);
  return d.toLocaleDateString(LOCALE, { day: 'numeric', month: 'short' });
};

/** `"…T10:30:00"` -> `"10:30"`. */
export const formatTime = (value: string | null | undefined): string => {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleTimeString(LOCALE, { hour: '2-digit', minute: '2-digit' });
};

/**
 * Whole days between `value` and now, or null if unparseable.
 * Drives the prediction staleness warnings.
 */
export const daysSince = (value: string | null | undefined): number | null => {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return Math.floor((Date.now() - d.getTime()) / 86_400_000);
};

/** `3` -> `"3 days ago"`, `0` -> `"today"`. */
export const formatDayGap = (days: number | null): string => {
  if (days === null) return 'unknown';
  if (days <= 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 30) return `${days} days ago`;
  const months = Math.round(days / 30);
  return months === 1 ? 'about a month ago' : `about ${months} months ago`;
};
