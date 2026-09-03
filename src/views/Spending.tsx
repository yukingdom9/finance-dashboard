import { useDataset } from '../state/DatasetContext';
import { useView } from '../state/ViewContext';
import { PageHead } from '../components/PageHead';
import { Panel } from '../components/Panel';
import { KpiStrip } from '../components/KpiStrip';
import { Segmented } from '../components/Segmented';
import { StackedBars } from '../charts/StackedBars';
import { Treemap } from '../charts/Treemap';
import { alignMonths, isPartialMonth } from '../analysis/period';
import { yearAgg, categoryAgg, monthlySeries } from '../analysis/aggregate';
import { isExpense } from '../analysis/filters';
import {
  monthlyGroupSeries,
  splitRegularOneoff,
  regularBreakdown,
  oneoffList,
  needWantBreakdown,
  classifyOneoff,
} from '../analysis/grouping';
import { forecastSpending } from '../analysis/forecast';
import { categoryColor, GROUP_COLORS } from '../analysis/constants';
import { yen, monthLabels, pad2 } from '../format/number';
import type { Transaction } from '../types/transaction';

const SPLIT = {
  oneoff: { names: ['暮らしの支出', '臨時の支出'], colors: [GROUP_COLORS.regular, GROUP_COLORS.oneoff] },
  need: { names: ['削りにくい支出', '選べる支出', 'その他'], colors: [GROUP_COLORS.need, GROUP_COLORS.want, GROUP_COLORS.other] },
} as const;

export function Spending() {
  const { state: ds } = useDataset();
  const { state: vs, setSpendMode, selectCategory, openModal } = useView();
  const idx = ds.index;
  const y = vs.year;
  const cy = vs.compareYear;
  if (y == null || cy == null) return <div className="page" />;

  const upto = alignMonths(y, cy, idx.included, idx.partialMonths);
  const A = yearAgg(idx.included, y, upto, idx.anomalyIds);
  const mode = vs.spendMode;
  const { names, colors } = SPLIT[mode];

  const yearExpensesAllMonths = idx.expenses.filter((t) => t.y === y);
  const stack = monthlyGroupSeries(yearExpensesAllMonths, mode, idx.anomalyIds);
  const priorTotals = monthlySeries(idx.included, cy, isExpense);
  const partialIdx = Array.from({ length: 12 }, (_, i) => i).filter((i) => isPartialMonth(`${y}-${pad2(i + 1)}`, idx.partialMonths));

  const yearTx = idx.expenses.filter((t) => t.y === y && t.m <= upto);

  const forecast = forecastSpending(idx.included, y, cy, idx.partialMonths, idx.anomalyIds);

  const anomalyRatio = new Map(idx.anomalies.map((a) => [a.tx.id, a.ratio]));

  const ca = categoryAgg(idx.included, y, upto);
  const treemapItems = Object.keys(ca).map((k) => ({ k, v: ca[k], col: categoryColor(k) }));
  const negativeCats = Object.keys(ca).filter((k) => ca[k] <= 0);

  return (
    <div className="page">
      <PageHead
        title="支出をくわしく"
        sub="支出の構造を理解します。とくに「どれが臨時の支出か」「どれが削りにくい支出か」を具体的に示します。"
        right={
          <Segmented
            ariaLabel="表示モード"
            value={mode}
            onChange={setSpendMode}
            options={[
              { value: 'oneoff', label: '暮らし／臨時' },
              { value: 'need', label: '削りにくい／選べる' },
            ]}
          />
        }
      />
      <div className="wrap">
        <KpiStrip
          items={[
            { k: `${y}年の支出`, v: yen(A.total) },
            { k: '暮らしの支出', v: yen(A.reg) },
            { k: '臨時の支出', v: yen(A.oneoff) },
            { k: '月あたり平均', v: yen(upto ? A.total / upto : 0) },
            {
              k: 'このペースなら年末に',
              v: forecast.estimate != null ? yen(forecast.estimate) : '—',
              d: forecast.estimate != null ? `残り${forecast.remain}ヶ月を暮らしの支出で試算` : '年の集計が完了',
            },
          ]}
        />

        <Panel title="月ごとの支出" right={<span className="hint">棒＝{names.join('・')}／点線＝{cy}年</span>}>
          <div className="svgwrap">
            <StackedBars
              series={stack}
              labels={monthLabels()}
              colors={[...colors]}
              names={[...names]}
              prior={priorTotals}
              priorLabel={`${cy}年`}
              w={1000}
              h={260}
              partial={partialIdx}
            />
          </div>
          <div className="legend" style={{ marginTop: 12 }}>
            {names.map((n, i) => (
              <span key={n}>
                <i style={{ background: colors[i] }} />
                {n}
              </span>
            ))}
            <span style={{ color: 'var(--ink-4)' }}>点線は{cy}年の同じ月です</span>
          </div>
        </Panel>

        <Panel title="グループの内訳">
          {mode === 'oneoff' ? (
            <OneoffGroups yearTx={yearTx} anomalyIds={idx.anomalyIds} anomalyRatio={anomalyRatio} onSelectCategory={selectCategory} onSelectTx={(id) => openModal({ type: 'transaction', id })} />
          ) : (
            <NeedWantGroups yearTx={yearTx} onSelectCategory={selectCategory} />
          )}
        </Panel>

        <Panel title="支出の内訳" right={<span className="hint">面積の大きさ＝金額</span>}>
          <div className="svgwrap">
            <Treemap items={treemapItems} w={1000} h={340} onSelect={selectCategory} />
          </div>
          {negativeCats.length > 0 && (
            <div className="hint-inline">
              {negativeCats.join('、')} は返金等で合計がマイナスのため、面積図には表示していません。
            </div>
          )}
        </Panel>
      </div>
    </div>
  );
}

