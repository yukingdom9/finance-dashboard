import { describe, it, expect } from 'vitest';
import { buildNarrative, mostMovedMonth } from '../../src/analysis/narrative';
import type { Transaction } from '../../src/types/transaction';

function tx(overrides: Partial<Transaction>): Transaction {
  return {
    id: Math.random().toString(36),
    date: '2025/01/15',
    y: 2025,
    m: 1,
    ym: '2025-01',
    name: 'テスト',
    amount: -1000,
    bank: '不明',
    cat: '食費',
    sub: '外食',
    memo: '',
    include: 1,
    transfer: 0,
    src: 'test.csv',
    ...overrides,
  };
}

describe('mostMovedMonth（features.md F-09 / ui-spec.md V-03）', () => {
  it('前年との差が最大の月を返す', () => {
    const cur = [1000, 5000, 1000, 1000, 1000, 1000, 1000, 1000, 1000, 1000, 1000, 1000];
    const prev = [1000, 1000, 1000, 1000, 1000, 1000, 1000, 1000, 1000, 1000, 1000, 1000];
    const gap = mostMovedMonth(cur, prev, 8);
    expect(gap?.monthIndex).toBe(1); // 2月（0-indexed=1）
    expect(gap?.d).toBe(4000);
  });

  it('しきい値（3,000円超）を満たさなければ null', () => {
    const cur = [1000, 2000, 1000];
    const prev = [1000, 1000, 1000];
    expect(mostMovedMonth(cur, prev, 3)).toBeNull();
  });

  it('upto範囲外の月は対象にしない', () => {
    const cur = [1000, 1000, 1000, 50000];
    const prev = [1000, 1000, 1000, 1000];
    expect(mostMovedMonth(cur, prev, 3)).toBeNull();
  });
});

describe('buildNarrative（data-spec.md §7-4）', () => {
  it('臨時の支出の差が暮らしの支出の差より大きいとき「差の大半は臨時の支出」の文言になる', () => {
    const rows = [
      // 2025年：特別な支出（臨時）が大きい
      tx({ y: 2025, cat: '特別な支出', sub: 'パソコン', amount: -300000 }),
      tx({ y: 2025, cat: '食費', sub: '食料品', amount: -100000 }),
      // 2024年：比較対象。臨時の支出は無し
      tx({ y: 2024, cat: '食費', sub: '食料品', amount: -95000 }),
    ];
    const n = buildNarrative(rows, 2025, 2024, [], new Set());
    expect(n.foot).toContain('差の大半はパソコンや家電などの臨時の支出です');
  });

  it('暮らしの支出の差が臨時の支出の差より大きいとき「生活のしかたが変わっています」の文言になる', () => {
    const rows = [
      tx({ y: 2025, cat: '食費', sub: '食料品', amount: -300000 }),
      tx({ y: 2024, cat: '食費', sub: '食料品', amount: -100000 }),
    ];
    const n = buildNarrative(rows, 2025, 2024, [], new Set());
    expect(n.foot).toContain('生活のしかたが変わっています');
  });

  it('増減リストは |d| >= 8,000 のもののみを含む', () => {
    const rows = [
      tx({ y: 2025, cat: '食費', amount: -9000 }),
      tx({ y: 2024, cat: '食費', amount: -1000 }), // d=8000ちょうど→含む
      tx({ y: 2025, cat: '日用品', amount: -5000 }),
      tx({ y: 2024, cat: '日用品', amount: -1000 }), // d=4000→含まない
    ];
    const n = buildNarrative(rows, 2025, 2024, [], new Set());
    const cats = n.rows.map((r) => r.cat);
    expect(cats).toContain('食費');
    expect(cats).not.toContain('日用品');
  });
});
