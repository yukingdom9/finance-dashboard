import { man } from '../format/number';

export interface DivergingBarProps {
  label: string;
  d: number;
  maxAbs: number;
  onClick?: () => void;
}

/** 前年からの増減（1行分）。左右分岐の横棒。features.md F-07 */
export function DivergingBar({ label, d, maxAbs, onClick }: DivergingBarProps) {
  const w = maxAbs ? (Math.abs(d) / maxAbs) * 50 : 0;
  const pos = d > 0;
  return (
    <button className="divbar" onClick={onClick}>
      <span className="nm">{label}</span>
      <span className="divtrack">
        <span className="mid" />
        <i
          style={{
            position: 'absolute',
            top: 2,
            height: 12,
            borderRadius: 1,
            left: pos ? '50%' : undefined,
            right: pos ? undefined : '50%',
            width: `${w}%`,
            background: pos ? 'var(--up)' : 'var(--down)',
          }}
        />
      </span>
      <span className="amt num" style={{ color: pos ? 'var(--up)' : 'var(--down)' }}>
        {d > 0 ? '+' : '−'}
        {man(Math.abs(d))}
      </span>
    </button>
  );
}
