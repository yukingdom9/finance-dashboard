import type { ReactNode } from 'react';

export interface EmptyStateProps {
  title: string;
  desc?: string;
  action?: ReactNode;
}

/** 空状態（ui-spec.md 第5部 5-1）。太字の状況説明＋補足＋（あれば）次の操作の3要素。 */
export function EmptyState({ title, desc, action }: EmptyStateProps) {
  return (
    <div className="empty">
      <b>{title}</b>
      {desc}
      {action && <div style={{ marginTop: 16 }}>{action}</div>}
    </div>
  );
}
