import { niceMax, axisTicks } from './scale';
import { man, yen, yenS } from '../format/number';
import { sum } from '../analysis/stats';

export interface CumulativeLinesProps {
  cur: number[];
  prev: number[];
  curLabel: string;
  prevLabel: string;
  w?: number;
  h?: number;
}

/** 今年ここまでの合計（累計の前年重ね）。features.md F-08 */
export function CumulativeLines({ cur, prev, curLabel, prevLabel, w = 520, h = 250 }: CumulativeLinesProps) {
  const pl = { l: 56, r: 16, t: 16, b: 26 };
  const iw = w - pl.l - pl.r;
  const ih = h - pl.t - pl.b;
  const max = niceMax(Math.max(...prev, ...cur) * 1.05);
  const X = (i: number) => pl.l + (iw * i) / 11;
  const Y = (v: number) => pl.t + ih - (v / max) * ih;

  const area =
    cur.map((v, i) => `${X(i)},${Y(v)}`).join(' ') +
    ' ' +
    prev
      .slice(0, cur.length)
      .reverse()
      .map((v, i) => `${X(cur.length - 1 - i)},${Y(v)}`)
      .join(' ');
  const li = cur.length - 1;
  const diff = cur[li] - prev[li];
  const bx = Math.min(w - pl.r - 168, Math.max(pl.l, X(li) - 82));
  const by = Math.max(pl.t, Y(cur[li]) - 58);

  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width: '100%', height: 'auto', display: 'block' }} role="img" aria-label={`${curLabel}と${prevLabel}の累計比較`}>
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
      <polygon points={area} fill={sum(cur) > sum(prev.slice(0, cur.length)) ? 'var(--up-soft)' : 'var(--down-soft)'} opacity={0.8} />
      <polyline
        points={prev.map((v, i) => `${X(i)},${Y(v)}`).join(' ')}
        fill="none"
        stroke="var(--ink-4)"
        strokeWidth={1.6}
        strokeDasharray="4 3"
      />
      <polyline points={cur.map((v, i) => `${X(i)},${Y(v)}`).join(' ')} fill="none" stroke="var(--ink)" strokeWidth={2.4} />
      <circle cx={X(li)} cy={Y(cur[li])} r={4} fill="var(--ink)" />
      <g transform={`translate(${bx},${by})`}>
        <rect width={164} height={38} rx={3} fill="var(--surface)" stroke="var(--line-strong)" />
        <text x={10} y={15} fontSize={10.5} fill="var(--ink-4)">
          {prevLabel}の同じ時点との差
        </text>
        <text x={10} y={30} fontSize={14} fontWeight={600} className="num" fill={diff > 0 ? 'var(--up)' : 'var(--down)'}>
          {diff > 0 ? '+' : ''}
          {yenS(diff)}
        </text>
      </g>
      {(['1月', '4月', '7月', '10月', '12月'] as const).map((l, k) => {
        const i = [0, 3, 6, 9, 11][k];
        return (
          <text key={l} x={X(i)} y={h - 8} textAnchor="middle" fontSize={10} fill="var(--ink-4)">
            {l}
          </text>
        );
      })}
      <text x={w - pl.r - 2} y={Y(prev[11]) - 7} textAnchor="end" fontSize={10.5} fill="var(--ink-4)">
        {prevLabel}
      </text>
    </svg>
  );
}
