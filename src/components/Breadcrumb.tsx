import type { ReactNode } from 'react';

export interface Crumb {
  label: string;
  onClick?: () => void;
}

export interface BreadcrumbProps {
  items: Crumb[];
  backAction?: { label: string; onClick: () => void };
  right?: ReactNode;
}

/** パンくず（ui-spec.md §3-4）。各段はクリックで戻れる。深い階層で「ひとつ戻る」を併置する。 */
export function Breadcrumb({ items, backAction, right }: BreadcrumbProps) {
  return (
    <div className="crumbs">
      {items.map((c, i) => (
        <span key={i} style={{ display: 'contents' }}>
          {i > 0 && <span className="sep">›</span>}
          {c.onClick ? (
            <button onClick={c.onClick}>{c.label}</button>
          ) : (
            <span className="cur">{c.label}</span>
          )}
        </span>
      ))}
      {backAction && (
        <button className="backbtn" style={{ marginLeft: 8 }} onClick={backAction.onClick}>
          {backAction.label}
        </button>
      )}
      {right}
    </div>
  );
}
