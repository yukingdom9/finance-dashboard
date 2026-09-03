import { niceMax, axisTicks } from './scale';
import { man, yen } from '../format/number';

export interface ScatterPoint {
  t: number; // timestamp
  v: number;
  label: string;
  big?: boolean;
  col?: string;
  id?: string;
}
export interface ScatterProps {
  points: ScatterPoint[];
  w?: number;
  h?: number;
  onPointClick?: (id: string) => void;
}

/** すべての支出のちらばり（異常値の散布図）。features.md F-12 */
export function Scatter({ points, w = 760, h = 290, onPointClick }: ScatterProps) {
  const pl = { l: 56, r: 14, t: 14, b: 28 };
  const iw = w - pl.l - pl.r;
  const ih = h - pl.t - pl.b;
  const max = niceMax(Math.max(1, ...points.map((p) => p.v)) * 1.08);
  const t0 = points.length ? Math.min(...points.map((p) => p.t)) : 0;
  const t1 = points.length ? Math.max(...points.map((p) => p.t)) : 1;
  const X = (t: number) => pl.l + iw * ((t - t0) / Math.max(1, t1 - t0));
  const Y = (v: number) => pl.t + ih - (v / max) * ih;
  const years = [...new Set(points.map((p) => new Date(p.t).getFullYear()))].sort();

  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width: '100%', height: 'auto', display: 'block' }} role="img" aria-label="支出の散布図">
      {axisTicks(max).map((t, i) => {
        const y = Y(t);
        return (
          <g key={i}>
            <line x1={pl.l} x2={w - pl.r} y1={y} y2={y} stroke="var(--line)" />
            <text x={pl.l - 8} y={y + 4} textAnchor="end" fontSize={10} fill="var(--ink-4)" className="num">
              {man(t)}
            </text>
          </g>
        );
      })}
      {points.map((p, i) => (
        <circle
          key={i}
          cx={X(p.t)}
          cy={Y(p.v)}
          r={p.big ? 6 : 3}
          fill={p.big ? 'var(--flag)' : (p.col ?? 'var(--ink-3)')}
          opacity={p.big ? 0.95 : 0.42}
          stroke={p.big ? '#fff' : 'none'}
          strokeWidth={1.2}
          style={p.big && onPointClick && p.id ? { cursor: 'pointer' } : undefined}
          onClick={p.big && onPointClick && p.id ? () => onPointClick(p.id!) : undefined}
        >
          <title>
            {p.label} {yen(p.v)}
          </title>
        </circle>
      ))}
      {years.map((y) => {
        const t = new Date(y, 0, 1).getTime();
        if (t < t0) return null;
        return (
          <g key={y}>
            <line x1={X(t)} x2={X(t)} y1={pl.t} y2={pl.t + ih} stroke="var(--line-strong)" strokeDasharray="3 3" />
            <text x={X(t) + 5} y={h - 9} fontSize={10} fill="var(--ink-4)">
              {y}年
            </text>
          </g>
        );
      })}
    </svg>
  );
}
