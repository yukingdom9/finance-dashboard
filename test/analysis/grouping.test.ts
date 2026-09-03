import { describe, it, expect } from 'vitest';
import { isOneoff, classifyOneoff, needWantBreakdown, regularBreakdown, oneoffList } from '../../src/analysis/grouping';
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

describe('isOneoff / classifyOneoff（data-spec.md §9-1）', () => {
  it('大項目が特別な支出なら臨時', () => {
    const t = tx({ cat: '特別な支出', sub: 'パソコン' });
    expect(isOneoff(t, new Set())).toBe(true);
    expect(classifyOneoff(t, new Set(), new Map()).why).toBe('パソコン・家電などの大きな買い物');
  });

  it('中項目が旅行なら臨時', () => {
    const t = tx({ cat: '趣味・娯楽', sub: '旅行' });
    expect(isOneoff(t, new Set())).toBe(true);
    expect(classifyOneoff(t, new Set(), new Map()).why).toBe('旅行');
  });

  it('異常値なら臨時。理由に倍率を含む（100倍超の丸めも反映）', () => {
    const t = tx({ id: 'x', cat: '食費', sub: '外食' });
    const anomalyIds = new Set(['x']);
    expect(isOneoff(t, anomalyIds)).toBe(true);
    expect(classifyOneoff(t, anomalyIds, new Map([['x', 9]])).why).toBe('食費のふだんの9倍');
    expect(classifyOneoff(t, anomalyIds, new Map([['x', 250]])).why).toBe('食費のふだんの100倍超');
  });

  it('いずれにも該当しなければ暮らしの支出', () => {
    const t = tx({ cat: '食費', sub: '食料品' });
    expect(isOneoff(t, new Set())).toBe(false);
  });
});

describe('needWantBreakdown（data-spec.md §9-2, §9-3）', () => {
  it('食費・自動車は中項目まで分けて表示単位にする', () => {
    const txs = [
      tx({ id: '1', cat: '食費', sub: '食料品', amount: -1000 }),
      tx({ id: '2', cat: '食費', sub: '外食', amount: -2000 }),
      tx({ id: '3', cat: '自動車', sub: 'ガソリン', amount: -3000 }),
      tx({ id: '4', cat: '自動車', sub: '洗車', amount: -500 }),
    ];
    const [need, want] = needWantBreakdown(txs);
    // 食費・食料品と自動車・ガソリンのみ need、それ以外（外食・洗車）は want
    expect(need.list.map((i) => i.label).sort()).toEqual(['自動車・ガソリン', '食費・食料品']);
    expect(want.list.map((i) => i.label).sort()).toEqual(['自動車・洗車', '食費・外食']);
  });

  it('未知の大項目は other として集計から落とさない', () => {
    const txs = [tx({ cat: '謎カテゴリ', sub: '謎' })];
    const [need, want, other] = needWantBreakdown(txs);
    expect(need.list).toHaveLength(0);
    expect(want.list).toHaveLength(0);
    expect(other.list).toHaveLength(1);
  });
});

describe('regularBreakdown / oneoffList（data-spec.md §9-3）', () => {
  it('暮らしの支出はcat単位で集計する', () => {
    const txs = [
      tx({ id: '1', cat: '食費', amount: -1000 }),
      tx({ id: '2', cat: '食費', amount: -2000 }),
      tx({ id: '3', cat: '住宅', amount: -500 }),
    ];
    const bd = regularBreakdown(txs);
    expect(bd.total).toBe(3500);
    expect(bd.list.find((i) => i.label === '食費')?.v).toBe(3000);
  });

  it('臨時の支出は個別取引を金額降順で列挙する', () => {
    const txs = [
      tx({ id: '1', name: 'A', amount: -500 }),
      tx({ id: '2', name: 'B', amount: -5000 }),
      tx({ id: '3', name: 'C', amount: -1000 }),
    ];
    const list = oneoffList(txs);
    expect(list.items.map((t) => t.name)).toEqual(['B', 'C', 'A']);
    expect(list.total).toBe(6500);
  });
});
