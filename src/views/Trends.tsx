import { useDataset } from '../state/DatasetContext';
import { useView } from '../state/ViewContext';
import { PageHead } from '../components/PageHead';
import { Panel } from '../components/Panel';
import { Segmented } from '../components/Segmented';
import { Heatmap } from '../charts/Heatmap';
import { Sparkline } from '../charts/Sparkline';
import { lastCompleteMonth, isPartialMonth } from '../analysis/period';
import { yearAgg, categoryAgg, monthlySeries } from '../analysis/aggregate';
import { isExpense } from '../analysis/filters';
import { categoryColor } from '../analysis/constants';
import { yen, man, pad2 } from '../format/number';

export function Trends() {
  const { state: ds } = useDataset();
  const { state: vs, setTrendMetric, selectCategory, goToView } = useView();
  const idx = ds.index;
  if (!idx.years.length) return <div className="page" />;

  const commonUpto = Math.min(...idx.years.map((y) => lastCompleteMonth(y, idx.included, idx.partialMonths)));
  const metric = vs.trendMetric;
  const divisor = metric === 'avg' ? commonUpto || 1 : 1;

  const yearRows = idx.years.map((y) => yearAgg(idx.included, y, commonUpto, idx.anomalyIds));
  const maxTotal = Math.max(...yearRows.map((r) => r.total), 1);

  const catSet = new Set<string>();
  idx.years.forEach((y) => Object.keys(categoryAgg(idx.included, y, commonUpto)).forEach((k) => catSet.add(k)));
  const catRows = [...catSet]
    .map((cat) => {
      const byYear = idx.years.map((y) => categoryAgg(idx.included, y, commonUpto)[cat] ?? 0);
      const last = byYear[byYear.length - 1] ?? 0;
      const prev = byYear.length >= 2 ? byYear[byYear.length - 2] : 0;
      const d = last - prev;
      return { cat, byYear, d, latest: last };
    })
    .sort((a, b) => b.latest - a.latest);

  const monthlyByYear = new Map(idx.years.map((y) => [y, monthlySeries(idx.included, y, isExpense)]));
  const heatValues = idx.years.map((y) =>
    Array.from({ length: 12 }, (_, mi) => {
      const ym = `${y}-${pad2(mi + 1)}`;
      if (!(ym in idx.monthCounts)) return null;
      if (isPartialMonth(ym, idx.partialMonths)) return null;
      return monthlyByYear.get(y)![mi];
    }),
  );

  return (
    <div className="page">
      <PageHead
        title="年ごとの比較"
        sub={`すべての年を1〜${commonUpto}月にそろえて比較しています`}
        right={
          <Segmented
            ariaLabel="表示単位"
            value={metric}
            onChange={setTrendMetric}
            options={[
              { value: 'total', label: '年間の合計' },
              { value: 'avg', label: '月あたり平均' },
            ]}
          />
        }
      />
      <div className="wrap">
        <Panel title="年ごとの収入・支出・残った額" right={<span className="hint">1〜{commonUpto}月でそろえています</span>} tight>
          <table className="tbl">
            <thead>
              <tr>
                <th>年</th>
                <th className="r">入ってきた</th>
                <th className="r hide-sm">うち暮らし</th>
                <th className="r hide-sm">うち臨時</th>
                <th className="r">使った</th>
                <th className="r">残った額</th>
                <th className="r">残った割合</th>
                <th>内訳</th>
              </tr>
            </thead>
            <tbody>
              {yearRows.map((r) => {
                const regShare = r.total ? (r.reg / r.total) * 100 : 0;
                return (
                  <tr key={r.y}>
                    <td className="num">{r.y}年</td>
                    <td className="r num">{yen(r.income / divisor)}</td>
                    <td className="r num hide-sm" style={{ color: 'var(--ink-4)' }}>
                      {yen(r.reg / divisor)}
                    </td>
                    <td className="r num hide-sm" style={{ color: 'var(--ink-4)' }}>
                      {yen(r.oneoff / divisor)}
                    </td>
                    <td className="r num">{yen(r.total / divisor)}</td>
                    <td className="r num">{yen(r.savings / divisor)}</td>
                    <td className="r num">{r.rate.toFixed(1)}%</td>
                    <td style={{ minWidth: 100 }}>
                      <span className="bartrack" style={{ display: 'block', width: `${(r.total / maxTotal) * 100}%` }}>
                        <i style={{ width: `${regShare}%`, background: '#5E8FBF' }} />
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Panel>

        <Panel title="カテゴリー別に、年ごとどう動いたか" tight>
          <table className="tbl fx">
            <thead>
              <tr>
                <th>カテゴリー</th>
                {idx.years.map((y) => (
                  <th className="r" key={y}>
                    {y}年
                  </th>
                ))}
                <th className="r">直近年の増減</th>
                <th>推移</th>
              </tr>
            </thead>
            <tbody>
              {catRows.map((r) => (
                <tr key={r.cat} className="clickable" onClick={() => { selectCategory(r.cat); goToView('categories'); }}>
                  <td>
                    <i className="swatch" style={{ background: categoryColor(r.cat), marginRight: 6 }} />
                    {r.cat}
                  </td>
                  {r.byYear.map((v, i) => (
                    <td className="r num" key={i}>
                      {man(v)}
                    </td>
                  ))}
                  <td className={`r num ${r.d > 0 ? 'chg up' : r.d < 0 ? 'chg down' : 'chg flat'}`}>
                    {r.d > 0 ? '+' : r.d < 0 ? '−' : ''}
                    {man(Math.abs(r.d))}
                  </td>
                  <td>
                    <Sparkline values={r.byYear} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>

        <Panel title="どの月にお金が出ていくか" right={<span className="hint">濃いほど支出が多い月</span>}>
          <div className="svgwrap">
            <Heatmap rows={idx.years.map((y) => `${y}年`)} cols={Array.from({ length: 12 }, (_, i) => `${i + 1}月`)} values={heatValues} w={900} />
          </div>
          <div className="hint-inline">毎年同じ月が濃くなっていれば季節による支出です。ある年だけ濃ければ、その年に特有の出来事があった可能性があります。</div>
        </Panel>
      </div>
    </div>
  );
}
