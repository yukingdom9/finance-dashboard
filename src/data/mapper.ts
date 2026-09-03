import { parseCSV } from './csv';
import type { Transaction } from '../types/transaction';

/**
 * 列名の対応表（data-spec.md §1-2）。
 * 「金額（円）」は「金額(円)」「金額」も、「保有金融機関」は「金融機関」も受け付ける。
 * それ以外は完全一致で判定する。
 */
const COLMAP: Record<string, string[]> = {
  include: ['計算対象'],
  date: ['日付'],
  name: ['内容'],
  amount: ['金額（円）', '金額(円)', '金額'],
  bank: ['保有金融機関', '金融機関'],
  cat: ['大項目'],
  sub: ['中項目'],
  memo: ['メモ'],
  transfer: ['振替'],
  id: ['ID', 'Id', 'id'],
};

type ColIndex = Record<keyof typeof COLMAP, number>;

function findCols(header: string[]): ColIndex {
  const h = header.map((x) => x.replace(/^﻿/, '').trim());
  const idx = {} as ColIndex;
  for (const key of Object.keys(COLMAP) as (keyof typeof COLMAP)[]) {
    idx[key] = h.findIndex((c) => COLMAP[key].includes(c));
  }
  return idx;
}

function toNumber(s: string | undefined): number {
  return parseInt(String(s ?? '').replace(/[^0-9-]/g, ''), 10) || 0;
}

interface ParsedDate {
  y: number;
  m: number;
  d: number;
  date: string;
  ym: string;
}

/** data-spec.md §3-2：一致しない行はスキップする */
function parseDate(s: string | undefined): ParsedDate | null {
  const m = String(s ?? '')
    .trim()
    .match(/(\d{4})[/\-年](\d{1,2})[/\-月](\d{1,2})/);
  if (!m) return null;
  const y = +m[1];
  const mo = +m[2];
  const d = +m[3];
  return {
    y,
    m: mo,
    d,
    date: `${y}/${String(mo).padStart(2, '0')}/${String(d).padStart(2, '0')}`,
    ym: `${y}-${String(mo).padStart(2, '0')}`,
  };
}

/**
 * IDが無いCSV向けの代替キー（data-spec.md §3-3）。
 * 同一日に同一店で同一金額の取引が2件あると同一視される限界がある。
 */
export function fallbackId(o: { date: string; name: string; amount: number; bank: string }): string {
  const s = `${o.date}|${o.name}|${o.amount}|${o.bank}`;
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) | 0;
  }
  return 'K' + (h >>> 0).toString(36);
}

export interface CsvToRowsResult {
  rows: Transaction[];
  /** 必須列（日付・金額・大項目）が無い場合のエラー文言 */
  error?: string;
  /** 日付が解析できずスキップした行数 */
  skipped: number;
  /** ID列があったか */
  hasId: boolean;
}

/**
 * CSVの1ファイル分のテキストを Transaction[] に変換する（data-spec.md §1, §3-1, §3-2）。
 * 必須列（日付・金額・大項目）を欠く場合はそのファイル全体をエラーとする（features.md F-01）。
 */
export function csvToRows(text: string, fileName: string): CsvToRowsResult {
  const raw = parseCSV(text);
  if (!raw.length) {
    return { rows: [], error: '中身が空でした', skipped: 0, hasId: false };
  }
  const idx = findCols(raw[0]);
  if (idx.date < 0 || idx.amount < 0 || idx.cat < 0) {
    return {
      rows: [],
      error: 'マネーフォワードの「収入・支出詳細」CSVではないようです（日付・金額・大項目の列が見つかりません）',
      skipped: 0,
      hasId: false,
    };
  }

  const rows: Transaction[] = [];
  let skipped = 0;
  for (let i = 1; i < raw.length; i++) {
    const r = raw[i];
    const dt = parseDate(r[idx.date]);
    if (!dt) {
      skipped++;
      continue;
    }
    const name = (r[idx.name] ?? '').trim() || '（内容なし）';
    const bank = (idx.bank >= 0 ? r[idx.bank] : '')?.trim() || '不明';
    const amount = toNumber(r[idx.amount]);
    const draft = {
      include: (idx.include >= 0 ? (toNumber(r[idx.include]) === 1 ? 1 : 0) : 1) as 0 | 1,
      transfer: (idx.transfer >= 0 ? (toNumber(r[idx.transfer]) === 1 ? 1 : 0) : 0) as 0 | 1,
      date: dt.date,
      ym: dt.ym,
      y: dt.y,
      m: dt.m,
      name,
      amount,
      bank,
      cat: (r[idx.cat] ?? '未分類').trim() || '未分類',
      sub: (idx.sub >= 0 ? r[idx.sub] : '')?.trim() || '未分類',
      memo: (idx.memo >= 0 ? r[idx.memo] : '')?.trim() ?? '',
      src: fileName,
    };
    const id = idx.id >= 0 && String(r[idx.id] ?? '').trim() ? String(r[idx.id]).trim() : fallbackId(draft);
    rows.push({ ...draft, id });
  }
  return { rows, skipped, hasId: idx.id >= 0 };
}
