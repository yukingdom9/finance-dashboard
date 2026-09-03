import type { Transaction } from '../types/transaction';
import type { BonusSkew } from '../types/analysis';
import { THRESHOLDS } from './constants';

/**
 * 賞与月の検出と偏り判定（features.md F-24、本番で新規実装）。
 * data-spec.md には計算式の記載が薄いため、features.md の記述を正として実装する。
 *
 * 賞与月 ⟺ 中項目「給与」のレコードが同一年月に2件以上ある
 */
export function detectBonusMonths(included: Transaction[], y: number): string[] {
  const counts: Record<string, number> = {};
  for (const t of included) {
    if (t.y === y && t.cat === '収入' && t.sub === '給与') {
      counts[t.ym] = (counts[t.ym] ?? 0) + 1;
    }
  }
  return Object.keys(counts)
    .filter((ym) => counts[ym] >= 2)
    .sort();
}

/**
 * 比較期間（1〜upto月）における賞与の偏り判定。
 *   年間の賞与月数 B、比較期間に含まれる賞与月数 b、期間比率 r = upto/12
 *   偏りあり ⟺ B > 0 かつ |b/B − r| > 0.15
 */
export function bonusSkew(included: Transaction[], y: number, upto: number): BonusSkew {
  const bonusMonths = detectBonusMonths(included, y);
  const bCount = bonusMonths.length;
  const bInPeriod = bonusMonths.filter((ym) => Number(ym.split('-')[1]) <= upto).length;
  const periodRatio = upto / 12;
  const skewed = bCount > 0 && Math.abs(bInPeriod / bCount - periodRatio) > THRESHOLDS.BONUS_SKEW_THRESHOLD;
  return { bonusMonths, bCount, bInPeriod, periodRatio, skewed };
}
