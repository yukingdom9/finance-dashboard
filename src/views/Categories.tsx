import { useDataset } from '../state/DatasetContext';
import { useView } from '../state/ViewContext';
import { PageHead } from '../components/PageHead';
import { Panel } from '../components/Panel';
import { KpiStrip } from '../components/KpiStrip';
import { CategoryRow } from '../components/CategoryRow';
import { Breadcrumb } from '../components/Breadcrumb';
import { EmptyState } from '../components/EmptyState';
import { MonthlyBars } from '../charts/MonthlyBars';
import { alignMonths, isPartialMonth } from '../analysis/period';
import { categoryAgg } from '../analysis/aggregate';
import { spend } from '../analysis/filters';
import { merchantStats, merchantKey } from '../analysis/merchant';
import { mostMovedMonth } from '../analysis/narrative';
import { categoryColor } from '../analysis/constants';
import { sum } from '../analysis/stats';
import { yen, yenS, man, pct, monthLabels, pad2, ymLabel, dateShort } from '../format/number';

export function Categories() {
  const { state: ds } = useDataset();
  const { state: vs, selectCategory, selectMonth, selectMerchant, goBackOneLevel, goToView, openModal } = useView();
  const idx = ds.index;
  const y = vs.year;
  const cy = vs.compareYear;
  if (y == null || cy == null) return <div className="page" />;
  const upto = alignMonths(y, cy, idx.included, idx.partialMonths);

  const ca = categoryAgg(idx.included, y, upto);
  const prevCa = categoryAgg(idx.included, cy, upto);
  const list = Object.keys(ca)
    .map((k) => ({ k, v: ca[k], p: prevCa[k] ?? 0, col: categoryColor(k) }))
    .sort((a, b) => b.v - a.v);
  const maxV = Math.max(...list.map((c) => c.v), 1);
  const catTotal = sum(list, (c) => c.v) || 1;

  // 未選択時は先頭カテゴリーを自動的に選ぶ（ワイヤーフレームの挙動に合わせる）。
  // state は変更せず表示だけ補うことで、レンダー中の副作用を避ける。
  const cat = vs.category ?? list[0]?.k ?? null;

  return (
    <div className="page">
      <PageHead title="カテゴリー別" sub="大きな数字から、その原因になった1件の取引まで順にたどれます" />
      <div className="wrap">
        <div className="cols c-23">
          <Panel title="カテゴリー" right={<span className="hint">{y}年</span>} tight sticky>
            {list.map((c) => {
              const dd = c.p > 0 ? ((c.v - c.p) / c.p) * 100 : null;
              return (
                <CategoryRow
                  key={c.k}
                  swatchColor={c.col}
                  name={c.k}
                  barPct={(c.v / maxV) * 100}
                  barColor={c.col}
                  amt={man(c.v)}
                  sub={`${((c.v / catTotal) * 100).toFixed(1)}%`}
                  chg={dd == null ? '—' : <span className={dd > 0 ? 'chg up' : 'chg down'}>{pct(dd)}</span>}
                  selected={cat === c.k}
                  onClick={() => selectCategory(c.k)}
                />
              );
            })}
          </Panel>
          <div>
            {cat ? (
              <CategoryDetail cat={cat} y={y} cy={cy} upto={upto} />
            ) : (
              <Panel>
                <EmptyState title="カテゴリーを選んでください" desc="左の一覧から選ぶと内訳が出ます" />
              </Panel>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function CategoryDetail({ cat, y, cy, upto }: { cat: string; y: number; cy: number; upto: number }) {
  const { state: ds } = useDataset();
  const { state: vs, selectMonth, selectMerchant, goBackOneLevel, goToView, openModal } = useView();
  const idx = ds.index;
  const month = vs.month;
  const merchant = vs.merchant;

  const txAll = idx.expenses.filter((t) => t.cat === cat);
  const curTx = txAll.filter((t) => t.y === y && t.m <= upto);
  const prevTx = txAll.filter((t) => t.y === cy && t.m <= upto);
  const cur = sum(curTx, spend);
  const prev = sum(prevTx, spend);
  const dd = prev > 0 ? ((cur - prev) / prev) * 100 : null;

  const curM = Array(12).fill(0) as number[];
  curTx.forEach((t) => (curM[t.m - 1] += spend(t)));
  const prevM = Array(12).fill(0) as number[];
  txAll.filter((t) => t.y === cy).forEach((t) => (prevM[t.m - 1] += spend(t)));

  let scope = curTx;
  let scopeLabel = `${y}年1〜${upto}月`;
  if (month) {
    scope = txAll.filter((t) => t.ym === month);
    scopeLabel = ymLabel(month);
  }
  if (merchant) {
    scope = scope.filter((t) => merchantKey(t, ds.aliases) === merchant);
    scopeLabel += ` · ${merchant}`;
  }

  const merch = merchantStats(scope, ds.aliases);
  const maxM = Math.max(...merch.map((m) => m.total), 1);

  const gap = mostMovedMonth(curM, prevM, upto);
  const anomHere = curTx.filter((t) => idx.anomalyIds.has(t.id));

  const crumbs = [
    { label: `${y}年の支出`, onClick: () => goToView('spending') },
    month || merchant ? { label: cat, onClick: () => { selectMonth(null); } } : { label: cat },
  ];
  if (month) {
    crumbs.push(merchant ? { label: `${month.slice(5)}月`, onClick: () => selectMerchant(null) } : { label: `${month.slice(5)}月` });
  }
  if (merchant) crumbs.push({ label: merchant });

  return (
    <div>
      <Breadcrumb
        items={crumbs}
        backAction={month || merchant ? { label: 'ひとつ戻る', onClick: goBackOneLevel } : undefined}
      />

      <KpiStrip
        items={[
          { k: `${y}年の${cat}`, v: yen(cur), d: dd == null ? '—' : <span className={dd > 0 ? 'chg up' : 'chg down'}>{pct(dd)} 対{cy}年</span> },
          { k: '月あたり平均', v: yen(upto ? cur / upto : 0), d: `${upto}ヶ月平均` },
          { k: `${cy}年の同時期`, v: yen(prev), d: `差 ${yenS(cur - prev)}` },
          { k: '取引の件数', v: curTx.length.toLocaleString('ja-JP'), d: `1回あたり ${yen(cur / Math.max(1, curTx.length))}` },
        ]}
      />

      {gap && (
        <div className="story" style={{ borderLeftColor: categoryColor(cat) }}>
          <h2 style={{ fontSize: 15 }}>
            {cat}が{cy}年から最も動いたのは <em>{gap.monthIndex + 1}月</em>（{gap.d > 0 ? '+' : '−'}{yen(Math.abs(gap.d))}）です。
          </h2>
          <div className="story-foot" style={{ borderTop: 'none', paddingTop: 4, marginTop: 4 }}>
            <span>その月の支払先を見ると、何が起きたか分かります。</span>
            <button className="linkish" onClick={() => selectMonth(`${y}-${pad2(gap.monthIndex + 1)}`)}>
              {gap.monthIndex + 1}月の中身を見る
            </button>
          </div>
        </div>
      )}

      <Panel title={`月ごとの${cat}`} right={<span className="hint">棒＝{y}年／点線＝{cy}年 · クリックでその月へ</span>}>
        <div className="svgwrap">
          <MonthlyBars
            data={curM}
            prior={prevM}
            labels={monthLabels()}
            w={560}
            h={240}
            highlight={month ? [Number(month.slice(5)) - 1] : []}
            partial={monthLabels().map((_, i) => i).filter((i) => isPartialMonth(`${y}-${pad2(i + 1)}`, idx.partialMonths))}
            onBarClick={(i) => selectMonth(`${y}-${pad2(i + 1)}`)}
          />
        </div>
        <div className="ctrls" style={{ marginTop: 12 }}>
          {monthLabels().map((l, i) => (
            <button
              key={l}
              className="chip"
              style={month === `${y}-${pad2(i + 1)}` ? { background: 'var(--ink)', color: '#fff', borderColor: 'var(--ink)' } : undefined}
              onClick={() => selectMonth(`${y}-${pad2(i + 1)}`)}
            >
              {l}
            </button>
          ))}
          {month && (
            <button className="chip" onClick={() => selectMonth(null)}>
              絞り込みを外す
            </button>
          )}
        </div>
      </Panel>

      {anomHere.length > 0 && (
        <Panel title="この中で目立つ支出" right={<span className="hint">ふだんの1回と比較</span>}>
          <div className="tblwrap">
          <table className="tbl fx" style={{ minWidth: 480 }}>
            <colgroup>
              <col style={{ width: '74px' }} />
              <col style={{ width: '220px' }} />
              <col style={{ width: '78px' }} />
              <col style={{ width: '100px' }} />
            </colgroup>
            <tbody>
              {anomHere.slice(0, 5).map((t) => {
                const a = idx.anomalies.find((x) => x.tx.id === t.id);
                return (
                  <tr key={t.id} className="clickable" onClick={() => openModal({ type: 'transaction', id: t.id })}>
                    <td className="num" style={{ color: 'var(--ink-4)' }}>
                      {dateShort(t.date)}
                    </td>
                    <td className="trunc">{t.name}</td>
                    <td className="r">
                      <span className="chip flag">{a && (Math.round(a.ratio) >= 100 ? '100倍超' : Math.round(a.ratio) + '倍')}</span>
                    </td>
                    <td className="r num" style={{ fontWeight: 600 }}>
                      {yen(spend(t))}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          </div>
        </Panel>
      )}

      <Panel title="どこで使ったか" right={<span className="hint">{scopeLabel} · {merch.length}件の支払先</span>}>
        {merch.slice(0, 12).map((m) => (
          <CategoryRow
            key={m.key}
            name={m.label}
            barPct={(m.total / maxM) * 100}
            barColor={categoryColor(cat)}
            amt={yen(m.total)}
            sub={`${m.n}回`}
            chg={yen(m.total / m.n)}
            selected={merchant === m.key}
            onClick={() => selectMerchant(merchant === m.key ? null : m.key)}
          />
        ))}
      </Panel>

      <Panel title={`${scopeLabel} の取引`} right={<span className="hint">{scope.length}件</span>} tight>
        <div className="scrollbox tblwrap">
          <table className="tbl fx" style={{ minWidth: 560 }}>
            <colgroup>
              <col style={{ width: '78px' }} />
              <col style={{ width: '228px' }} />
              <col className="hide-sm" style={{ width: '150px' }} />
              <col style={{ width: '104px' }} />
            </colgroup>
            <thead>
              <tr>
                <th>日付</th>
                <th>内容</th>
                <th className="hide-sm">支払手段</th>
                <th className="r">金額</th>
              </tr>
            </thead>
            <tbody>
              {scope.slice(0, 200).map((t) => (
                <tr key={t.id} className="clickable" onClick={() => openModal({ type: 'transaction', id: t.id })}>
                  <td className="num" style={{ color: 'var(--ink-4)', whiteSpace: 'nowrap' }}>
                    {dateShort(t.date)}
                  </td>
                  <td className="trunc">
                    {t.name}
                    {idx.anomalyIds.has(t.id) && <span className="chip flag"> 目立つ支出</span>}
                  </td>
                  <td className="hide-sm" style={{ color: 'var(--ink-4)' }}>
                    {t.bank}
                  </td>
                  <td className="r num">{yen(spend(t))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="tblfoot">
          {scope.length > 200
            ? `${scope.length.toLocaleString('ja-JP')}件のうち200件を表示しています。月やお店で絞り込むと全件が見えます。`
            : `${scope.length}件すべてを表示しています。`}
        </div>
      </Panel>
    </div>
  );
}
