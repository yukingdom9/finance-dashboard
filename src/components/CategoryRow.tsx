import type { ReactNode } from 'react';

export interface CategoryRowProps {
  swatchColor?: string;
  name: string;
  barPct: number;
  barColor: string;
  amt: ReactNode;
  sub?: ReactNode;
  chg?: ReactNode;
  selected?: boolean;
  onClick?: () => void;
}

/** カテゴリー1行（色・棒・金額・増減）。ui-spec.md §2-6 `.catrow` */
export function CategoryRow({ swatchColor, name, barPct, barColor, amt, sub, chg, selected, onClick }: CategoryRowProps) {
  return (
    <button className="catrow" aria-selected={selected} onClick={onClick}>
      <span className="nm">
        {swatchColor && <i className="swatch" style={{ background: swatchColor }} />}
        {name}
      </span>
      <span className="bartrack">
        <i style={{ width: `${Math.max(0, Math.min(100, barPct)).toFixed(1)}%`, background: barColor }} />
      </span>
      <span className="amt num">{amt}</span>
      {sub !== undefined && <span className="sub num">{sub}</span>}
      {chg !== undefined && <span className="chg num">{chg}</span>}
    </button>
  );
}
