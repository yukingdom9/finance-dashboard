import type { Transaction } from '../types/transaction';
import type { YearAgg } from '../types/analysis';
import { isIncome, isExpense, isSalary, spend } from './filters';
import { isOneoff } from './grouping';
import { sum } from './stats';

/** 対象年・上限月で絞り込んだ取引（集計対象前提の配列に対して使う） */
export function yearSlice(included: Transaction[], y: number, upto: number): Transaction[] {
  return included.filter((t) => t.y === y && t.m <= upto);
}

/** 年次集計（data-spec.md §5） */
export function yearAgg(included: Transaction[], y: number, upto: number, anomalyIds: Set<string>): YearAgg {
  const s = yearSlice(included, y, upto);
  const exp = s.filter(isExpense);
  const inc = s.filter(isIncome);
  const salary = sum(inc.filter(isSalary), (t) => t.amount);
  const other = sum(
    inc.filter((t) => !isSalary(t)),
    (t) => t.amount,
  );
  const income = salary + other;
  const total = sum(exp, spend);
  const oneoff = sum(
    exp.filter((t) => isOneoff(t, anomalyIds)),
    spend,
  );
  const reg = total - oneoff;
  const savings = income - total;
  const rate = income ? (savings / income) * 100 : 0;
  return { y, upto, salary, other, income, total, oneoff, reg, savings, rate };
}

/** カテゴリー別の支出合計（data-spec.md §7-2 の入力） */
export function categoryAgg(included: Transaction[], y: number, upto: number): Record<string, number> {
  const m: Record<string, number> = {};
  for (const t of yearSlice(included, y, upto)) {
    if (isExpense(t)) m[t.cat] = (m[t.cat] ?? 0) + spend(t);
  }
  return m;
}

/**
 * 月次系列（data-spec.md §6）。長さ12の配列。
 * predicate に合致し、かつ対象年に属する取引を月ごとに積算する。
 * 収入は amount（符号そのまま）、支出は spend()（正の値）で積算する。
 */
export function monthlySeries(included: Transaction[], y: number, predicate: (t: Transaction) => boolean): number[] {
  const out = new Array(12).fill(0) as number[];
  for (const t of included) {
    if (t.y === y && predicate(t)) {
      out[t.m - 1] += isIncome(t) ? t.amount : spend(t);
    }
  }
  return out;
}
