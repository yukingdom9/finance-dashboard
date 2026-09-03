import { describe, it, expect } from 'vitest';
import { buildIndex } from '../../src/analysis/index';
import { emptyAliasMap } from '../../src/types/dataset';
import { categoryColor, needOrWant } from '../../src/analysis/constants';
import { median, quantile } from '../../src/analysis/stats';
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

describe('境界値：0件・空配列', () => {
  it('0件でも buildIndex が落ちない', () => {
    const idx = buildIndex([], emptyAliasMap());
    expect(idx.included).toHaveLength(0);
    expect(idx.years).toHaveLength(0);
    expect(idx.fixed).toHaveLength(0);
    expect(idx.anomalies).toHaveLength(0);
    expect(idx.living).toEqual({ med: 0, q1: 0, q3: 0, n: 0 });
  });

  it('median/quantile は空配列に対して0を返す', () => {
    expect(median([])).toBe(0);
    expect(quantile([], 0.25)).toBe(0);
  });
});

describe('境界値：1件のみ', () => {
  it('1件でも年次・月次集計が成立する', () => {
    const idx = buildIndex([tx({})], emptyAliasMap());
    expect(idx.included).toHaveLength(1);
    expect(idx.years).toEqual([2024]);
  });
});

describe('境界値：全月欠損（1ヶ月だけのデータ）', () => {
  it('集計途中判定が最初=最後の月でも二重に入らない', () => {
    const idx = buildIndex([tx({ id: 'a' }), tx({ id: 'b', include: 1 })], emptyAliasMap());
    // 全データが1ヶ月しかない場合、first===lastなので配列には最大1件しか入らない
    expect(idx.partialMonths.length).toBeLessThanOrEqual(1);
  });
});

describe('境界値：負の金額（返金）', () => {
  it('支出カテゴリーに正のamount（返金）が入ってもカテゴリー合計がマイナスになりうる', () => {
    const rows = [tx({ id: 'a', amount: -1000 }), tx({ id: 'b', amount: 5000, name: '返金' })];
    const idx = buildIndex(rows, emptyAliasMap());
    expect(idx.expenses).toHaveLength(2);
    // 集計自体は落ちない
    expect(idx.included).toHaveLength(2);
  });
});

describe('境界値：未知の大項目', () => {
  it('区分表に無い大項目は other として扱い、集計から落とさない', () => {
    expect(needOrWant('謎のカテゴリ', '謎の中項目')).toBe('other');
  });

  it('未知カテゴリーの色はハッシュ由来のhsl文字列になる（既存カテゴリーと衝突しない形式）', () => {
    const c = categoryColor('謎のカテゴリ');
    expect(c).toMatch(/^hsl\(\d+, 22%, 62%\)$/);
  });

  it('未知の大項目を含むデータでも buildIndex が落ちない', () => {
    const idx = buildIndex([tx({ cat: '謎のカテゴリ', sub: '謎の中項目' })], emptyAliasMap());
    expect(idx.expenses).toHaveLength(1);
  });
});

describe('境界値：除算の分母が0', () => {
  it('比較年が存在しない場合の summaryDelta は例外を投げない', async () => {
    const { summaryDelta } = await import('../../src/analysis/compare');
    const r = summaryDelta(1000, null, 0);
    expect(r.hasComparison).toBe(false);
  });
});
