import { useDataset } from '../state/DatasetContext';
import { useView } from '../state/ViewContext';
import { PageHead } from '../components/PageHead';
import { Panel } from '../components/Panel';
import { EmptyState } from '../components/EmptyState';
import { Scatter } from '../charts/Scatter';
import { spend } from '../analysis/filters';
import { categoryColor } from '../analysis/constants';
import { yen, dateShort, ratioLabel } from '../format/number';

function toTimestamp(date: string): number {
  const [y, m, d] = date.split('/').map(Number);
  return new Date(y, m - 1, d).getTime();
}

export function Anomalies() {
  const { state: ds } = useDataset();
  const { state: vs, openModal } = useView();
  const idx = ds.index;
  const y = vs.year;
  if (y == null) return <div className="page" />;

  const background = idx.expenses.filter((_, i) => i % 4 === 0);
  const points = [
    ...background.map((t) => ({ t: toTimestamp(t.date), v: spend(t), label: t.name, col: categoryColor(t.cat), big: false })),
    ...idx.anomalies.map((a) => ({ t: toTimestamp(a.tx.date), v: spend(a.tx), label: a.tx.name, big: true, id: a.tx.id })),
  ];

  const yearAnomalies = idx.anomalies.filter((a) => a.tx.y === y);

  return (
    <div className="page">
      <PageHead title="いつもと違う支出" sub="ふだんのパターンから外れた支出だけを抜き出します" />
      <div className="wrap">
        <Panel title="すべての支出のちらばり" right={<span className="hint">横軸＝日付・縦軸＝金額</span>}>
          <div className="svgwrap">
            <Scatter points={points} w={1000} onPointClick={(id) => openModal({ type: 'transaction', id })} />
          </div>
          <div className="hint-inline">
            金額の絶対値ではなく、そのカテゴリーの中で何倍外れているかで判定しています。10万円のパソコンと10万円の食費は意味が違うためです。
          </div>
        </Panel>

        <Panel title={`${y}年の目立つ支出`} tight>
          {yearAnomalies.length ? (
            <table className="tbl">
              <thead>
                <tr>
                  <th>日付</th>
                  <th>内容</th>
                  <th>カテゴリー</th>
                  <th className="r">ふだんの1回</th>
                  <th className="r">この取引</th>
                  <th className="r">倍率</th>
                </tr>
              </thead>
              <tbody>
                {yearAnomalies.map((a) => (
                  <tr key={a.tx.id} className="clickable" onClick={() => openModal({ type: 'transaction', id: a.tx.id })}>
                    <td className="num">{dateShort(a.tx.date)}</td>
                    <td className="trunc">{a.tx.name}</td>
                    <td>{a.tx.cat}</td>
                    <td className="r num">{yen(a.usual)}</td>
                    <td className="r num" style={{ fontWeight: 600 }}>
                      {yen(spend(a.tx))}
                    </td>
                    <td className="r">
                      <span className="chip flag">{ratioLabel(a.ratio)}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <EmptyState title={`${y}年に目立つ支出はありません`} desc="すべての支出がふだんの範囲に収まっています" />
          )}
        </Panel>
      </div>
    </div>
  );
}
