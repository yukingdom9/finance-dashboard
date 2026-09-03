import { useMemo, useState } from 'react';
import { useDataset } from '../state/DatasetContext';
import { useView } from '../state/ViewContext';
import { PageHead } from '../components/PageHead';
import { Panel } from '../components/Panel';
import { Segmented } from '../components/Segmented';
import { Sparkline } from '../charts/Sparkline';
import { merchantStats } from '../analysis/merchant';
import { yen, monthLabels } from '../format/number';

const LIMIT = 40; // data-spec.md §16

export function Merchants() {
  const { state: ds, updateAliases } = useDataset();
  const { state: vs, setMerchantSort, setMerchantQuery, selectMerchant, goToView, openModal } = useView();
  const idx = ds.index;
  const y = vs.year;
  const [selected, setSelected] = useState<Set<string>>(new Set());
  if (y == null) return <div className="page" />;

  const yearTx = idx.expenses.filter((t) => t.y === y);
  let stats = merchantStats(yearTx, ds.aliases);
  if (vs.merchantQuery.trim()) {
    const q = vs.merchantQuery.trim();
    stats = stats.filter((s) => s.label.includes(q));
  }
  stats = stats.slice().sort((a, b) => {
    if (vs.merchantSort === 'count') return b.n - a.n;
    if (vs.merchantSort === 'avg') return b.total / b.n - a.total / a.n;
    return b.total - a.total;
  });
  const total = stats.length;
  const shown = stats.slice(0, LIMIT);
  const maxTotal = Math.max(...shown.map((s) => s.total), 1);

  const mergedGroups = useMemo(() => {
    const byTarget = new Map<string, string[]>();
    for (const [src, target] of Object.entries(ds.aliases.merge)) {
      if (!byTarget.has(target)) byTarget.set(target, []);
      byTarget.get(target)!.push(src);
    }
    return [...byTarget.entries()];
  }, [ds.aliases.merge]);

  const toggle = (key: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const unmerge = async (src: string, target: string) => {
    const merge = { ...ds.aliases.merge };
    delete merge[src];
    const stillUsed = Object.values(merge).includes(target);
    const labels = { ...ds.aliases.labels };
    if (!stillUsed) delete labels[target];
    await updateAliases({ merge, labels });
  };

  return (
    <div className="page">
      <PageHead
        title="お店・サービス別"
        sub="実際にどこにお金を落としているか、何回通っているかを知ります"
        right={
          <>
            <input
              type="search"
              placeholder="お店・サービスを検索"
              value={vs.merchantQuery}
              onChange={(e) => setMerchantQuery(e.target.value)}
            />
            <Segmented
              ariaLabel="並べ替え"
              value={vs.merchantSort}
              onChange={setMerchantSort}
              options={[
                { value: 'total', label: '金額順' },
                { value: 'count', label: '回数順' },
                { value: 'avg', label: '1回あたり' },
              ]}
            />
          </>
        }
      />
      <div className="wrap">
        {selected.size >= 2 && (
          <div className="story" style={{ borderLeftColor: 'var(--focus)' }}>
            <div className="story-foot" style={{ borderTop: 'none', paddingTop: 0 }}>
              <span>選択した{selected.size}件を同じお店としてまとめます。</span>
              <button className="linkish" onClick={() => openModal({ type: 'mergeMerchants', keys: [...selected] })}>
                同じお店としてまとめる
              </button>
            </div>
          </div>
        )}

        <Panel tight>
          <div className="tblwrap">
          <table className="tbl fx" style={{ minWidth: 800 }}>
            <colgroup>
              <col style={{ width: '30px' }} />
              <col style={{ width: '220px' }} />
              <col style={{ width: '120px' }} />
              <col style={{ width: '120px' }} />
              <col style={{ width: '90px' }} />
              <col style={{ width: '110px' }} />
              <col style={{ width: '100px' }} />
            </colgroup>
            <thead>
              <tr>
                <th></th>
                <th>お店・サービス</th>
                <th>カテゴリー</th>
                <th className="r">年間</th>
                <th className="r">回数</th>
                <th className="r">1回あたり</th>
                <th>月次</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((s) => (
                <tr key={s.key}>
                  <td>
                    <input type="checkbox" checked={selected.has(s.key)} onChange={() => toggle(s.key)} aria-label={`${s.label}を選択`} />
                  </td>
                  <td className="trunc clickable" onClick={() => { selectMerchant(s.key); goToView('merchantDetail'); }}>
                    {s.label}
                    {idx.fixedKeys.has(s.key) && (
                      <span className="chip on" style={{ marginLeft: 6 }}>
                        固定費
                      </span>
                    )}
                  </td>
                  <td>{s.cat}</td>
                  <td className="r num">{yen(s.total)}</td>
                  <td className="r num">{s.n}</td>
                  <td className="r num">{yen(s.total / s.n)}</td>
                  <td>
                    <Sparkline values={monthLabels().map((_, i) => s.byM[`${y}-${String(i + 1).padStart(2, '0')}`] ?? 0)} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
          <div className="tblfoot">
            {total > LIMIT ? `${total.toLocaleString('ja-JP')}件のうち上位${LIMIT}件を表示しています。` : `${total}件を表示しています。`}
          </div>
        </Panel>

        {mergedGroups.length > 0 && (
          <Panel title="まとめた支払先" tight>
            {mergedGroups.map(([target, sources]) => (
              <div key={target} style={{ padding: '8px 0', borderBottom: '1px solid var(--line)' }}>
                <b style={{ fontSize: 13 }}>{ds.aliases.labels[target] ?? idx.merchIndex[target]?.label ?? target}</b>
                <div style={{ fontSize: 12, color: 'var(--ink-4)', marginTop: 4 }}>
                  {sources.map((src) => (
                    <span key={src} style={{ marginRight: 12 }}>
                      {src}
                      <button className="linkish" style={{ marginLeft: 4 }} onClick={() => unmerge(src, target)}>
                        解除
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </Panel>
        )}
      </div>
    </div>
  );
}
