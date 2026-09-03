import { decodeCSV } from './decode';
import { csvToRows } from './mapper';
import { mergeRows } from './merge';
import { storeLoad } from './store';
import type { Transaction } from '../types/transaction';
import type { AliasMap, ImportRecord, ImportResult } from '../types/dataset';
import { emptyAliasMap } from '../types/dataset';
import { ymLabel } from '../format/number';

export interface ImportContext {
  /** サンプル表示中かどうか */
  isDemo: boolean;
  /** 現在表示中の取引（isDemo=false のときの起点） */
  currentRows: Transaction[];
  currentFiles: ImportRecord[];
  /** 現在の名寄せエイリアス（isDemo=false のときの起点） */
  currentAliases: AliasMap;
}

export interface ImportOutcome {
  rows: Transaction[];
  files: ImportRecord[];
  /** 起点として採用したエイリアス（状態Bでは保存領域のものを読み直す。§3-6と同じ理由） */
  aliases: AliasMap;
  results: ImportResult[];
}

/**
 * CSVファイル群の取り込み（features.md F-01）。
 *
 * 【重要】取り込みの起点データの決定は data-spec.md §3-6 を厳守する。
 * サンプル表示中（isDemo=true）に取り込む場合、画面上のサンプル配列や空配列を起点にしてはならない。
 * 必ず保存領域を読み直し、保存済みの利用者データがあれば（状態B）それを起点にする。
 * これを誤ると、取り込み後の保存で保存済みデータが上書きされ、利用者の全履歴が黙って失われる
 * （ワイヤーフレームで実際に確認された既知の欠陥。architecture.md §6-2b）。
 */
export async function importFiles(fileList: File[], ctx: ImportContext): Promise<ImportOutcome> {
  let rows: Transaction[];
  let files: ImportRecord[];
  let aliases: AliasMap;

  if (ctx.isDemo) {
    const loaded = await storeLoad();
    if (loaded.status === 'ok') {
      // 状態B：サンプル表示中だが保存済みの利用者データがある → それを起点にする
      rows = loaded.dataset.rows;
      files = loaded.dataset.files.slice();
      aliases = loaded.dataset.aliases;
    } else {
      // 状態A：保存済みデータなし → 空の配列から開始する
      rows = [];
      files = [];
      aliases = emptyAliasMap();
    }
  } else {
    // 状態C：利用者データ表示中 → 現在表示中のデータを起点にする
    rows = ctx.currentRows;
    files = ctx.currentFiles.slice();
    aliases = ctx.currentAliases;
  }

  const results: ImportResult[] = [];

  for (const f of fileList) {
    const buf = await f.arrayBuffer();
    const { text, enc } = decodeCSV(buf);
    const { rows: parsed, error, skipped, hasId } = csvToRows(text, f.name);
    if (error) {
      results.push({ name: f.name, error });
      continue;
    }
    const m = mergeRows(rows, parsed);
    rows = m.rows;
    const yms = parsed.map((r) => r.ym).sort();
    const span = yms.length ? `${ymLabel(yms[0])}〜${ymLabel(yms[yms.length - 1])}` : '';
    const rec: ImportRecord = {
      name: f.name,
      enc,
      read: parsed.length,
      added: m.added,
      dup: m.duplicate,
      updated: m.updated,
      skipped,
      idChanged: m.idChanged,
      hasId,
      span,
      at: new Date().toISOString(),
    };
    files.push(rec);
    results.push(rec);
    // 大きなファイルでUIが固まらないよう、ファイル単位でイベントループを解放する（architecture.md §6-3）
    await Promise.resolve();
  }

  // data-spec.md §3-5：統合後、日付の降順で保持する
  rows = rows.slice().sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));

  return { rows, files, aliases, results };
}
