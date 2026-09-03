/**
 * 取引レコード（内部形式）
 * data-spec.md §3-1 を正とする。
 *
 * 注意（architecture.md §14 原則2）：
 * 将来別のデータ源が加わる可能性があるため、フィールド名はCSVの列名ではなく「意味」で定義する。
 */
export interface Transaction {
  /** 重複排除のキー。ID列があればそれ、無ければ代替キー（data-spec §3-3） */
  id: string;
  /** YYYY/MM/DD に正規化した日付 */
  date: string;
  /** 年 */
  y: number;
  /** 月（1〜12） */
  m: number;
  /** YYYY-MM */
  ym: string;
  /** 内容（店舗名・振込先等）。空なら「（内容なし）」 */
  name: string;
  /** 金額（円）。支出は負、収入は正 */
  amount: number;
  /** 保有金融機関。空なら「不明」 */
  bank: string;
  /** 大項目。空なら「未分類」 */
  cat: string;
  /** 中項目。空なら「未分類」 */
  sub: string;
  /** メモ */
  memo: string;
  /** 計算対象フラグ。列が無い場合は 1 とみなす */
  include: 0 | 1;
  /** 振替フラグ。列が無い場合は 0 とみなす */
  transfer: 0 | 1;
  /** 取り込み元のファイル名 */
  src: string;
}

/** CSVの1行から Transaction への変換途中で使う、まだIDが確定していない形 */
export type TransactionDraft = Omit<Transaction, 'id'> & { id?: string };
