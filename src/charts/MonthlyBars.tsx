import { niceMax, axisTicks } from './scale';
import { man, yen } from '../format/number';

export interface MonthlyBarsProps {
  data: number[];
  prior?: number[] | null;
  labels: string[];
  w?: number;
  h?: number;
  highlight?: number[];
  partial?: number[];
  onBarClick?: (index: number) => void;
}

/** カテゴリー内の月次、支払先の月次（単系列の推移＋前年点線）。architecture.md §10-3 */
export function MonthlyBars({
  data,
  prior = null,
  labels,
  w = 760,
  h = 250,
  highlight = [],
  partial = [],
  onBarClick,
}: MonthlyBarsProps) {
  const pl = { l: 52, r: 14, t: 14, b: 26 };
  const iw = w - pl.l - pl.r;
  const ih = h - pl.t - pl.b;
  const max = niceMax(Math.max(...data, ...(prior ?? [0])) * 1.08);
  const bw = iw / data.length;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width: '100%', height: 'auto', display: 'block' }} role="img">
      {axisTicks(max).map((t, i) => {
        const y = pl.t + ih - (t / max) * ih;
        return (
          <g key={i}>
            <line x1={pl.l} x2={w - pl.r} y1={y} y2={y} stroke="var(--line)" strokeWidth={1} />
            <text x={pl.l - 8} y={y + 4} textAnchor="end" fontSize={10} fill="var(--ink-4)" className="num">
              {man(t)}
            </text>
          </g>
        );
      })}
      {data.map((v, i) => {
        const bh = Math.max(0, (v / max) * ih);
        const x = pl.l + i * bw + bw * 0.2;
        const y = pl.t + ih - bh;
        const isP = partial.includes(i);
        const fill = highlight.includes(i) ? 'var(--flag)' : 'var(--ink-2)';
        return (
          <rect
            key={i}
            x={x}
            y={y}
            width={bw * 0.6}
            height={bh}
            fill={fill}
            opacity={isP ? 0.35 : 1}
            rx={1}
            style={onBarClick ? { cursor: 'pointer' } : undefined}
            onClick={onBarClick ? () => onBarClick(i) : undefined}
          >
            <title>
              {labels[i]} {yen(v)}
              {isP ? '（集計途中）' : ''}
            </title>
          </rect>
        );
      })}
      {prior && (
        <>
          <polyline
            points={prior.map((v, i) => `${pl.l + i * bw + bw / 2},${pl.t + ih - (v / max) * ih}`).join(' ')}
            fill="none"
            stroke="var(--ink-4)"
            strokeWidth={1.5}
            strokeDasharray="4 3"
          />
          {prior.map((v, i) => (
            <circle
              key={i}
              cx={pl.l + i * bw + bw / 2}
              cy={pl.t + ih - (v / max) * ih}
              r={2.5}
              fill="var(--surface)"
              stroke="var(--ink-4)"
              strokeWidth={1.2}
            >
              <title>
                前年 {labels[i]} {yen(v)}
              </title>
            </circle>
          ))}
        </>
      )}
      {labels.map((l, i) => {
        if (data.length > 12 && i % 2) return null;
        return (
          <text key={i} x={pl.l + i * bw + bw / 2} y={h - 8} textAnchor="middle" fontSize={10} fill="var(--ink-4)">
            {l}
          </text>
        );
      })}
    </svg>
  );
}
