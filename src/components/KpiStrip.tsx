import type { ReactNode } from 'react';

export interface KpiItem {
  k: string;
  v: ReactNode;
  d?: ReactNode;
}

/** KPI帯（ui-spec.md §2-6 `.kpis`） */
export function KpiStrip({ items }: { items: KpiItem[] }) {
  return (
    <div className="kpis">
      {items.map((it, i) => (
        <div className="kpi" key={i}>
          <div className="k">{it.k}</div>
          <div className="v num">{it.v}</div>
          {it.d && <div className="d">{it.d}</div>}
        </div>
      ))}
    </div>
  );
}
