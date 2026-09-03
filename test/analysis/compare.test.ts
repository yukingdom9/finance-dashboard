import { describe, it, expect } from 'vitest';
import { summaryDelta, categoryDeltas } from '../../src/analysis/compare';
import type { Transaction } from '../../src/types/transaction';

function tx(overrides: Partial<Transaction>): Transaction {
  return {
    id: 'id',
    date: '2024/01/01',
    y: 2024,
    m: 1,
    ym: '2024-01',
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

describe('summaryDelta（data-spec.md §7-3）', () => {
  it('比較年のデータが無ければ hasComparison=false', () => {
    const r = summaryDelta(1000, null, 1_000_000);
    expect(r.hasComparison).toBe(false);
  });

  it('|d| < 1,000 は横ばい（flat）扱い', () => {
    const r = summaryDelta(500, 100_000, 1_000_000);
    expect(r.flat).toBe(true);
    expect(r.direction).toBe('flat');
  });

  it('|base| > scale×0.08 かつ |base| > 50,000 のとき割合を使う', () => {
    // scale=1,000,000 → 閾値 80,000。base=100,000 は条件を満たす
    const r = summaryDelta(10_000, 100_000, 1_000_000);
    expect(r.usePct).toBe(true);
    expect(r.value).toBeCloseTo((10_000 / 100_000) * 100);
  });

  it('前年の値が僅少なら割合ではなく金額差を使う（無意味な+944%等を防ぐ）', () => {
    // base=1,000 は 50,000 を下回るため金額差
    const r = summaryDelta(9_000, 1_000, 1_000_000);
    expect(r.usePct).toBe(false);
    expect(r.value).toBe(9_000);
  });

  it('scaleに対してbaseの比率が小さければ金額差を使う', () => {
    // scale=10,000,000 → 閾値800,000。base=100,000は50,000は超えるが閾値未満
    const r = summaryDelta(5_000, 100_000, 10_000_000);
    expect(r.usePct).toBe(false);
  });
});

describe('categoryDeltas（data-spec.md §7-2）', () => {
  it('前年が0以下のカテゴリーは割合を出さず金額差のみ', () => {
    const included = [
      tx({ id: 'a', cat: '未分類', amount: -5000, y: 2025 }),
      tx({ id: 'b', cat: '未分類', amount: 3000, y: 2024 }), // 返金 → 支出額(spend)は負、prevが0以下になる
    ];
    const deltas = categoryDeltas(included, 2025, 2024, 12);
    const row = deltas.find((d) => d.k === '未分類')!;
    expect(row.prev).toBeLessThanOrEqual(0);
    expect(row.p).toBeNull();
  });

  it('差額の降順に並ぶ', () => {
    const included = [
      tx({ id: 'a', cat: '食費', amount: -1000, y: 2025 }),
      tx({ id: 'b', cat: '食費', amount: -500, y: 2024 }),
      tx({ id: 'c', cat: '住宅', amount: -100, y: 2025 }),
      tx({ id: 'd', cat: '住宅', amount: -900, y: 2024 }),
    ];
    const deltas = categoryDeltas(included, 2025, 2024, 12);
    expect(deltas[0].k).toBe('食費'); // +500
    expect(deltas[deltas.length - 1].k).toBe('住宅'); // -800
  });
});
