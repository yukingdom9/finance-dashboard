import { useDataset } from '../state/DatasetContext';
import { useView } from '../state/ViewContext';
import { PageHead } from '../components/PageHead';
import { Readout, ReadoutCell } from '../components/Readout';
import { Story } from '../components/Story';
import { Panel } from '../components/Panel';
import { CategoryRow } from '../components/CategoryRow';
import { DivergingBar } from '../charts/DivergingBars';
import { CumulativeLines } from '../charts/CumulativeLines';
import { buildNarrative } from '../analysis/narrative';
import { categoryDeltas, summaryDelta } from '../analysis/compare';
import { categoryAgg } from '../analysis/aggregate';
import { cumulativeSeries } from '../analysis/cumulative';
import { bonusSkew } from '../analysis/bonus';
import { categoryColor } from '../analysis/constants';
import { sum } from '../analysis/stats';
import { yen, yenS, man, pct, dateShort } from '../format/number';

export function Home() {
  const { state: ds } = useDataset();
  const { state: vs, selectCategory, goToView, openModal } = useView();
  const idx = ds.index;
  const y = vs.year;
  const cy = vs.compareYear;
  if (y == null || cy == null) return <div className="page" />;

  const narrative = buildNarrative(idx.included, y, cy, idx.partialMonths, idx.anomalyIds);
  const { upto, a: A, b: B } = narrative;
  const regShare = A.total ? (A.reg / A.total) * 100 : 0;

  const deltas = categoryDeltas(idx.included, y, cy, upto);
  const top = [...deltas.filter((d) => d.d > 0).slice(0, 4), ...deltas.filter((d) => d.d < 0).slice(-4)];
  const maxAbs = Math.max(1, ...top.map((d) => Math.abs(d.d)));

  const cur = cumulativeSeries(idx.included, y, upto);
  const prev = cumulativeSeries(idx.included, cy, null);

  const fx = idx.fixed.filter((f) => f.status !== 'stopped').slice(0, 4);
  const fxTotal = sum(
    idx.fixed.filter((f) => f.status !== 'stopped'),
    (f) => f.mean,
  );
  const an = idx.anomalies.filter((a) => a.tx.y === y).slice(0, 4);

  const ca = categoryAgg(idx.included, y, upto);
  const catList = Object.keys(ca)
    .map((k) => ({ k, v: ca[k], col: categoryColor(k) }))
    .sort((a2, b2) => b2.v - a2.v);
  const prevCa = categoryAgg(idx.included, cy, upto);
  const maxCat = Math.max(...catList.map((c) => c.v), 1);

  const savingsDelta = summaryDelta(A.savings - B.savings, B.savings, A.income);
  const totalDelta = summaryDelta(A.total - B.total, B.total, A.income);
  const skew = bonusSkew(idx.included, y, upto);

  const deltaChip = (d: ReturnType<typeof summaryDelta>) => {
    if (!d.hasComparison) return <div className="ro-delta flat">くらべる年のデータなし</div>;
    const cls = d.direction;
    const arrow = d.flat ? '±' : d.direction === 'up' ? '▲' : '▼';
    const body = d.usePct ? pct(d.value).replace('+', '') : yenS(d.value).replace('-', '−');
    return (
      <div className={`ro-delta ${cls}`}>
        <span className="num">
          {arrow} {body}
        </span>
        <span style={{ opacity: 0.75 }}>{cy}年比</span>
      </div>
    );
  };

  return (
    <div className="page">
      <PageHead title={`${y}年のお金`} sub={`${y}年1〜${upto}月を、${cy}年の同じ期間とくらべています`} />
      <Readout
        foot={
          <>
            {idx.partialMonths.length ? `${idx.partialMonths.join('、')} は集計途中のため、比較から外しています。` : ''}
            {' '}集計対象 {idx.included.length.toLocaleString('ja-JP')}件／振替・二重計上など{' '}
            {(idx.all.length - idx.included.length).toLocaleString('ja-JP')}件は除外。
            {skew.skewed && (
              <>
                <br />
                この期間には年{skew.bCount}回の賞与のうち{skew.bInPeriod}回が入っています。年間の割合とは異なります。
              </>
            )}
          </>
        }
      >
        <ReadoutCell
          label="使わずに残った額"
          value={yenS(A.savings)}
          delta={deltaChip(savingsDelta)}
          sub={
            <>
              入ってきたお金 <b className="num">{yen(A.income)}</b>のうち <b className="num">{A.rate.toFixed(1)}%</b>
              <br />
              投資や貯蓄に回した分も含みます
            </>
          }
        />
        <ReadoutCell
          label="使ったお金"
          value={yen(A.total)}
          delta={deltaChip(totalDelta)}
          splitBar={
            <div className="ro-split">
              <i style={{ width: `${regShare}%`, background: '#5E8FBF' }} />
              <i style={{ width: `${100 - regShare}%`, background: '#E0904A' }} />
            </div>
          }
          sub={
            <>
              暮らしの支出 <b className="num">{yen(A.reg)}</b>
              <br />
              臨時の支出 <b className="num">{yen(A.oneoff)}</b>
            </>
          }
        />
        <ReadoutCell
          label="ひと月の暮らしに必要な額"
          value={
            <>
              {yen(idx.living.med)}
              <small>/月</small>
            </>
          }
          delta={<div className="ro-delta flat">過去{idx.living.n}ヶ月から算出</div>}
          sub={
            <>
              臨時の買い物を除いた、ふつうの月の生活費
              <br />
              ふだんの幅 <b className="num">{man(idx.living.q1)}〜{man(idx.living.q3)}円</b>
            </>
          }
        />
      </Readout>

      <div className="wrap">
        <Story>
          <h2>
            今年は{cy}年の同じ時期より <em>{yen(Math.abs(narrative.dTotal))}</em> {narrative.dTotal > 0 ? '多く' : '少なく'}
            使っています（{pct(narrative.pTotal)}）。
          </h2>
          <div className="story-rows">
            {narrative.rows.map((r, i) => (
              <div className="story-row" key={i}>
                <span className={`tag ${r.cls}`}>{r.tag}</span>
                <button style={{ textAlign: 'left', color: 'var(--ink-2)' }} onClick={() => selectCategory(r.cat)}>
                  {r.text}
                </button>
              </div>
            ))}
          </div>
          <div className="story-foot">
            <span>{narrative.foot}</span>
            <button className="linkish" onClick={() => goToView('spending')}>
              支出の内訳を見る
            </button>
          </div>
        </Story>

        <div className="cols c-32">
          <Panel title={`${cy}年から増えたもの・減ったもの`} right={<span className="hint">クリックでそのカテゴリーへ</span>}>
            {top.map((d) => (
              <DivergingBar key={d.k} label={d.k} d={d.d} maxAbs={maxAbs} onClick={() => selectCategory(d.k)} />
            ))}
            <div className="legend" style={{ marginTop: 12 }}>
              <span>
                <i style={{ background: 'var(--up)' }} />
                増えた
              </span>
              <span>
                <i style={{ background: 'var(--down)' }} />
                減った
              </span>
              <span style={{ color: 'var(--ink-4)' }}>増減は良し悪しではなく変化の向きを表します</span>
            </div>
          </Panel>
          <Panel title="今年ここまでの合計" right={<span className="hint">{cy}年と重ねて表示</span>}>
            <div className="svgwrap">
              <CumulativeLines cur={cur} prev={prev} curLabel={`${y}年`} prevLabel={`${cy}年`} w={380} h={260} />
            </div>
          </Panel>
        </div>

        <div className="cols c-2">
          <Panel
            title="決まって出ていくお金"
            right={
              <button className="linkish" onClick={() => goToView('fixed')}>
                すべて見る
              </button>
            }
          >
            <table className="tbl fx">
              <colgroup>
                <col style={{ width: '46%' }} />
                <col style={{ width: '26%' }} />
                <col style={{ width: '28%' }} />
              </colgroup>
              <tbody>
                {fx.map((f) => (
                  <tr key={f.key} className="clickable" onClick={() => goToView('merchantDetail')}>
                    <td className="trunc">{f.label}</td>
                    <td className="r num" style={{ color: 'var(--ink-4)' }}>
                      {yen(f.mean)}/月
                    </td>
                    <td className="r num" style={{ fontWeight: 600 }}>
                      年 {yen(f.yearly)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="hint-inline">
              毎月 <b className="num">{yen(fxTotal)}</b>／年間 <b className="num">{yen(fxTotal * 12)}</b> が自動的に出ていきます（
              {idx.fixed.filter((f) => f.status !== 'stopped').length}件）
            </div>
          </Panel>
          <Panel
            title="いつもと違う支出"
            right={
              <button className="linkish" onClick={() => goToView('anomaly')}>
                すべて見る
              </button>
            }
          >
            {an.length ? (
              <>
                <table className="tbl fx">
                  <colgroup>
                    <col style={{ width: '18%' }} />
                    <col style={{ width: '46%' }} />
                    <col style={{ width: '24%' }} />
                    <col style={{ width: '12%' }} />
                  </colgroup>
                  <tbody>
                    {an.map((a) => (
                      <tr key={a.tx.id} className="clickable" onClick={() => openModal({ type: 'transaction', id: a.tx.id })}>
                        <td className="num" style={{ color: 'var(--ink-4)' }}>
                          {dateShort(a.tx.date)}
                        </td>
                        <td className="trunc">{a.tx.name}</td>
                        <td className="r num" style={{ fontWeight: 600 }}>
                          {yen(-a.tx.amount)}
                        </td>
                        <td className="r sub hide-sm">{Math.round(a.ratio) >= 100 ? '100倍超' : Math.round(a.ratio) + '倍'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="hint-inline">そのカテゴリーのふだんの1回とくらべた倍率です</div>
              </>
            ) : (
              <div className="empty">
                <b>{y}年に目立つ支出はありません</b>ふだんの範囲に収まっています
              </div>
            )}
          </Panel>
        </div>

        <Panel title={`${y}年は何にお金が向かったか`} right={<span className="hint">クリックで内訳へ</span>}>
          {catList.slice(0, 7).map((c) => {
            const pv = prevCa[c.k] || 0;
            const dd = pv > 0 ? ((c.v - pv) / pv) * 100 : null;
            return (
              <CategoryRow
                key={c.k}
                swatchColor={c.col}
                name={c.k}
                barPct={(c.v / maxCat) * 100}
                barColor={c.col}
                amt={yen(c.v)}
                sub={`${((c.v / A.total) * 100).toFixed(1)}%`}
                chg={dd == null ? '—' : <span className={dd > 0 ? 'chg up' : 'chg down'}>{pct(dd)}</span>}
                onClick={() => selectCategory(c.k)}
              />
            );
          })}
          <div style={{ marginTop: 12 }}>
            <button className="linkish" onClick={() => goToView('spending')}>
              残り{Math.max(0, catList.length - 7)}カテゴリーと、内訳のくわしい見方へ
            </button>
          </div>
        </Panel>
      </div>
    </div>
  );
}
