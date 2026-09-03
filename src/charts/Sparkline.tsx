export interface SparklineProps {
  values: number[];
  w?: number;
  h?: number;
  color?: string;
}

/** 表の行内の推移（一覧性を損なわずに傾向を添える）。architecture.md §10-3 */
export function Sparkline({ values, w = 92, h = 22, color = 'var(--ink-3)' }: SparklineProps) {
  if (!values.length) return null;
  const max = Math.max(...values, 1);
  const pts = values
    .map((v, i) => `${((w * i) / Math.max(1, values.length - 1)).toFixed(1)},${(h - 2 - (v / max) * (h - 4)).toFixed(1)}`)
    .join(' ');
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width={w} height={h} aria-hidden="true">
      <polyline points={pts} fill="none" stroke={color} strokeWidth={1.4} />
    </svg>
  );
}
