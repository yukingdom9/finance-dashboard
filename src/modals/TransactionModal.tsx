import { useDataset } from '../state/DatasetContext';
import { useView } from '../state/ViewContext';
import { Modal } from '../components/Modal';
import { categoryColor } from '../analysis/constants';
import { merchantKey, displayName } from '../analysis/merchant';
import { yenS, ratioLabel } from '../format/number';

export function TransactionModal({ id, onClose }: { id: string; onClose: () => void }) {
  const { state: ds } = useDataset();
  const { selectMerchant, selectCategory, goToView } = useView();
  const idx = ds.index;
  const tx = idx.all.find((t) => t.id === id);
  if (!tx) return null;

  const anomaly = idx.anomalies.find((a) => a.tx.id === id);
  const key = merchantKey(tx, ds.aliases);
  const merchant = idx.merchIndex[key];
  const fixed = idx.fixed.find((f) => f.key === key);

  return (
    <Modal title={displayName(tx.name)} onClose={onClose}>
      <div style={{ fontSize: 30, fontWeight: 700, marginBottom: 16 }} className="num">
        {yenS(-tx.amount)}
      </div>
      {anomaly && (
        <div style={{ borderLeft: '3px solid var(--flag)', paddingLeft: 12, marginBottom: 16, fontSize: 13, lineHeight: 1.7 }}>
          {tx.cat}のふだんの1回は {yenS(-anomaly.usual).replace('−', '')} です。この取引はその {ratioLabel(anomaly.ratio)} にあたります。
        </div>
      )}
      <dl className="dl">
        <dt>日付</dt>
        <dd className="num">{tx.date}</dd>
        <dt>カテゴリー</dt>
        <dd>
          <i className="swatch" style={{ background: categoryColor(tx.cat), marginRight: 6 }} />
          {tx.cat} › {tx.sub}
        </dd>
        <dt>支払手段</dt>
        <dd>{tx.bank}</dd>
        <dt>集計</dt>
        <dd>{tx.include === 1 ? '含む' : `含まない（${tx.transfer === 1 ? '口座間の振替' : 'その他の除外理由'}）`}</dd>
        {merchant && (
          <>
            <dt>この支払先</dt>
            <dd>
              {merchant.tx.length}件・合計 {yenS(-merchant.tx.reduce((s, t) => s + t.amount, 0))}
              {fixed && (
                <span className="chip on" style={{ marginLeft: 6 }}>
                  固定費
                </span>
              )}
            </dd>
          </>
        )}
      </dl>
      <div className="ctrls" style={{ marginTop: 18 }}>
        <button
          className="backbtn"
          onClick={() => {
            selectMerchant(key);
            goToView('merchantDetail');
            onClose();
          }}
        >
          この支払先の履歴を見る
        </button>
        <button
          className="backbtn"
          onClick={() => {
            selectCategory(tx.cat);
            onClose();
          }}
        >
          {tx.cat}の内訳を見る
        </button>
      </div>
    </Modal>
  );
}
