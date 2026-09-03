import type { Transaction } from '../types/transaction';
import type { CategoryDelta } from '../types/analysis';
import { categoryAgg } from './aggregate';
import { THRESHOLDS } from './constants';

/**
 * カテゴリー別の増減（data-spec.md §7-2）。
 * B[k] > 0 の条件は必須：返金でB[k]が負になり符号が反転する事故（実データで発生確認済み）を防ぐ。
 */
export function categoryDeltas(included: Transaction[], y: number, cy: number, upto: number): CategoryDelta[] {
  const a = categoryAgg(included, y, upto);
  const b = categoryAgg(included, cy, upto);
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  const list: CategoryDelta[] = [];
  for (const k of keys) {
    const cur = a[k] ?? 0;
    const prev = b[k] ?? 0;
    const d = cur - prev;
    const p = prev > 0 ? (d / prev) * 100 : null;
    list.push({ k, cur, prev, d, p });
  }
  return list.sort((x, y2) => y2.d - x.d);
}

export interface SummaryDelta {
  hasComparison: boolean;
  /** |d| < 1,000 のとき true（「±」表示・横ばい扱い） */
  flat: boolean;
  direction: 'up' | 'down' | 'flat';
  /** true なら割合、false なら金額差で表示する */
  usePct: boolean;
  /** usePct なら割合(%)、そうでなければ金額差（円） */
  value: number;
}

/**
 * サマリー指標の増減表示（data-spec.md §7-3）。
 * 割合を使う条件：|base| > scale×0.08 かつ |base| > 50,000。満たさなければ金額差を表示する。
 * base が無い（比較年のデータなし）場合は hasComparison=false を返す。
 */
export function summaryDelta(d: number, base: number | null, scale: number): SummaryDelta {
  if (base === null) {
    return { hasComparison: false, flat: true, direction: 'flat', usePct: false, value: 0 };
  }
  const flat = Math.abs(d) < THRESHOLDS.FLAT_DELTA_ABS;
  const direction: SummaryDelta['direction'] = flat ? 'flat' : d > 0 ? 'up' : 'down';
  const usePct =
    Math.abs(base) > scale * THRESHOLDS.SUMMARY_PCT_MIN_BASE_RATIO && Math.abs(base) > THRESHOLDS.SUMMARY_PCT_MIN_BASE_ABS;
  const value = usePct ? (d / Math.abs(base)) * 100 : d;
  return { hasComparison: true, flat, direction, usePct, value };
}
