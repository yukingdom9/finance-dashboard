import { useDataset } from '../state/DatasetContext';
import { Modal } from '../components/Modal';
import { ymLabel } from '../format/number';

export function DataQualityModal({ onClose }: { onClose: () => void }) {
  const { state: ds } = useDataset();
  const idx = ds.index;
  const total = idx.all.length;
  const included = idx.included.length;
  const transferCount = idx.all.filter((t) => t.include === 0 && t.transfer === 1).length;
  const otherExcluded = idx.all.filter((t) => t.include === 0 && t.transfer === 0).length;
  const unclassified = idx.included.filter((t) => t.cat === '未分類').length;
  const unclassifiedRatio = included ? (unclassified / included) * 100 : 0;
  const months = idx.allMonthsSorted;
  const period = months.length ? `${ymLabel(months[0])} 〜 ${ymLabel(months[months.length - 1])}` : '—';

  return (
    <Modal title="この数字はどこまで信じられるか" onClose={onClose}>
      <dl className="dl">
        <dt>読み込み</dt>
        <dd className="num">
          {total.toLocaleString('ja-JP')}件・{period}
        </dd>
        <dt>集計対象</dt>
        <dd className="num">{included.toLocaleString('ja-JP')}件</dd>
        <dt>除外</dt>
        <dd className="num">
          口座間の振替など {transferCount.toLocaleString('ja-JP')}件／その他 {otherExcluded.toLocaleString('ja-JP')}件
        </dd>
        <dt>未分類</dt>
        <dd className="num">
          {unclassified.toLocaleString('ja-JP')}件（集計対象の {unclassifiedRatio.toFixed(1)}%）
        </dd>
        <dt>集計途中</dt>
        <dd className="num">{idx.partialMonths.length ? idx.partialMonths.map(ymLabel).join('、') : 'なし'}</dd>
      </dl>
      <p className="hint-inline" style={{ marginTop: 16 }}>
        カードの引き落としは、カード側の明細と銀行側の引き落としで二重に記録されます。このため銀行側は集計から外しています。
        投資口座への資金移動も、使ったお金ではないため支出には数えていません。
      </p>
    </Modal>
  );
}
