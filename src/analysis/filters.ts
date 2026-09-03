import type { Transaction } from '../types/transaction';

/** 集計対象の判定（data-spec.md §4、最重要）。transfer 列だけでフィルタしてはならない。 */
export function isIncluded(t: Transaction): boolean {
  return t.include === 1;
}

/** 収入 ⟺ cat === '収入' */
export function isIncome(t: Transaction): boolean {
  return t.cat === '収入';
}

/** 支出 ⟺ cat !== '収入' */
export function isExpense(t: Transaction): boolean {
  return t.cat !== '収入';
}

/** 支出額（正の値に変換）。返金等で amount が正の支出行はそのまま負の支出額になる（data-spec.md §4） */
export function spend(t: Transaction): number {
  return -t.amount;
}

/** 給与収入 ⟺ cat === '収入' かつ sub === '給与' */
export function isSalary(t: Transaction): boolean {
  return t.cat === '収入' && t.sub === '給与';
}
