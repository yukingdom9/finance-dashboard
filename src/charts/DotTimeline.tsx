export interface DotTimelineProps {
  months: string[];
  allMonths: string[];
  w?: number;
}

/** 固定費の発生タイムライン（直近24ヶ月のドット列）。features.md F-11 */
export function DotTimeline({ months, allMonths, w = 210 }: DotTimelineProps) {
  const r = 3.2;
  const gap = w / Math.max(1, allMonths.length);
  return (
    <svg viewBox={`0 0 ${w} 14`} width={w} height={14} aria-hidden="true">
      {allMonths.map((m, i) => (
        <circle key={m} cx={(gap * i + gap / 2).toFixed(1)} cy={7} r={r} fill={months.includes(m) ? 'var(--ink-2)' : 'var(--line)'} />
      ))}
    </svg>
  );
}
