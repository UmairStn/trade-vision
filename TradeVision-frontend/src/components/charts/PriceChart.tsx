import { useId, useMemo, useState } from 'react';
import {
  Area,
  Bar,
  CartesianGrid,
  ComposedChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { ChartLine as AreaIcon, ChartBar, Table as TableIcon } from '@phosphor-icons/react';
import type { StockPrice } from '../../types/stock';
import { useChartTheme } from '../../hooks/useChartTheme';
import { usePrefersReducedMotion } from '../../hooks/usePrefersReducedMotion';
import {
  formatCompact,
  formatDate,
  formatDateShort,
  formatInt,
  formatPrice,
} from '../../lib/format';
import { cn } from '../../lib/cn';
import { SegmentedControl } from '../ui/SegmentedControl';
import { EmptyState } from '../ui/EmptyState';
import { Skeleton } from '../ui/Skeleton';
import { DataTable } from '../ui/DataTable';
import type { Column } from '../ui/DataTable';

/**
 * Price history.
 *
 * Replaces LiveChart, which drew *bars* of closing price against a Y domain of
 * `[min - pad, max + pad]`. A bar encodes magnitude by its length from zero, so
 * on a floating baseline a Rs 100 stock and a Rs 102 stock rendered as bars of
 * wildly different heights — the chart exaggerated every move. Two fixes:
 *
 *   - Change-over-time with one series is a **line/area**, whose vertical
 *     position (not length) carries the value, so a padded axis is legitimate.
 *   - The axis floor is stated in words under the plot, so a padded baseline
 *     can't be mistaken for zero.
 *
 * Volume sits in its own panel below rather than on a second Y axis: two scales
 * on one plot invent a correlation that isn't in the data. The panels share
 * `syncId`, so one hover crosshairs both.
 */

export type ChartView = 'area' | 'candle' | 'table';

interface PriceChartProps {
  data: StockPrice[];
  /** Shown in the tooltip header and the table caption. */
  ticker?: string;
  loading?: boolean;
  height?: number;
  showVolume?: boolean;
  /** Hide the area/candle/table switch (e.g. the compact hero chart). */
  showViewToggle?: boolean;
  defaultView?: ChartView;
  className?: string;
}

interface CandleShapeProps {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  payload?: StockPrice;
  upColor?: string;
  downColor?: string;
}

/**
 * One candle. Recharts hands the shape the pixel box of the `[low, high]` range
 * bar, so open/close are placed by interpolating inside that box — no access to
 * the axis scale required.
 */
const Candle = ({
  x = 0,
  y = 0,
  width = 0,
  height = 0,
  payload,
  upColor = '#047857',
  downColor = '#b91c1c',
}: CandleShapeProps) => {
  if (!payload) return null;
  const { open, close, high, low } = payload;
  const span = high - low;
  const priceToY = (price: number) =>
    span <= 0 ? y + height / 2 : y + ((high - price) / span) * height;

  const rising = close >= open;
  const color = rising ? upColor : downColor;
  const bodyTop = priceToY(Math.max(open, close));
  // A doji (open === close) still needs to be visible, hence the 1px floor.
  const bodyHeight = Math.max(priceToY(Math.min(open, close)) - bodyTop, 1);
  const centre = x + width / 2;
  // 2px of surface between neighbours instead of a stroke around each candle.
  const bodyWidth = Math.max(width - 2, 1);

  return (
    <g>
      <line
        x1={centre}
        x2={centre}
        y1={y}
        y2={y + height}
        stroke={color}
        strokeWidth={1.25}
      />
      <rect
        x={centre - bodyWidth / 2}
        y={bodyTop}
        width={bodyWidth}
        height={bodyHeight}
        fill={color}
        rx={1}
      />
    </g>
  );
};

const ChartTooltip = ({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { payload?: StockPrice }[];
}) => {
  const point = payload?.[0]?.payload;
  if (!active || !point) return null;

  const rising = point.close >= point.open;
  const rows: [string, string][] = [
    ['Open', formatPrice(point.open)],
    ['High', formatPrice(point.high)],
    ['Low', formatPrice(point.low)],
    ['Close', formatPrice(point.close)],
    ['Volume', formatInt(point.volume)],
  ];

  return (
    <div className="min-w-44 rounded-md border border-line bg-card px-3 py-2 elevated-pop">
      <p className="mb-1.5 border-b border-line pb-1.5 text-sm font-semibold text-ink">
        {formatDate(point.timestamp)}
      </p>
      <dl className="space-y-0.5">
        {rows.map(([label, value]) => (
          <div key={label} className="flex items-baseline justify-between gap-6">
            <dt className="text-sm text-ink-muted">{label}</dt>
            <dd
              className={cn(
                'text-sm font-medium tabular-nums',
                label === 'Close' ? (rising ? 'text-up' : 'text-down') : 'text-ink-secondary',
              )}
            >
              {value}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
};

const tableColumns: Column<StockPrice>[] = [
  {
    id: 'date',
    header: 'Date',
    primary: true,
    mobile: 'title',
    cell: (r) => <span className="font-medium text-ink">{formatDate(r.timestamp)}</span>,
    sortBy: (r) => new Date(r.timestamp).getTime(),
  },
  { id: 'open', header: 'Open', numeric: true, cell: (r) => formatPrice(r.open), sortBy: (r) => r.open },
  { id: 'high', header: 'High', numeric: true, cell: (r) => formatPrice(r.high), sortBy: (r) => r.high },
  { id: 'low', header: 'Low', numeric: true, cell: (r) => formatPrice(r.low), sortBy: (r) => r.low },
  {
    id: 'close',
    header: 'Close',
    numeric: true,
    mobile: 'value',
    cell: (r) => <span className="font-semibold text-ink">{formatPrice(r.close)}</span>,
    sortBy: (r) => r.close,
  },
  {
    id: 'volume',
    header: 'Volume',
    numeric: true,
    cell: (r) => formatInt(r.volume),
    sortBy: (r) => r.volume,
  },
];

export const PriceChart = ({
  data,
  ticker,
  loading = false,
  height = 320,
  showVolume = true,
  showViewToggle = true,
  defaultView = 'area',
  className,
}: PriceChartProps) => {
  const c = useChartTheme();
  const reducedMotion = usePrefersReducedMotion();
  const [view, setView] = useState<ChartView>(defaultView);
  const gradientId = useId().replace(/:/g, '');

  const { rows, domain, axisFloor } = useMemo(() => {
    if (data.length === 0) {
      return { rows: [], domain: [0, 1] as [number, number], axisFloor: 0 };
    }
    const lows = data.map((d) => (Number.isFinite(d.low) ? d.low : d.close));
    const highs = data.map((d) => (Number.isFinite(d.high) ? d.high : d.close));
    const min = Math.min(...lows);
    const max = Math.max(...highs);
    // 8% of the visible range, or a rupee if the series is perfectly flat.
    const pad = max === min ? Math.max(max * 0.01, 1) : (max - min) * 0.08;
    const floor = Math.max(min - pad, 0);
    return {
      // `range` backs the candle shape; Recharts maps a [min, max] value to the
      // bar's pixel box, which is what Candle interpolates within.
      rows: data.map((d) => ({ ...d, range: [d.low, d.high] as [number, number] })),
      domain: [floor, max + pad] as [number, number],
      axisFloor: floor,
    };
  }, [data]);

  const animation = reducedMotion ? 0 : 700;

  const axisProps = {
    stroke: c['--chart-axis'],
    tick: { fill: c['--chart-axis'], fontSize: 11 },
    tickLine: false,
    axisLine: false,
  } as const;

  if (loading) {
    return (
      <div className={cn('space-y-3', className)}>
        <Skeleton className="h-8 w-48" />
        <Skeleton style={{ height }} className="w-full" />
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <EmptyState
        icon={<AreaIcon className="h-6 w-6" aria-hidden="true" />}
        title="No price history"
        description="The backend returned no bars for this symbol and range. Yahoo has stopped updating some CSE tickers."
        className={className}
      />
    );
  }

  return (
    <div className={className}>
      {showViewToggle && (
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <SegmentedControl
            label="Chart type"
            size="sm"
            value={view}
            onChange={setView}
            options={[
              { value: 'area', label: 'Area', icon: <AreaIcon className="h-3.5 w-3.5" aria-hidden="true" /> },
              { value: 'candle', label: 'Candles', icon: <ChartBar className="h-3.5 w-3.5" aria-hidden="true" /> },
              { value: 'table', label: 'Table', icon: <TableIcon className="h-3.5 w-3.5" aria-hidden="true" /> },
            ]}
          />
          <p className="text-sm text-ink-muted tabular-nums">
            {data.length} trading {data.length === 1 ? 'day' : 'days'}
          </p>
        </div>
      )}

      {view === 'table' ? (
        // The table twin: every plotted value is readable without hovering, which
        // a tooltip alone can't offer a keyboard or touch user.
        <div className="-mx-5 overflow-hidden border-y border-line">
          <DataTable
            columns={tableColumns}
            rows={data}
            getRowKey={(r) => r.timestamp}
            defaultSort={{ id: 'date', dir: 'desc' }}
            caption={`Daily open, high, low, close and volume${ticker ? ` for ${ticker}` : ''}`}
            maxHeight={`${height + (showVolume ? 96 : 0)}px`}
          />
        </div>
      ) : (
        <>
          <div style={{ height }} className="w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={rows}
                syncId="price-history"
                margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
              >
                <defs>
                  <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={c['--brand']} stopOpacity={0.18} />
                    <stop offset="100%" stopColor={c['--brand']} stopOpacity={0} />
                  </linearGradient>
                </defs>

                {/* Solid hairlines, horizontal only. A dashed grid reads as a
                    threshold or a projection when it's just a grid. */}
                <CartesianGrid
                  vertical={false}
                  stroke={c['--chart-grid']}
                  strokeWidth={1}
                />
                <XAxis
                  dataKey="timestamp"
                  tickFormatter={formatDateShort}
                  tickMargin={8}
                  minTickGap={28}
                  hide={showVolume}
                  {...axisProps}
                />
                <YAxis
                  domain={domain}
                  width={64}
                  tickFormatter={(v: number) => formatPrice(v)}
                  {...axisProps}
                />
                <Tooltip
                  content={<ChartTooltip />}
                  cursor={{ stroke: c['--chart-baseline'], strokeWidth: 1 }}
                />

                {view === 'area' ? (
                  <Area
                    type="monotone"
                    dataKey="close"
                    stroke={c['--brand']}
                    strokeWidth={2}
                    fill={`url(#${gradientId})`}
                    animationDuration={animation}
                    // 9px marker with a 2px surface ring, so it stays legible
                    // where the line crosses the grid.
                    activeDot={{
                      r: 4.5,
                      fill: c['--brand'],
                      stroke: c['--surface-card'],
                      strokeWidth: 2,
                    }}
                    dot={false}
                  />
                ) : (
                  <Bar
                    dataKey="range"
                    animationDuration={animation}
                    shape={
                      <Candle upColor={c['--up']} downColor={c['--down']} />
                    }
                    // Recharts still draws a legend/tooltip swatch from `fill`.
                    fill={c['--brand']}
                  />
                )}
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          {showVolume && (
            <div className="h-24 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart
                  data={rows}
                  syncId="price-history"
                  margin={{ top: 4, right: 8, left: 0, bottom: 0 }}
                >
                  <CartesianGrid vertical={false} stroke={c['--chart-grid']} />
                  <XAxis
                    dataKey="timestamp"
                    tickFormatter={formatDateShort}
                    tickMargin={8}
                    minTickGap={28}
                    {...axisProps}
                  />
                  {/* Same width as the price axis so the two panels line up. */}
                  <YAxis
                    width={64}
                    tickCount={3}
                    tickFormatter={(v: number) => formatCompact(v, 0)}
                    {...axisProps}
                  />
                  <Tooltip content={<ChartTooltip />} cursor={false} />
                  {/* One series, one colour. Colouring volume by direction would
                      re-encode information the price panel already carries. */}
                  <Bar
                    dataKey="volume"
                    fill={c['--brand']}
                    fillOpacity={0.32}
                    animationDuration={animation}
                    radius={[2, 2, 0, 0]}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          )}

          <p className="mt-2 text-xs text-ink-muted">
            {showVolume ? 'Volume in the lower panel. ' : ''}
            Price axis starts at Rs {formatPrice(axisFloor)}, not zero — the plot
            shows the traded range, not magnitude from zero.
          </p>
        </>
      )}
    </div>
  );
};
