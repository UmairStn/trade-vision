import { useEffect, useState } from 'react';
import { useTheme } from '../context/ThemeContext';

/**
 * Resolves the chart tokens to concrete colour strings.
 *
 * Recharts writes colours into SVG presentation attributes (`fill`, `stroke`),
 * and `var(--x)` is not valid in an SVG attribute — so unlike the rest of the UI
 * a chart can't consume the custom properties directly. Reading them once per
 * theme change keeps `index.css` the single source of truth instead of
 * re-hardcoding hexes in every chart, which is what LiveChart did (six literals,
 * plus its own duplicated `theme === 'dark'` checks).
 */
const TOKENS = [
  '--ink',
  '--ink-secondary',
  '--ink-muted',
  '--brand',
  '--up',
  '--down',
  '--line',
  '--surface-card',
  '--surface-sunken',
  '--chart-grid',
  '--chart-axis',
  '--chart-baseline',
  '--series-1',
] as const;

type Token = (typeof TOKENS)[number];
export type ChartTheme = Record<Token, string>;

/** Fallbacks matter only if the stylesheet hasn't applied yet. */
const FALLBACK: ChartTheme = {
  '--ink': '#0d1117',
  '--ink-secondary': '#414a58',
  '--ink-muted': '#5b6472',
  '--brand': '#4f46e5',
  '--up': '#047857',
  '--down': '#b91c1c',
  '--line': '#e2e5ea',
  '--surface-card': '#ffffff',
  '--surface-sunken': '#eef0f4',
  '--chart-grid': '#e8ebef',
  '--chart-axis': '#6b7480',
  '--chart-baseline': '#cdd2da',
  '--series-1': '#2a78d6',
};

const read = (): ChartTheme => {
  if (typeof window === 'undefined') return FALLBACK;
  const style = getComputedStyle(document.documentElement);
  const out = { ...FALLBACK };
  for (const token of TOKENS) {
    const value = style.getPropertyValue(token).trim();
    if (value) out[token] = value;
  }
  return out;
};

export const useChartTheme = (): ChartTheme => {
  const { theme } = useTheme();
  const [colors, setColors] = useState<ChartTheme>(read);

  useEffect(() => {
    // ThemeProvider toggles the `.dark` class in its own effect; this runs after,
    // so the computed values are already the new theme's.
    setColors(read());
  }, [theme]);

  return colors;
};
