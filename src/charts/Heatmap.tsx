import { man, yen } from '../format/number';

export interface HeatmapProps {
  rows: string[];
  cols: string[];
  values: (number | null)[][];
  w?: number;
  cell?: number;
}

/** 季節性ヒートマップ（年×月）。features.md F-17 */
export function Heatmap({ rows, cols, values, w = 760, cell = 30 }: HeatmapProps) {
  const lw = 54;
  const ch = cell;
  const h = rows.length * ch + 30;
  const flat = values.flat().filter((v): v is number => v != null && v > 0);
  const lo = flat.length ? Math.min(...flat) : 0;
  const hi = flat.length ? Math.max(...flat) : 0;
  const cw = (w - lw - 8) / cols.length;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width: '100%', height: 'auto', display: 'block' }} role="img" aria-label="年×月の支出ヒートマップ">
      {cols.map((c, j) => (
        <text key={c} x={lw + cw * j + cw / 2} y={14} textAnchor="middle" fontSize={10.5} fill="var(--ink-4)">
          {c}
        </text>
      ))}
      {rows.map((r, i) => (
        <g key={r}>
          <text x={lw - 10} y={24 + i * ch + ch / 2 + 4} textAnchor="end" fontSize={11.5} fill="var(--ink-3)">
            {r}
          </text>
          {cols.map((c, j) => {
            const v = values[i][j];
            if (v == null) {
              return (
                <rect
                  key={c}
                  x={lw + cw * j + 1}
                  y={24 + i * ch + 1}
                  width={cw - 2}
                  height={ch - 2}
                  fill="var(--surface-2)"
                  rx={2}
                />
              );
            }
            const t = hi > lo ? (v - lo) / (hi - lo) : 0.5;
            const col = `rgb(${Math.round(238 - 140 * t)},${Math.round(243 - 120 * t)},${Math.round(248 - 90 * t)})`;
            return (
              <g key={c}>
                <rect x={lw + cw * j + 1} y={24 + i * ch + 1} width={cw - 2} height={ch - 2} fill={col} rx={2}>
                  <title>
                    {r} {c} {yen(v)}
                  </title>
                </rect>
                {cw > 44 && (
                  <text
                    x={lw + cw * j + cw / 2}
                    y={24 + i * ch + ch / 2 + 4}
                    textAnchor="middle"
                    fontSize={10}
                    className="num"
                    fill={t > 0.6 ? '#fff' : 'var(--ink-3)'}
                  >
                    {man(v)}
                  </text>
                )}
              </g>
            );
          })}
        </g>
      ))}
    </svg>
  );
}
