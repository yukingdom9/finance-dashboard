import type { Transaction } from '../types/transaction';
import { alignMonths } from './period';
import { yearAgg } from './aggregate';

export interface ForecastResult {
  /** 残り月数。0なら「年の集計が完了」として試算しない */
  remain: number;
  /** 試算額。remain=0のときは null */
  estimate: number | null;
  /** 試算に使った月あたりの暮らしの支出 */
  monthlyReg: number;
}

/**
 * 支出ペースの試算（data-spec.md §14）。
 * 臨時の支出は含めない（発生時期が予測できないため）。統計的な予測ではなく単純な外挿。
 */
export function forecastSpending(
  included: Transaction[],
  y: number,
  cy: number | null,
  partialMonths: string[],
  anomalyIds: Set<string>,
): ForecastResult {
  const done = alignMonths(y, cy, included, partialMonths);
  const remain = 12 - done;
  const a = yearAgg(included, y, done, anomalyIds);
  const monthlyReg = done ? a.reg / done : 0;
  if (remain <= 0) return { remain: 0, estimate: null, monthlyReg };
  const estimate = a.total + monthlyReg * remain;
  return { remain, estimate, monthlyReg };
}
