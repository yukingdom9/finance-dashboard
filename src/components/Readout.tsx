import type { ReactNode } from 'react';

export interface ReadoutCellProps {
  label: string;
  value: ReactNode;
  delta?: ReactNode;
  sub?: ReactNode;
  splitBar?: ReactNode;
}

export function ReadoutCell({ label, value, delta, sub, splitBar }: ReadoutCellProps) {
  return (
    <div className="ro">
      <div className="ro-label">{label}</div>
      <div className="ro-value num">{value}</div>
      {delta}
      {splitBar}
      {sub && <div className="ro-sub">{sub}</div>}
    </div>
  );
}

export interface ReadoutProps {
  children: ReactNode;
  foot?: ReactNode;
}

/** 暗色帯の3つの数字（ui-spec.md V-01 ZONE1）。画面内で唯一の濃色面とし視線を集める。 */
export function Readout({ children, foot }: ReadoutProps) {
  return (
    <div className="readout">
      <div className="readout-grid">{children}</div>
      {foot && <div className="readout-foot">{foot}</div>}
    </div>
  );
}
