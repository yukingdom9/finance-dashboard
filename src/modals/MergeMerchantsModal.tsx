import { useMemo, useState } from 'react';
import { useDataset } from '../state/DatasetContext';
import { Modal } from '../components/Modal';
import { yen } from '../format/number';

/**
 * お店をまとめる（M-03、F-22）。
 *
 * 実装判断：どの支払先キーを「統合先」として残すかは ui-spec.md に明記が無い。
 * 利用者が意識する必要のない内部識別子であるため、選択された支払先のうち
 * 合計金額が最も大きいものを自動的に統合先キーとする。利用者が選ぶのは
 * 表示名のみ（ui-spec.md M-03「選択肢の中から、または入力」）とし、
 * data-spec.md §13-3 のキー解決順序（自動正規化→組み込み→利用者定義）は変えない。
 */
export function MergeMerchantsModal({ keys, onClose }: { keys: string[]; onClose: () => void }) {
  const { state: ds, updateAliases } = useDataset();
  const idx = ds.index;

  const groups = useMemo(() => keys.map((k) => idx.merchIndex[k]).filter(Boolean), [keys, idx.merchIndex]);
  const targetKey = useMemo(() => {
    if (!groups.length) return keys[0];
    return groups.slice().sort((a, b) => b.tx.reduce((s, t) => s - t.amount, 0) - a.tx.reduce((s, t) => s - t.amount, 0))[0].key;
  }, [groups, keys]);
  const targetGroup = idx.merchIndex[targetKey];

  const [customLabel, setCustomLabel] = useState('');
  const [selectedLabel, setSelectedLabel] = useState<string>(targetGroup?.label ?? '');
  const [busy, setBusy] = useState(false);

  const uniqueLabels = [...new Set(groups.map((g) => g.label))];

  const handleMerge = async () => {
    setBusy(true);
    const finalLabel = customLabel.trim() || selectedLabel || targetGroup?.label || targetKey;
    const merge = { ...ds.aliases.merge };
    for (const k of keys) {
      if (k !== targetKey) merge[k] = targetKey;
    }
    const labels = { ...ds.aliases.labels, [targetKey]: finalLabel };
    await updateAliases({ merge, labels });
    setBusy(false);
    onClose();
  };

  return (
    <Modal title="お店をまとめる" onClose={onClose}>
      <p className="hint-inline" style={{ marginTop: 0 }}>
        選択された{groups.length}件の支払先を、同じお店として1つにまとめます。
      </p>
      <table className="tbl" style={{ marginBottom: 16 }}>
        <thead>
          <tr>
            <th>支払先</th>
            <th className="r">件数</th>
            <th className="r">合計</th>
          </tr>
        </thead>
        <tbody>
          {groups.map((g) => (
            <tr key={g.key}>
              <td>{g.label}</td>
              <td className="r num">{g.tx.length}</td>
              <td className="r num">{yen(g.tx.reduce((s, t) => s - t.amount, 0))}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div style={{ marginBottom: 8, fontSize: 13, color: 'var(--ink-3)' }}>まとめた後の表示名</div>
      <div className="ctrls" style={{ marginBottom: 8, flexWrap: 'wrap' }}>
        {uniqueLabels.map((l) => (
          <label key={l} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
            <input
              type="radio"
              name="mergeLabel"
              checked={!customLabel && selectedLabel === l}
              onChange={() => {
                setSelectedLabel(l);
                setCustomLabel('');
              }}
            />
            {l}
          </label>
        ))}
      </div>
      <input
        type="text"
        placeholder="または新しい表示名を入力"
        value={customLabel}
        onChange={(e) => setCustomLabel(e.target.value)}
        style={{ width: '100%' }}
      />

      <p className="hint-inline">まとめると、決まって出ていくお金の判定もやり直されます。</p>

      <div className="ctrls" style={{ marginTop: 16 }}>
        <button className="backbtn" onClick={handleMerge} disabled={busy}>
          {busy ? '実行中…' : 'まとめる'}
        </button>
        <button className="backbtn" onClick={onClose}>
          取り消す
        </button>
      </div>
    </Modal>
  );
}
