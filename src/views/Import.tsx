import { useRef, useState } from 'react';
import { useDataset } from '../state/DatasetContext';
import { useView } from '../state/ViewContext';
import { PageHead } from '../components/PageHead';
import { Panel } from '../components/Panel';
import { Story } from '../components/Story';
import { EmptyState } from '../components/EmptyState';
import { ymLabel } from '../format/number';
import type { ImportResult } from '../types/dataset';

const STORE_LABEL: Record<string, string> = {
  indexeddb: 'このブラウザに保存済み',
  localstorage: 'このブラウザに保存済み（簡易）',
  memory: '保存されていません',
};

export function Import() {
  const { state: ds, importCsv, importBackupFile, exportBackupFile, resetAll, showDemo, returnToUserData } = useDataset();
  const { goToView } = useView();
  const [dragOver, setDragOver] = useState(false);
  const [busy, setBusy] = useState(false);
  // CSVでもバックアップでもない形式がドロップされた場合のみのローカルな注意書き。
  // それ以外の結果表示は常に ds.lastImport（DatasetContextが最新の内容で更新する）だけを見る。
  // ここで独自に件数等を組み立てると、更新前の値を参照する不整合が起きるため行わない。
  const [dropTypeError, setDropTypeError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const backupInputRef = useRef<HTMLInputElement>(null);

  const span = ds.index.allMonthsSorted.length
    ? `${ymLabel(ds.index.allMonthsSorted[0])} 〜 ${ymLabel(ds.index.allMonthsSorted[ds.index.allMonthsSorted.length - 1])}`
    : '—';

  const runImport = async (files: File[]) => {
    setDropTypeError(null);
    setBusy(true);
    await importCsv(files);
    setBusy(false);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const files = [...(e.dataTransfer?.files ?? [])].filter((f) => /\.csv$/i.test(f.name));
    if (files.length) runImport(files);
    else if (e.dataTransfer?.files.length) setDropTypeError('CSVファイルではありません');
  };

  const lastResults = dropTypeError ? [{ name: '', error: dropTypeError }] : ds.lastImport;
  const okResults = (lastResults ?? []).filter((r): r is Extract<ImportResult, { added: number }> => !('error' in r));
  const errResults = (lastResults ?? []).filter((r): r is { name: string; error: string } => 'error' in r);
  const addedTotal = okResults.reduce((s, r) => s + r.added, 0);
  const dupTotal = okResults.reduce((s, r) => s + r.dup, 0);
  const updatedTotal = okResults.reduce((s, r) => s + r.updated, 0);
  const idChangedTotal = okResults.reduce((s, r) => s + r.idChanged, 0);

  return (
    <div className="page">
      <PageHead
        title="データを読み込む"
        sub={
          ds.isDemo
            ? '今は動作確認用のサンプルデータを表示しています。CSVを読み込むと、あなたのデータに置き換わります。'
            : `${ds.rows.length.toLocaleString('ja-JP')}件 · ${span}`
        }
      />
      <div className="wrap">
        {ds.isDemo && ds.hasSavedData && (
          <div className="hint-inline" style={{ marginBottom: 12 }}>
            保存されているあなたのデータは残っています。ここでCSVを読み込むと、そのデータに追加されます。{' '}
            <button className="linkish" onClick={returnToUserData}>
              自分のデータに戻る
            </button>
          </div>
        )}

        <div
          className={`drop${dragOver ? ' over' : ''}`}
          id="drop"
          tabIndex={0}
          role="button"
          aria-label="CSVファイルを読み込む"
          onClick={() => fileInputRef.current?.click()}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              fileInputRef.current?.click();
            }
          }}
          onDragEnter={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragOver={(e) => e.preventDefault()}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
        >
          {busy ? (
            <>
              <div className="drop-ico">…</div>
              <b>読み込んでいます</b>
            </>
          ) : (
            <>
              <div className="drop-ico">⤓</div>
              <b>CSVファイルをここにドロップ</b>
              <span>マネーフォワード ME の「収入・支出詳細」CSV。複数ファイルを一度に入れられます。</span>
              <span className="drop-btn">ファイルを選ぶ</span>
            </>
          )}
          <input
            ref={fileInputRef}
            type="file"
            className="vh"
            accept=".csv,text/csv"
            multiple
            tabIndex={-1}
            onChange={(e) => {
              if (e.target.files?.length) runImport([...e.target.files]);
              e.target.value = '';
            }}
          />
        </div>

        {lastResults && (
          <Story borderColor={errResults.length ? 'var(--flag)' : 'var(--down)'}>
            {okResults.length > 0 && (
              <>
                <h2 style={{ fontSize: 16 }}>
                  {okResults.length}個のファイルから <em>{addedTotal.toLocaleString('ja-JP')}件</em> を追加しました。
                </h2>
                <div className="hint-inline" style={{ marginTop: 6 }}>
                  すでにあった {dupTotal.toLocaleString('ja-JP')}件 は追加していません。
                  {updatedTotal ? `内容が変わっていた ${updatedTotal.toLocaleString('ja-JP')}件 は新しい方に置き換えました。` : ''}
                </div>
                {idChangedTotal > 0 && (
                  <div className="hint-inline">取引IDが前回と変わっているようです。日付・内容・金額・金融機関で同じ取引と判断しました。</div>
                )}
              </>
            )}
            {errResults.length > 0 && (
              <div className="story-rows" style={{ marginTop: okResults.length ? 12 : 0 }}>
                {errResults.map((e, i) => (
                  <div className="story-row" key={i}>
                    <span className="tag flag">読めず</span>
                    <span>
                      {e.name}：{e.error}
                    </span>
                  </div>
                ))}
              </div>
            )}
            <div className="story-foot">
              <span>ホームの数字はもう新しいデータで計算されています。</span>
              <button className="linkish" onClick={() => goToView('dashboard')}>
                ホームを見る
              </button>
            </div>
          </Story>
        )}

        <div className="cols c-32">
          <Panel title="読み込んだファイル" right={<span className="hint">同じ取引は何度読み込んでも増えません</span>} tight>
            {ds.files.length ? (
              <table className="tbl">
                <thead>
                  <tr>
                    <th>ファイル</th>
                    <th className="hide-sm">期間</th>
                    <th className="r">読んだ行</th>
                    <th className="r">追加</th>
                    <th className="r">重複</th>
                    <th className="r hide-sm">更新</th>
                  </tr>
                </thead>
                <tbody>
                  {ds.files
                    .slice()
                    .reverse()
                    .map((f, i) => (
                      <tr key={i}>
                        <td className="trunc">
                          {f.name}
                          {f.enc !== 'UTF-8' && <span className="chip" style={{ marginLeft: 6 }}>{f.enc}</span>}
                        </td>
                        <td className="hide-sm num" style={{ color: 'var(--ink-4)' }}>
                          {f.span || '—'}
                        </td>
                        <td className="r num">{f.read.toLocaleString('ja-JP')}</td>
                        <td className="r num" style={{ fontWeight: 600 }}>
                          {f.added.toLocaleString('ja-JP')}
                        </td>
                        <td className="r num" style={{ color: 'var(--ink-4)' }}>
                          {f.dup.toLocaleString('ja-JP')}
                        </td>
                        <td className="r num hide-sm" style={{ color: 'var(--ink-4)' }}>
                          {f.updated.toLocaleString('ja-JP')}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            ) : (
              <EmptyState title="まだ読み込んでいません" desc="2024年・2025年・2026年のCSVをまとめて入れてかまいません" />
            )}
          </Panel>

          <Panel title="保存の状態" tight>
            <dl className="dl" style={{ marginBottom: 16 }}>
              <dt>いまの状態</dt>
              <dd>{ds.isDemo ? <span className="chip">サンプル表示中</span> : <span className="chip on">{STORE_LABEL[ds.storeMode]}</span>}</dd>
              <dt>取引</dt>
              <dd className="num">{ds.rows.length.toLocaleString('ja-JP')}件</dd>
              <dt>期間</dt>
              <dd className="num">{span}</dd>
            </dl>
            <p className="hint-inline" style={{ margin: '0 0 14px' }}>
              データはこのパソコンのブラウザの中だけに保存されます。どこにも送信されません。
              ブラウザの閲覧データを消すと一緒に消えるので、ときどきバックアップを書き出しておくと安心です。
              {ds.storeNote && (
                <>
                  <br />
                  <b style={{ color: 'var(--flag)' }}>{ds.storeNote}</b>
                </>
              )}
            </p>
            <div className="ctrls">
              <button className="backbtn" onClick={exportBackupFile}>
                バックアップを書き出す
              </button>
              <button className="backbtn" onClick={() => backupInputRef.current?.click()}>
                バックアップを読み込む
              </button>
              <input
                ref={backupInputRef}
                type="file"
                className="vh"
                accept=".json,application/json"
                tabIndex={-1}
                onChange={async (e) => {
                  const f = e.target.files?.[0];
                  e.target.value = '';
                  if (!f) return;
                  setDropTypeError(null);
                  // 結果は importBackupFile が更新する ds.lastImport 経由で表示される。
                  await importBackupFile(f);
                }}
              />
            </div>
            {!ds.isDemo && (
              <div className="ctrls" style={{ marginTop: 10 }}>
                <button
                  className="backbtn danger"
                  onClick={() => {
                    if (window.confirm('読み込んだデータを全部消します。よろしいですか？')) resetAll();
                  }}
                >
                  読み込んだデータを全部消す
                </button>
                <button className="backbtn" onClick={showDemo}>
                  サンプルに戻して見る
                </button>
              </div>
            )}
          </Panel>
        </div>

        <Panel title="毎月の更新のしかた" quiet>
          <ol className="howto">
            <li>マネーフォワード ME で、その年の「収入・支出詳細」CSVをダウンロードします。</li>
            <li>そのファイルをこの画面にドロップします。年の途中の同じファイルを何度入れても構いません。</li>
            <li>
              取引ごとのIDを照合して、<b>まだ無い取引だけ</b>が足されます。すでにある取引は数えません。
            </li>
            <li>あとから分類やメモを直した取引は、同じIDのまま新しい内容で置き換わります。</li>
          </ol>
          <div className="hint-inline">CSVにID列が無い場合は、日付・内容・金額・金融機関の組み合わせで同じ取引かどうかを判断します。</div>
        </Panel>
      </div>
    </div>
  );
}
