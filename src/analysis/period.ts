import type { Transaction } from '../types/transaction';
import { THRESHOLDS } from './constants';
import { median } from './stats';

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

/** 年月ごとの集計対象レコード数（data-spec.md §6） */
export function computeMonthCounts(included: Transaction[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const t of included) counts[t.ym] = (counts[t.ym] ?? 0) + 1;
  return counts;
}

/** 全データの年月（昇順・重複なし） */
export function allMonthsSorted(monthCounts: Record<string, number>): string[] {
  return Object.keys(monthCounts).sort();
}

/**
 * 集計途中の月の判定（data-spec.md §6）。
 * 判定対象は「データ全体の最初の月」と「最後の月」に限定する。中間の月は件数が少なくても
 * 集計途中ではない（長期の旅行・入院等で取引が減った月を誤って除外しないため）。
 */
export function computePartialMonths(monthCounts: Record<string, number>): string[] {
  const months = allMonthsSorted(monthCounts);
  if (!months.length) return [];
  const medCount = median(Object.values(monthCounts));
  const first = months[0];
  const last = months[months.length - 1];
  const result: string[] = [];
  if (monthCounts[first] < medCount * THRESHOLDS.PARTIAL_MONTH_RATIO) result.push(first);
  if (last !== first && monthCounts[last] < medCount * THRESHOLDS.PARTIAL_MONTH_RATIO) result.push(last);
  return result;
}

export function isPartialMonth(ym: string, partialMonths: string[]): boolean {
  return partialMonths.includes(ym);
}

/**
 * 年ごとの「完了している最終月」（data-spec.md §6）。
 * その年に存在する月のうち、集計途中でない最大の月。該当が無ければ12。
 */
export function lastCompleteMonth(y: number, included: Transaction[], partialMonths: string[]): number {
  const months = [...new Set(included.filter((t) => t.y === y).map((t) => t.m))].sort((a, b) => a - b);
  let last = 0;
  for (const m of months) {
    const ym = `${y}-${pad2(m)}`;
    if (!isPartialMonth(ym, partialMonths)) last = Math.max(last, m);
  }
  return last || 12;
}

/**
 * 比較期間の決定（data-spec.md §7-1）。年途中のデータを前年12ヶ月と比較する事故を構造的に防ぐ。
 * 比較年が無い（null）場合は対象年単独の lastCompleteMonth を返す。
 */
export function alignMonths(y: number, cy: number | null, included: Transaction[], partialMonths: string[]): number {
  const lcm1 = lastCompleteMonth(y, included, partialMonths);
  if (cy == null) return lcm1;
  const lcm2 = lastCompleteMonth(cy, included, partialMonths);
  return Math.min(lcm1, lcm2);
}
