import type { StoredDataset } from '../types/dataset';
import { normalizeSchema } from './store';

/**
 * バックアップJSONの書き出し（architecture.md §7-3）。
 * ファイル名は money-flow-backup-YYYY-MM-DD.json。
 * バックアップJSONには個人情報を含む取引がそのまま入るため、
 * 呼び出し側（V-09）で保存場所の注意文言を必ず添えること（features.md F-02）。
 */
export function exportBackup(dataset: StoredDataset): void {
  const blob = new Blob([JSON.stringify(dataset, null, 0)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `money-flow-backup-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

export type ImportBackupResult =
  | { status: 'ok'; dataset: StoredDataset }
  | { status: 'newer'; savedVersion: number }
  | { status: 'corrupt'; error: string };

/**
 * バックアップJSONの読み込み。
 * data-spec.md §6-2「JSONバックアップの形式不正：rows が配列でない → 読み込まず、
 * 既存データを保持したままエラー表示」に従い、失敗時は例外を投げず結果オブジェクトで返す
 * （architecture.md §12-2：データ層は例外を投げず結果に error を含める）。
 */
export async function importBackup(file: File): Promise<ImportBackupResult> {
  let raw: unknown;
  try {
    raw = JSON.parse(await file.text());
  } catch {
    return { status: 'corrupt', error: 'バックアップの形式が違います' };
  }
  const result = normalizeSchema(raw);
  if (result.status === 'ok') return { status: 'ok', dataset: result.dataset };
  if (result.status === 'newer') return result;
  return { status: 'corrupt', error: 'バックアップの形式が違います' };
}
