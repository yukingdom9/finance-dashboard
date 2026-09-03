import type { Transaction } from './transaction';

/** CSV取り込み1ファイル分の履歴（features.md F-01 出力／ui-spec.md V-09） */
export interface ImportRecord {
  name: string;
  /** 'UTF-8' | 'Shift_JIS' */
  enc: 'UTF-8' | 'Shift_JIS';
  /** 読んだ行数（ヘッダーを除く、日付解析に成功した行） */
  read: number;
  added: number;
  dup: number;
  updated: number;
  /** 日付が解析できずスキップした行数（data-spec.md §6-2） */
  skipped: number;
  /** IDが未知だが内容キーで一致し、IDが変わったと判定された件数（data-spec.md §3-3） */
  idChanged: number;
  /** ID列があったか */
  hasId: boolean;
  /** 対象期間（表示用文字列） */
  span: string;
  at: string;
}

/**
 * 支払先の手動名寄せ（F-22）。
 *
 * data-spec.md §13-3 が定義する「統合元キー→統合先キー」のマップ（merge）に加え、
 * labels（統合先キー→表示名）を実装判断として追加している。
 *
 * 理由：ui-spec.md M-03「まとめた後の表示名を選ぶ（選択肢の中から、または入力）」を満たすには、
 * data-spec §13-2 の既定ルール（グループの最初の取引の displayName を使う）だけでは
 * 利用者が自由入力した表示名を保持できない。labels は集計・判定ロジックには一切関与しない
 * 表示専用の情報であり、data-spec.md が「唯一の正」とする計算ロジックの範囲外の追加のため、
 * 既存設計と矛盾しないと判断した。
 */
export interface AliasMap {
  merge: Record<string, string>;
  labels: Record<string, string>;
}

export function emptyAliasMap(): AliasMap {
  return { merge: {}, labels: {} };
}

/** 保存データ／バックアップJSONの形式（data-spec.md §3-4）。schemaVersion は後から追加できない */
export interface StoredDataset {
  schemaVersion: number;
  rows: Transaction[];
  files: ImportRecord[];
  aliases: AliasMap;
  savedAt: string;
}

export const SCHEMA_VERSION = 1;

export type StoreMode = 'indexeddb' | 'localstorage' | 'memory';

export interface ImportResultOk extends ImportRecord {
  error?: undefined;
}
export interface ImportResultError {
  name: string;
  error: string;
}
export type ImportResult = ImportResultOk | ImportResultError;
