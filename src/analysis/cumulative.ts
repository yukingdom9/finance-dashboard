import type { Transaction } from '../types/transaction';
import { monthlySeries } from './aggregate';
import { isExpense } from './filters';

/**
 * 累計（data-spec.md §10）。
 * 対象年は集計済みの月まで（limit指定）、比較年は12ヶ月分（limit=null）で呼び出す。
 */
export function cumulativeSeries(included: Transaction[], y: number, limit: number | null): number[] {
  const monthly = monthlySeries(included, y, isExpense);
  const out: number[] = [];
  let acc = 0;
  for (let i = 0; i < 12; i++) {
    if (limit != null && i >= limit) break;
    acc += monthly[i];
    out.push(acc);
  }
  return out;
}
