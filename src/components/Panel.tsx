import type { ReactNode } from 'react';

export interface PanelProps {
  title?: ReactNode;
  right?: ReactNode;
  tight?: boolean;
  quiet?: boolean;
  sticky?: boolean;
  children: ReactNode;
}

/** 見出し付きの枠（ui-spec.md §2-6）。 */
export function Panel({ title, right, tight, quiet, sticky, children }: PanelProps) {
  return (
    <div className={`panel${quiet ? ' quiet' : ''}${sticky ? ' stickycol' : ''}`} style={sticky ? { margin: 0 } : undefined}>
      {title != null && (
        <div className="panel-hd">
          <h2>{title}</h2>
          {right}
        </div>
      )}
      <div className={`panel-bd${tight ? ' tight' : ''}`}>{children}</div>
    </div>
  );
}
