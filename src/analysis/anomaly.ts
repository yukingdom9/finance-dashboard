import type { Transaction } from '../types/transaction';
import type { AliasMap } from '../types/dataset';
import type { Anomaly, MerchantGroup } from '../types/analysis';
import { isExpense, spend } from './filters';
import { THRESHOLDS } from './constants';
import { median } from './stats';
import { merchantKey } from './merchant';

export interface MedianTables {
  subMedian: Record<string, number>;
  catMedian: Record<string, number>;
}

/** 中項目・大項目ごとの支出中央値（data-spec.md §12 条件3の基準）。buildIndexの5番目のステップ。 */
export function computeMedians(expenses: Transaction[]): MedianTables {
  const subGroups: Record<string, number[]> = {};
  const catGroups: Record<string, number[]> = {};
  for (const t of expenses) {
    if (!isExpense(t)) continue;
    const subKey = `${t.cat}/${t.sub}`;
    (subGroups[subKey] ??= []).push(spend(t));
    (catGroups[t.cat] ??= []).push(spend(t));
  }
  const subMedian: Record<string, number> = {};
  for (const k of Object.keys(subGroups)) subMedian[k] = median(subGroups[k]);
  const catMedian: Record<string, number> = {};
  for (const k of Object.keys(catGroups)) catMedian[k] = median(catGroups[k]);
  return { subMedian, catMedian };
}

/** 「ふだんの1回」。中項目に該当が無ければ大項目の中央値（data-spec.md §12 条件3） */
export function usualAmount(t: Transaction, tables: MedianTables): number {
  return tables.subMedian[`${t.cat}/${t.sub}`] || tables.catMedian[t.cat] || 0;
}

/**
 * いつもと違う支出の判定（data-spec.md §12）。buildIndexの6番目のステップ。
 * fixed（4番目）・subMedian/catMedian（5番目）に依存する。
 *
 * すべての条件を満たすものを異常値とする：
 *   条件1：支出額 >= 10,000
 *   条件2：その支払先が固定費として検出されていない
 *   条件3：支出額 >= usual(t) × 5
 *   条件4：その支払先の取引が2件以上ある場合、支出額 >= その支払先の中央値 × 2.5
 */
export function detectAnomalies(
  expenses: Transaction[],
  merchIndex: Record<string, MerchantGroup>,
  fixedKeys: Set<string>,
  tables: MedianTables,
  aliases: AliasMap,
): Anomaly[] {
  const result: Anomaly[] = [];
  for (const t of expenses) {
    if (!isExpense(t)) continue;
    const a = spend(t);
    if (a < THRESHOLDS.ANOMALY_MIN_AMOUNT) continue;

    const key = merchantKey(t, aliases);
    if (fixedKeys.has(key)) continue;

    const usual = usualAmount(t, tables);
    if (!usual || a < usual * THRESHOLDS.ANOMALY_SUB_RATIO) continue;

    const merchant = merchIndex[key];
    if (merchant && merchant.tx.length >= 2 && a < merchant.med * THRESHOLDS.ANOMALY_MERCHANT_RATIO) continue;

    result.push({ tx: t, usual, ratio: usual ? a / usual : 0 });
  }
  return result;
}
