import { useId, useMemo } from 'react';
import type { StockPrice } from '../../types/stock';
import { useChartTheme } from '../../hooks/useChartTheme';
import { cn } from '../../lib/cn';

/**
 * A trend glyph, not a chart: no axes, no tooltip, no grid.
 *
 * Hand-drawn SVG rather than Recharts because a `ResponsiveContainer` per
 * sparkline is a ResizeObserver per sparkline, and the values here are always
 * also available in the chart or table next to it.
 *
 * Deliberately **not** used per table row: `fetchStockHistory` is one request per
 * ticker, so a sparkline column on a 50-row table would fire 50 requests.
 */
export const Sparkline = ({
  data,
  width = 120,
  height = 36,
  /** Overrides the automatic up/down colour, e.g. to hold the brand hue. */
  color,
  className,
  label,
}: {
  data: StockPrice[];
  width?: number;
  height?: number;
  color?: string;
  className?: string;
  /** Accessible summary. Without one the graphic is hidden from screen readers. */
  label?: string;
}) => {
  const c = useChartTheme();
  const gradientId = useId().replace(/:/g, '');

  const geometry = useMemo(() => {
    const points = data
      .map((d) => d.close)
      .filter((n) => typeof n === 'number' && Number.isFinite(n));
    if (points.length < 2) return null;

    const min = Math.min(...points);
    const max = Math.max(...points);
    const span = max - min || 1;
    // 1.5px inset so the 2px stroke isn't clipped at the extremes.
    const inset = 2;
    const stepX = (width - inset * 2) / (points.length - 1);
    const toY = (v: number) =>
      height - inset - ((v - min) / span) * (height - inset * 2);

    const coords = points.map((v, i) => [inset + i * stepX, toY(v)] as const);
    const line = coords.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(2)} ${y.toFixed(2)}`).join(' ');
    const area = `${line} L${coords[coords.length - 1][0].toFixed(2)} ${height} L${coords[0][0].toFixed(2)} ${height} Z`;

    return {
      line,
      area,
      rising: points[points.length - 1] >= points[0],
      last: coords[coords.length - 1],
    };
  }, [data, width, height]);

  if (!geometry) {
    return (
      <div
        className={cn('rounded-sm bg-sunken', className)}
        style={{ width, height }}
        aria-hidden="true"
      />
    );
  }

  const stroke = color ?? (geometry.rising ? c['--up'] : c['--down']);

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={cn('overflow-visible', className)}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={stroke} stopOpacity={0.22} />
          <stop offset="100%" stopColor={stroke} stopOpacity={0} />
        </linearGradient>
      </defs>
      <path d={geometry.area} fill={`url(#${gradientId})`} />
      <path
        d={geometry.line}
        fill="none"
        stroke={stroke}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Endpoint marker with a surface ring, so the latest value reads first. */}
      <circle
        cx={geometry.last[0]}
        cy={geometry.last[1]}
        r={2.75}
        fill={stroke}
        stroke={c['--surface-card']}
        strokeWidth={1.5}
      />
    </svg>
  );
};
