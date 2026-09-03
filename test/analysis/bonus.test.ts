import { describe, it, expect } from 'vitest';
import { detectBonusMonths, bonusSkew } from '../../src/analysis/bonus';
import type { Transaction } from '../../src/types/transaction';

function income(id: string, ym: string, sub = '給与'): Transaction {
  const [y, m] = ym.split('-').map(Number);
  return {
    id,
    date: `${ym.replace('-', '/')}/01`,
    y,
    m,
    ym,
    name: '給与',
    amount: 300000,
    bank: '銀行',
    cat: '収入',
    sub,
    memo: '',
    include: 1,
    transfer: 0,
    src: 'test.csv',
  };
}

describe('detectBonusMonths（features.md F-24）', () => {
  it('中項目「給与」が同一年月に2件以上ある月を賞与月とする', () => {
    const rows = [income('a', '2026-03'), income('b', '2026-03'), income('c', '2026-06'), income('d', '2026-12'), income('e', '2026-12')];
    expect(detectBonusMonths(rows, 2026)).toEqual(['2026-03', '2026-12']);
  });

  it('その他収入（sub!==給与）は賞与判定に数えない', () => {
    const rows = [income('a', '2026-03'), income('b', '2026-03', 'ポイント')];
    expect(detectBonusMonths(rows, 2026)).toEqual([]);
  });
});

describe('bonusSkew（features.md F-24）', () => {
  it('年2回（3月・12月）の賞与を1〜8月で比較すると期間比率とずれて偏りありと判定する', () => {
    const rows = [income('a', '2026-03'), income('b', '2026-03'), income('c', '2026-12'), income('d', '2026-12')];
    const skew = bonusSkew(rows, 2026, 8);
    expect(skew.bCount).toBe(2);
    expect(skew.bInPeriod).toBe(1); // 3月のみ
    expect(skew.periodRatio).toBeCloseTo(8 / 12);
    // |1/2 - 8/12| = |0.5 - 0.667| = 0.167 > 0.15
    expect(skew.skewed).toBe(true);
  });

  it('賞与が無い年は偏りなし', () => {
    const skew = bonusSkew([], 2026, 8);
    expect(skew.bCount).toBe(0);
    expect(skew.skewed).toBe(false);
  });

  it('通年（upto=12）なら期間比率1に対しbInPeriod/bCountも1で偏りなし', () => {
    const rows = [income('a', '2026-03'), income('b', '2026-03'), income('c', '2026-12'), income('d', '2026-12')];
    const skew = bonusSkew(rows, 2026, 12);
    expect(skew.skewed).toBe(false);
  });
});
