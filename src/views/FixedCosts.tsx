import { useDataset } from '../state/DatasetContext';
import { useView } from '../state/ViewContext';
import { PageHead } from '../components/PageHead';
import { Panel } from '../components/Panel';
import { Segmented } from '../components/Segmented';
import { DotTimeline } from '../charts/DotTimeline';
import { yearAgg } from '../analysis/aggregate';
import { sum } from '../analysis/stats';
import { categoryColor } from '../analysis/constants';
import { yen } from '../format/number';
import type { FixedStatus } from '../types/analysis';

const STATUS_LABEL: Record<FixedStatus, string> = { on: '続いている', new: '最近始まった', stopped: '止まったかも' };
const STATUS_TONE: Record<FixedStatus, 'on' | 'new' | 'off'> = { on: 'on', new: 'new', stopped: 'off' };

export function FixedCosts() {
  const { state: ds } = useDataset();
  const { state: vs, setFixedFilter, selectMerchant, goToView } = useView();
  const idx = ds.index;
  const y = vs.year;
  if (y == null) return <div className="page" />;

  const filtered = idx.fixed.filter((f) => vs.fixedFilter === 'all' || f.status === vs.fixedFilter);
  const active = idx.fixed.filter((f) => f.status !== 'stopped');
  const activeTotal = sum(active, (f) => f.mean);
  const yearTotal = yearAgg(idx.included, y, 12, idx.anomalyIds).total;
  const sharePct = yearTotal ? ((activeTotal * 12) / yearTotal) * 100 : 0;

  const recent24 = idx.allMonthsSorted.slice(-24);

  return (
    <div className="page">
      <PageHead
        title="決まって出ていくお金"
        sub="自動的に出ていく額を年額で把握し、途切れ・開始に気づけます"
        right={
          <Segmented
            ariaLabel="状態で絞り込む"
            value={vs.fixedFilter}
            onChange={setFixedFilter}
            options={[
              { value: 'all', label: 'すべて' },
              { value: 'on', label: '続いている' },
              { value: 'new', label: '最近始まった' },
              { value: 'stopped', label: '止まったかも' },
            ]}
          />
        }
      />
      <div className="wrap">
        <div className="story">
          <h2>
            毎月 <em>{yen(activeTotal)}</em> が、意識しなくても出ていきます。年間では <em>{yen(activeTotal * 12)}</em> です。
          </h2>
          <div className="hint-inline">
            {y}年の支出の{sharePct.toFixed(1)}%にあたります。{active.length}件を検出しました。
          </div>
        </div>

        <Panel tight>
          <div className="tblwrap">
          <table className="tbl fx" style={{ minWidth: 900 }}>
            <colgroup>
              <col style={{ width: '200px' }} />
              <col style={{ width: '110px' }} />
              <col style={{ width: '140px' }} />
              <col style={{ width: '130px' }} />
              <col style={{ width: '220px' }} />
              <col style={{ width: '100px' }} />
            </colgroup>
            <thead>
              <tr>
                <th>支払先</th>
                <th>カテゴリー</th>
                <th className="r">月あたり</th>
                <th className="r">年額</th>
                <th>発生した月</th>
                <th>状態</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((f) => {
                const intervalMonths = Math.round(f.span / f.months.length);
                return (
                  <tr key={f.key} className="clickable" onClick={() => { selectMerchant(f.key); goToView('merchantDetail'); }}>
                    <td className="trunc">{f.label}</td>
                    <td>
                      <i className="swatch" style={{ background: categoryColor(f.cat), marginRight: 6 }} />
                      {f.cat}
                    </td>
                    <td className="r num">
                      {yen(f.mean)} /月
                      {intervalMonths >= 2 && (
                        <div style={{ fontSize: 11, color: 'var(--ink-4)' }}>
                          {intervalMonths}ヶ月ごとに {yen(f.unit)}
                        </div>
                      )}
                    </td>
                    <td className="r num" style={{ fontSize: 14, fontWeight: 700 }}>
                      {yen(f.yearly)}
                    </td>
                    <td>
                      <DotTimeline months={f.months} allMonths={recent24} />
                    </td>
                    <td>
                      <span className={`chip ${STATUS_TONE[f.status]}`}>{STATUS_LABEL[f.status]}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          </div>
        </Panel>
        <div className="hint-inline">
          「止まったかも」は直近3ヶ月に引き落としが見つからないものです。解約済みか、請求が止まっているかを確認する手がかりになります。
        </div>
      </div>
    </div>
  );
}