function OneoffGroups({
  yearTx,
  anomalyIds,
  anomalyRatio,
  onSelectCategory,
  onSelectTx,
}: {
  yearTx: Transaction[];
  anomalyIds: Set<string>;
  anomalyRatio: Map<string, number>;
  onSelectCategory: (cat: string) => void;
  onSelectTx: (id: string) => void;
}) {
  const { regular, oneoff } = splitRegularOneoff(yearTx, anomalyIds);
  const regBd = regularBreakdown(regular);
  const oneoffBd = oneoffList(oneoff);
  const maxReg = Math.max(...regBd.list.map((i) => i.v), 1);
  const maxOneoff = Math.max(...oneoffBd.items.map((t) => -t.amount), 1);

  return (
    <div className="grps oneoff">
      <div className="grp" style={{ borderTop: `3px solid ${GROUP_COLORS.regular}` }}>
        <div className="grp-hd">
          <b>暮らしの支出</b>
          <span className="grp-amt num">{yen(regBd.total)}</span>
        </div>
        <div className="grp-bd">
          {regBd.list.map((it) => (
            <button className="grow" key={it.label} onClick={() => onSelectCategory(it.cat)}>
              <span className="g-nm">{it.label}</span>
              <span className="g-bar">
                <i style={{ width: `${(it.v / maxReg) * 100}%`, background: GROUP_COLORS.regular }} />
              </span>
              <span className="g-amt num">{yen(it.v)}</span>
            </button>
          ))}
        </div>
        <div className="hint-inline" style={{ padding: '0 14px 12px' }}>
          毎月の生活で継続的に発生する支出です（カテゴリー単位の合計）。
        </div>
      </div>
      <div className="grp" style={{ borderTop: `3px solid ${GROUP_COLORS.oneoff}` }}>
        <div className="grp-hd">
          <b>臨時の支出</b>
          <span className="grp-amt num">{yen(oneoffBd.total)}</span>
        </div>
        <div className="grp-bd">
          {oneoffBd.items.slice(0, 10).map((t) => {
            const { why } = classifyOneoff(t, anomalyIds, anomalyRatio);
            return (
              <button className="grow tx" key={t.id} onClick={() => onSelectTx(t.id)}>
                <span className="g-nm">{t.name}</span>
                <span className="g-why">{why}</span>
                <span className="g-amt num">{yen(-t.amount)}</span>
              </button>
            );
          })}
          {oneoffBd.items.length > 10 && (
            <div className="hint-inline">ほか{oneoffBd.items.length - 10}件</div>
          )}
        </div>
        <div className="hint-inline" style={{ padding: '0 14px 12px' }}>
          パソコンや家電などの大きな買い物、旅行、いつもと違う支出をまとめています。
        </div>
      </div>
    </div>
  );
}

function NeedWantGroups({ yearTx, onSelectCategory }: { yearTx: Transaction[]; onSelectCategory: (cat: string) => void }) {
  const [needBd, wantBd, otherBd] = needWantBreakdown(yearTx);
  const cards = [
    { title: '削りにくい支出', bd: needBd, color: GROUP_COLORS.need },
    { title: '選べる支出', bd: wantBd, color: GROUP_COLORS.want },
    { title: 'その他', bd: otherBd, color: GROUP_COLORS.other },
  ];
  return (
    <div className="grps need">
      {cards.map((c) => {
        const max = Math.max(...c.bd.list.map((i) => i.v), 1);
        return (
          <div className="grp" key={c.title} style={{ borderTop: `3px solid ${c.color}` }}>
            <div className="grp-hd">
              <b>{c.title}</b>
              <span className="grp-amt num">{yen(c.bd.total)}</span>
            </div>
            <div className="grp-bd">
              {c.bd.list.map((it) => (
                <button className="grow" key={it.label} onClick={() => onSelectCategory(it.cat)}>
                  <span className="g-nm">{it.label}</span>
                  <span className="g-bar">
                    <i style={{ width: `${(it.v / max) * 100}%`, background: c.color }} />
                  </span>
                  <span className="g-amt num">{yen(it.v)}</span>
                </button>
              ))}
            </div>
          </div>
        );
      })}
      <div className="hint-inline" style={{ gridColumn: '1 / -1' }}>
        外食やカフェは選べる支出、食料品は削りにくい支出として分けています。自動車もガソリン・車検/整備以外は選べる支出です。
      </div>
    </div>
  );
}
