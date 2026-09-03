import type { Transaction } from '../types/transaction';
import type { LivingCost } from '../types/analysis';
import { isExpense, spend } from './filters';
import { isOneoff } from './grouping';
import { isPartialMonth } from './period';
import { median, quantile } from './stats';

/**
 * ひと月の暮らしに必要な額（data-spec.md §8）。
 * 全期間の集計対象支出のうち臨時の支出でないものを年月ごとに合計し、集計途中の月を除外したうえで
 * 中央値・四分位を取る。平均値は使わない（単発の大型出費に引きずられるため）。
 * 対象年ではなく全期間から算出する（安定した基準値であるべきため）。
 */
export function computeLiving(included: Transaction[], anomalyIds: Set<string>, partialMonths: string[]): LivingCost {
  const byM: Record<string, number> = {};
  for (const t of included) {
    if (!isExpense(t)) continue;
    if (isOneoff(t, anomalyIds)) continue;
    byM[t.ym] = (byM[t.ym] ?? 0) + spend(t);
  }
  const vals = Object.keys(byM)
    .filter((m) => !isPartialMonth(m, partialMonths))
    .map((m) => byM[m]);
  return { med: median(vals), q1: quantile(vals, 0.25), q3: quantile(vals, 0.75), n: vals.length };
}
