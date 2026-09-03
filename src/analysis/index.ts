import type { Transaction } from '../types/transaction';
import type { AliasMap } from '../types/dataset';
import type { DerivedIndex } from '../types/analysis';
import { isIncluded, isExpense, isIncome, spend } from './filters';
import { computeMonthCounts, computePartialMonths, allMonthsSorted } from './period';
import { buildMerchantIndex } from './merchant';
import { detectFixed } from './fixed';
import { computeMedians, detectAnomalies } from './anomaly';
import { computeLiving } from './living';
import { yearAgg, categoryAgg, monthlySeries } from './aggregate';
import { sum } from './stats';

/**
 * 全派生データの構築（architecture.md §9-2）。
 * 依存関係があるため、この順序を厳守する：
 *   1. included / expenses / incomes / years（§4）
 *   2. monthCounts / partialMonths（§6）
 *   3. merchIndex（支払先の索引、支出額>0のみ）（§13）
 *   4. fixed / fixedKeys（§11）… 3に依存
 *   5. subMedian / catMedian（§12）
 *   6. anomalies / anomalyIds（§12）… 4,5に依存（固定費は異常値判定から除外するため）
 *   7. living（§8）… 6に依存（臨時の判定に異常値を使うため）
 */
export function buildIndex(rows: Transaction[], aliases: AliasMap): DerivedIndex {
  const all = rows.slice().sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
  const included = all.filter(isIncluded);
  const expenses = included.filter(isExpense);
  const incomes = included.filter(isIncome);
  const years = [...new Set(included.map((t) => t.y))].sort((a, b) => a - b);

  const monthCounts = computeMonthCounts(included);
  const partialMonths = computePartialMonths(monthCounts);
  const monthsSorted = allMonthsSorted(monthCounts);

  const merchIndex = buildMerchantIndex(expenses, aliases);

  const { fixed, fixedKeys } = detectFixed(merchIndex, monthsSorted);

  const tables = computeMedians(expenses);

  const anomalies = detectAnomalies(expenses, merchIndex, fixedKeys, tables, aliases);
  const anomalyIds = new Set(anomalies.map((a) => a.tx.id));

  const living = computeLiving(included, anomalyIds, partialMonths);

  const index: DerivedIndex = {
    all,
    included,
    expenses,
    incomes,
    years,
    monthCounts,
    allMonthsSorted: monthsSorted,
    partialMonths,
    merchIndex,
    fixed,
    fixedKeys,
    subMedian: tables.subMedian,
    catMedian: tables.catMedian,
    anomalies,
    anomalyIds,
    living,
  };

  if (import.meta.env?.DEV) validateIndex(index);
  return index;
}

/**
 * 開発時の検証（architecture.md §12-4）。本番ビルドでは実行しない。
 * 不一致があればコンソールに警告を出すのみで、例外は投げない。
 */
function validateIndex(idx: DerivedIndex): void {
  const incomeTotal = sum(idx.incomes, (t) => t.amount);
  const expenseTotal = sum(idx.expenses, spend);
  const includedTotal = sum(idx.included, (t) => t.amount);
  // included = incomes ∪ expenses（重複・漏れなし）なので、符号を揃えれば必ず一致するはず
  if (Math.round(incomeTotal - expenseTotal - includedTotal) !== 0) {
    console.warn('[buildIndex検証] 収入・支出の合計が全取引の合計と一致しません', {
      incomeTotal,
      expenseTotal,
      includedTotal,
    });
  }

  for (const y of idx.years) {
    const monthlyTotal = sum(monthlySeries(idx.included, y, isExpense));
    const yearTotal = yearAgg(idx.included, y, 12, idx.anomalyIds).total;
    if (Math.round(monthlyTotal - yearTotal) !== 0) {
      console.warn(`[buildIndex検証] ${y}年：月次系列の合計が年次集計と一致しません`, { monthlyTotal, yearTotal });
    }
    const catTotal = sum(Object.values(categoryAgg(idx.included, y, 12)));
    if (Math.round(catTotal - yearTotal) !== 0) {
      console.warn(`[buildIndex検証] ${y}年：カテゴリー別合計の総和が総支出と一致しません`, { catTotal, yearTotal });
    }
  }
}
