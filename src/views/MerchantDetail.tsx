import { useDataset } from '../state/DatasetContext';
import { useView } from '../state/ViewContext';
import { PageHead } from '../components/PageHead';
import { Panel } from '../components/Panel';
import { KpiStrip } from '../components/KpiStrip';
import { EmptyState } from '../components/EmptyState';
import { MonthlyBars } from '../charts/MonthlyBars';
import { spend } from '../analysis/filters';
import { sum, median, coefficientOfVariation } from '../analysis/stats';
import { yen, dateShort } from '../format/number';

export function MerchantDetail() {
  const { state: ds } = useDataset();
  const { state: vs, goToView } = useView();
  const idx = ds.index;
  const key = vs.merchant;

  const group = key ? idx.merchIndex[key] : undefined;
  if (!group) {
    return (
      <div className="page">
        <PageHead title="支払先の詳細" />
        <div className="wrap">
          <Panel>
            <EmptyState title="支払先が選ばれていません" desc="「お店・サービス別」の一覧から選んでください" />
          </Panel>
        </div>
      </div>
    );
  }

  const txs = group.tx.slice().sort((a, b) => (a.date < b.date ? 1 : -1));
  const total = sum(txs, spend);
  const n = txs.length;
  const fixed = idx.fixed.find((f) => f.key === key);

  const months = idx.allMonthsSorted;
  const byM: Record<string, number> = {};
  txs.forEach((t) => (byM[t.ym] = (byM[t.ym] ?? 0) + spend(t)));
  const data = months.map((m) => byM[m] ?? 0);
  const labels = months.map((m) => m.slice(2).replace('-', '/'));

  const years = [...new Set(txs.map((t) => t.y))].sort();
  const yearRows = years.map((y) => {
    const yTx = txs.filter((t) => t.y === y);
    return { y, n: yTx.length, total: sum(yTx, spend) };
  });

  // 決まって出ていくお金（data-spec.md §11）と同じ定義：月ごとの合計額の変動係数。
  // 個々の取引額（1回あたりの金額）の変動係数ではない。マクドナルドのように来店回数の
  // ブレで月合計が変わる支払先では、両者の値が大きく異なり、判定結果と矛盾して見えるため注意。
  const cv = coefficientOfVariation(Object.values(byM));

  return (
    <div className="page">
      <PageHead
        title={group.label}
        sub={`${group.cat} · ${n}件 · 合計 ${yen(total)}`}
        right={
          <button className="backbtn" onClick={() => goToView('merchants')}>
            お店の一覧へ戻る
          </button>
        }
      />
      <div className="wrap">
        <KpiStrip
          items={[
            { k: '全期間の合計', v: yen(total) },
            { k: '1回あたり', v: yen(total / Math.max(1, n)) },
            { k: '月あたり', v: yen(months.length ? total / new Set(txs.map((t) => t.ym)).size : 0) },
            fixed
              ? { k: '固定費として検出', v: `年 ${yen(fixed.yearly)}`, d: `変動係数 ${fixed.cv.toFixed(3)}` }
              : { k: '金額のばらつき', v: `中央値 ${yen(median(txs.map(spend)))}`, d: `変動係数 ${cv.toFixed(2)}` },
          ]}
        />

        <Panel title="月ごとの支払い" right={<span className="hint">全期間</span>}>
          <div className="svgwrap">
            <MonthlyBars data={data} labels={labels} w={900} h={220} />
          </div>
        </Panel>

        <Panel title="年ごと" tight>
          <table className="tbl">
            <thead>
              <tr>
                <th>年</th>
                <th className="r">回数</th>
                <th className="r">金額</th>
              </tr>
            </thead>
            <tbody>
              {yearRows.map((r) => (
                <tr key={r.y}>
                  <td className="num">{r.y}年</td>
                  <td className="r num">{r.n}</td>
                  <td className="r num">{yen(r.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>

        <Panel title="すべての取引" tight>
          <div className="scrollbox tblwrap">
            <table className="tbl fx" style={{ minWidth: 500 }}>
              <colgroup>
                <col style={{ width: '84px' }} />
                <col style={{ width: '166px' }} />
                <col style={{ width: '140px' }} />
                <col style={{ width: '110px' }} />
              </colgroup>
              <thead>
                <tr>
                  <th>日付</th>
                  <th>中項目</th>
                  <th>支払手段</th>
                  <th className="r">金額</th>
                </tr>
              </thead>
              <tbody>
                {txs.map((t) => (
                  <tr key={t.id}>
                    <td className="num">{dateShort(t.date)}</td>
                    <td>{t.sub}</td>
                    <td>{t.bank}</td>
                    <td className="r num">{yen(spend(t))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      </div>
    </div>
  );
}
