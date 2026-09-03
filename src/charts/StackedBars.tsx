import { niceMax, axisTicks } from './scale';
import { man, yen } from '../format/number';
import { sum } from '../analysis/stats';

export interface StackedBarsProps {
  series: number[][];
  labels: string[];
  colors: string[];
  names: string[];
  prior?: number[] | null;
  priorLabel?: string;
  w?: number;
  h?: number;
  partial?: number[];
}

/** 月ごとの支出（暮らし/臨時、削りにくい/選べる）＋前年線。features.md F-13 */
export function StackedBars({
  series,
  labels,
  colors,
  names,
  prior = null,
  priorLabel = '前年',
  w = 760,
  h = 250,
  partial = [],
}: StackedBarsProps) {
  const pl = { l: 52, r: 14, t: 14, b: 26 };
  const iw = w - pl.l - pl.r;
  const ih = h - pl.t - pl.b;
  const totals = labels.map((_, i) => sum(series, (s) => s[i]));
  const max = niceMax(Math.max(...totals, ...(prior ?? [0])) * 1.08);
  const bw = iw / labels.length;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width: '100%', height: 'auto', display: 'block' }} role="img">
      {axisTicks(max).map((t, i) => {
        const y = pl.t + ih - (t / max) * ih;
        return (
          <g key={i}>
            <line x1={pl.l} x2={w - pl.r} y1={y} y2={y} stroke="var(--line)" />
            <text x={pl.l - 8} y={y + 4} textAnchor="end" fontSize={10} fill="var(--ink-4)" className="num">
              {man(t)}
            </text>
          </g>
        );
      })}
      {labels.map((l, i) => {
        let acc = 0;
        const isP = partial.includes(i);
        const bars = series.map((ser, k) => {
          const bh = (ser[i] / max) * ih;
          if (bh <= 0) return null;
          const y = pl.t + ih - acc - bh;
          acc += bh;
          return (
            <rect
              key={k}
              x={pl.l + i * bw + bw * 0.18}
              y={y}
              width={bw * 0.64}
              height={bh}
              fill={colors[k]}
              opacity={isP ? 0.4 : 1}
              rx={1}
            >
              <title>
                {l} {names[k]} {yen(ser[i])}
                {isP ? '（集計途中）' : ''}
              </title>
            </rect>
          );
        });
        return (
          <g key={i}>
            {bars}
            {(labels.length <= 12 || !(i % 2)) && (
              <text x={pl.l + i * bw + bw / 2} y={h - 8} textAnchor="middle" fontSize={10} fill="var(--ink-4)">
                {l}
              </text>
            )}
          </g>
        );
      })}
      {prior && (
        <>
          <polyline
            points={prior.map((v, i) => `${pl.l + i * bw + bw / 2},${pl.t + ih - (v / max) * ih}`).join(' ')}
            fill="none"
            stroke="var(--ink-3)"
            strokeWidth={1.6}
            strokeDasharray="5 3"
          />
          {prior.map((v, i) => (
            <circle
              key={i}
              cx={pl.l + i * bw + bw / 2}
              cy={pl.t + ih - (v / max) * ih}
              r={2.6}
              fill="var(--surface)"
              stroke="var(--ink-3)"
              strokeWidth={1.3}
            >
              <title>
                {priorLabel} {labels[i]} {yen(v)}
              </title>
            </circle>
          ))}
        </>
      )}
    </svg>
  );
}
