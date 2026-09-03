import type { MerchantGroup, FixedCost, FixedStatus } from '../types/analysis';
import { THRESHOLDS } from './constants';
import { coefficientOfVariation, sum } from './stats';

function shiftMonth(ym: string, delta: number): string {
  if (!ym) return '';
  let [y, m] = ym.split('-').map(Number);
  m += delta;
  while (m < 1) {
    m += 12;
    y--;
  }
  while (m > 12) {
    m -= 12;
    y++;
  }
  return `${y}-${String(m).padStart(2, '0')}`;
}

export interface FixedDetectionResult {
  fixed: FixedCost[];
  fixedKeys: Set<string>;
}

/**
 * 決まって出ていくお金の検出（data-spec.md §11）。
 * buildIndexの4番目のステップ。merchIndex（§13、支出額>0のみ）に依存する。
 *
 * 3条件すべてを満たすものを固定費とする：
 *   A. 出現月数 >= 6
 *   B. 出現月数 / span >= 0.4（span=最初〜最後の月の間に全体データで存在する月数）
 *   C. 変動係数 <= 0.15
 * 月額は発生期間で月割り（Σ金額 / span）。年額 = 月額 × 12。
 */
export function detectFixed(merchIndex: Record<string, MerchantGroup>, allMonthsSorted: string[]): FixedDetectionResult {
  const fixed: FixedCost[] = [];

  for (const group of Object.values(merchIndex)) {
    const byM: Record<string, number> = {};
    for (const t of group.tx) byM[t.ym] = (byM[t.ym] ?? 0) + (-t.amount);
    const months = Object.keys(byM).sort();
    const vals = months.map((m) => byM[m]);

    if (months.length < THRESHOLDS.FIXED_MIN_MONTHS) continue;

    const first = months[0];
    const last = months[months.length - 1];
    const span = allMonthsSorted.filter((m) => m >= first && m <= last).length || 1;
    if (months.length / span < THRESHOLDS.FIXED_MIN_COVERAGE) continue;

    const cv = coefficientOfVariation(vals);
    if (cv > THRESHOLDS.FIXED_MAX_CV) continue;

    const perMonth = sum(vals) / span; // 月割り（隔月請求等で年額が過大にならないようにする）
    const unit = sum(vals) / vals.length; // 単純平均（変動係数の算出に使用済み）

    const newest = allMonthsSorted[allMonthsSorted.length - 1] ?? '';
    // 最新月は集計途中の可能性があるため除いた直近 FIXED_RECENT_MONTHS 件で判定する
    const recent = allMonthsSorted.slice(-(THRESHOLDS.FIXED_RECENT_MONTHS + 1), -1);
    const active = recent.some((m) => byM[m] !== undefined);
    const cutoff = shiftMonth(newest, -THRESHOLDS.FIXED_NEW_WITHIN_MONTHS);
    const status: FixedStatus = !active ? 'stopped' : first >= cutoff ? 'new' : 'on';

    fixed.push({
      ...group,
      months,
      byM,
      mean: perMonth,
      unit,
      cv,
      yearly: perMonth * 12,
      status,
      total: sum(vals),
      n: group.tx.length,
      span,
    });
  }

  fixed.sort((a, b) => b.mean - a.mean);
  return { fixed, fixedKeys: new Set(fixed.map((f) => f.key)) };
}
