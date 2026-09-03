import type { ReactNode } from 'react';

export interface Column<T> {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
  align?: 'left' | 'right';
  width?: string;
  hideSm?: boolean;
  sortable?: boolean;
}

export interface DataTableProps<T> {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  onRowClick?: (row: T) => void;
  sortKey?: string;
  sortDir?: 1 | -1;
  onSortChange?: (key: string) => void;
  /** 表示件数の上限（data-spec.md §16）。指定時、rows を先頭からこの件数で打ち切る */
  limit?: number;
  /** 打ち切り時の脚注文言を組み立てる。省略時は既定文言を使う */
  footerNote?: (shown: number, total: number) => string;
  scrollable?: boolean;
  emptyText?: string;
}

/** 共通テーブル（並べ替え・上限・脚注）。architecture.md ディレクトリ構成 components/DataTable.tsx */
export function DataTable<T>({
  columns,
  rows,
  rowKey,
  onRowClick,
  sortKey,
  sortDir,
  onSortChange,
  limit,
  footerNote,
  scrollable,
  emptyText,
}: DataTableProps<T>) {
  const total = rows.length;
  const shown = limit != null ? rows.slice(0, limit) : rows;
  const truncated = limit != null && total > limit;

  // table-layout:fixed の列幅指定は、合計がコンテナ幅を超えると幅未指定の列が0pxに潰れる
  // （900px前後の狭い画面で発生する）。min-width を与えて .tblwrap の横スクロールで吸収する。
  const minWidth = columns.reduce((s, c) => s + (c.width ? parseInt(c.width, 10) || 0 : 200), 0);

  const table = (
    <table className="tbl fx" style={{ minWidth }}>
      {columns.some((c) => c.width) && (
        <colgroup>
          {columns.map((c) => (
            <col key={c.key} style={c.width ? { width: c.width } : undefined} />
          ))}
        </colgroup>
      )}
      <thead>
        <tr>
          {columns.map((c) => (
            <th
              key={c.key}
              className={`${c.align === 'right' ? 'r ' : ''}${c.sortable ? 's ' : ''}${c.hideSm ? 'hide-sm ' : ''}`.trim()}
              onClick={c.sortable && onSortChange ? () => onSortChange(c.key) : undefined}
            >
              {c.header}
              {c.sortable && sortKey === c.key ? (sortDir === 1 ? ' ▲' : ' ▼') : ''}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {shown.length === 0 && (
          <tr>
            <td colSpan={columns.length} style={{ color: 'var(--ink-4)', textAlign: 'center', padding: '20px 10px' }}>
              {emptyText ?? 'データがありません'}
            </td>
          </tr>
        )}
        {shown.map((row) => (
          <tr key={rowKey(row)} className={onRowClick ? 'clickable' : undefined} onClick={onRowClick ? () => onRowClick(row) : undefined}>
            {columns.map((c) => (
              <td key={c.key} className={`${c.align === 'right' ? 'r ' : ''}${c.hideSm ? 'hide-sm ' : ''}`.trim()}>
                {c.render(row)}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );

  const wrapped = <div className="tblwrap">{table}</div>;

  return (
    <div>
      {scrollable ? <div className="scrollbox">{wrapped}</div> : wrapped}
      {truncated && (
        <div className="tblfoot">
          {footerNote ? footerNote(shown.length, total) : `${total.toLocaleString('ja-JP')}件のうち${shown.length}件を表示しています。`}
        </div>
      )}
    </div>
  );
}
