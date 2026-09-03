import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';

export interface ModalProps {
  title: string;
  onClose: () => void;
  children: ReactNode;
}

/** モーダル（ui-spec.md §2-6, 第7部）。role="dialog" / aria-modal="true"。Escで閉じる。背景クリックで閉じる。 */
export function Modal({ title, onClose, children }: ModalProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    ref.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="modal-bg" onClick={onClose}>
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        ref={ref}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-hd">
          <h3>{title}</h3>
          <button className="backbtn" onClick={onClose} aria-label="閉じる">
            閉じる
          </button>
        </div>
        <div className="modal-bd">{children}</div>
      </div>
    </div>
  );
}
