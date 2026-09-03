import type { ReactNode } from 'react';

export interface ChipProps {
  children: ReactNode;
  tone?: 'default' | 'flag' | 'on' | 'off' | 'new';
  onClick?: () => void;
  pressed?: boolean;
}

/** チップ（丸型、11.5px）。ui-spec.md §2-6 */
export function Chip({ children, tone = 'default', onClick, pressed }: ChipProps) {
  const cls = `chip${tone !== 'default' ? ' ' + tone : ''}`;
  if (onClick) {
    return (
      <button
        className={cls}
        onClick={onClick}
        style={pressed ? { background: 'var(--ink)', color: '#fff', borderColor: 'var(--ink)' } : undefined}
      >
        {children}
      </button>
    );
  }
  return <span className={cls}>{children}</span>;
}
