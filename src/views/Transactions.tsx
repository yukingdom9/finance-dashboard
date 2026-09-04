import { useDataset } from '../state/DatasetContext';
import { useView } from '../state/ViewContext';
import { PageHead } from '../components/PageHead';
import { Panel } from '../components/Panel';
import { DataTable } from '../components/DataTable';
import type { Column } from '../components/DataTable';
import { spend } from '../analysis/filters';
import { categoryColor } from '../analysis/constants';
import { yen, dateFull } from '../format/number';
import type { Transaction } from '../types/transaction';

const LIMIT = 400; // data-spec.md §16

export function Transactions() {
  const { state: ds } = useDataset();
  const { state: vs, setTxQuery, setTxCategory, setTxPeriod, setTxSort, openModal } = useView();
  const idx = ds.index;

  const categories = [...new Set(idx.expenses.map((t) => t.cat))].sort();

  let rows = idx.expenses;
  if (vs.txCategory !== 'all') rows = rows.filter((t) => t.cat === vs.txCategory);
  if (vs.txPeriod !== 'all') {
    if (vs.txPeriod.includes('-')) rows = rows.filter((t) => t.ym === vs.txPeriod);
    else rows = rows.filter((t) => String(t.y) === vs.txPeriod);
  }
  if (vs.txQuery.trim()) {
    const q = vs.txQuery.trim();
    rows = rows.filter((t) => t.name.includes(q) || t.cat.includes(q) || t.sub.includes(q));
  }

  const { key: sortKey, dir } = vs.txSort;
  rows = rows.slice().sort((a, b) => {
    let cmp = 0;
    if (sortKey === 'date') cmp = a.date < b.date ? -1 : a.date > b.date ? 1 : 0;
    else if (sortKey === 'name') cmp = a.name.localeCompare(b.name, 'ja');
    else if (sortKey === 'cat') cmp = a.cat.localeCompare(b.cat, 'ja');
    else if (sortKey === 'amount') cmp = spend(a) - spend(b);
    return cmp * dir;
  });

  const columns: Column<Transaction>[] = [
    { key: 'date', header: '日付', render: (t) => dateFull(t.date), sortable: true, width: '100px' },
    {
      key: 'name',
      header: '内容',
      render: (t) => (
        <span className="tdflex">
          <span className="trunc">{t.name}</span>
          {idx.anomalyIds.has(t.id) && <span className="chip flag">目立つ支出</span>}
        </span>
      ),
      sortable: true,
    },
    {
      key: 'cat',
      header: 'カテゴリー',
      render: (t) => (
        <>
          <i className="swatch" style={{ background: categoryColor(t.cat), marginRight: 6 }} />
          {t.cat}
        </>
      ),
      sortable: true,
      width: '150px',
      hideSm: true,
    },
    { key: 'bank', header: '支払手段', render: (t) => t.bank, width: '140px', hideSm: true },
    { key: 'amount', header: '金額', render: (t) => yen(spend(t)), align: 'right', sortable: true, width: '110px' },
  ];

  return (
    <div className="page">
      <PageHead
        title="取引をさがす"
        sub="条件を指定して特定の取引を探します"
        right={
          <>
            <input type="search" placeholder="内容・カテゴリーで検索" value={vs.txQuery} onChange={(e) => setTxQuery(e.target.value)} />
            <select className="f" value={vs.txCategory} onChange={(e) => setTxCategory(e.target.value)}>
              <option value="all">すべてのカテゴリー</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <select className="f" value={vs.txPeriod} onChange={(e) => setTxPeriod(e.target.value)}>
              <option value="all">すべての期間</option>
              {idx.years
                .slice()
                .reverse()
                .map((y) => (
                  <optgroup key={y} label={`${y}年`}>
                    <option value={String(y)}>{y}年（全体）</option>
                    {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                      <option key={m} value={`${y}-${String(m).padStart(2, '0')}`}>
                        {y}年{m}月
                      </option>
                    ))}
                  </optgroup>
                ))}
            </select>
          </>
        }
      />
      <div className="wrap">
        <Panel tight>
          <DataTable
            columns={columns}
            rows={rows}
            rowKey={(t) => t.id}
            onRowClick={(t) => openModal({ type: 'transaction', id: t.id })}
            sortKey={sortKey}
            sortDir={dir}
            onSortChange={setTxSort}
            limit={LIMIT}
            scrollable
            footerNote={(_shown, total) => `${total.toLocaleString('ja-JP')}件のうち先頭${LIMIT}件を表示しています。絞り込むと全件が見えます。`}
          />
          {rows.length <= LIMIT && (
            <div className="tblfoot">{rows.length.toLocaleString('ja-JP')}件の合計 {yen(rows.reduce((s, t) => s + spend(t), 0))}</div>
          )}
        </Panel>
      </div>
    </div>
  );
}
