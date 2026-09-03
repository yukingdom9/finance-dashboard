import { describe, it, expect } from 'vitest';
import { loadFixture } from '../fixtures/loadFixture';
import { mergeRows } from '../../src/data/merge';
import type { Transaction } from '../../src/types/transaction';

const byDate = (a: Transaction, b: Transaction) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0);

/**
 * design/fixtures/README.md「派生ファイルの作り方」の期待値をそのまま検証する。
 * 実データではなく、fixtureから年で分割した部分集合を使って data/merge.ts の算術を確認する。
 */
describe('mergeRows（fixtureの年別分割シナリオ）', () => {
  const { rows } = loadFixture();
  const by2024 = rows.filter((t) => t.y === 2024).sort(byDate);
  const by2025 = rows.filter((t) => t.y === 2025).sort(byDate);
  const by2026 = rows.filter((t) => t.y === 2026).sort(byDate);

  it('前提：年別の件数（2024=1012, 2025=997, 2026=696）', () => {
    expect(by2024.length).toBe(1012);
    expect(by2025.length).toBe(997);
    expect(by2026.length).toBe(696);
  });

  it('1回目：2024年＋2025年＋2026年の一部(417件)投入 → 追加2,426・重複0', () => {
    const partial2026 = by2026.slice(0, 417);
    let acc: Transaction[] = [];
    let totalAdded = 0;
    let totalDup = 0;
    for (const batch of [by2024, by2025, partial2026]) {
      const m = mergeRows(acc, batch);
      acc = m.rows;
      totalAdded += m.added;
      totalDup += m.duplicate;
    }
    expect(totalAdded).toBe(2426);
    expect(totalDup).toBe(0);
    expect(acc.length).toBe(2426);

    const m2 = mergeRows(acc, by2024);
    expect(m2.added).toBe(0);
    expect(m2.duplicate).toBe(1012);
    acc = m2.rows;
    expect(acc.length).toBe(2426);

    const m3 = mergeRows(acc, by2026);
    expect(m3.added).toBe(279);
    expect(m3.duplicate).toBe(417);
    acc = m3.rows;
    expect(acc.length).toBe(2705);
  });

  it('内容変更で上書き（updated）', () => {
    const base = by2024.slice(0, 5);
    const modified: Transaction[] = base.map((t, i) => (i === 0 ? { ...t, cat: '変更後カテゴリ' } : t));
    const m = mergeRows(base, modified);
    expect(m.updated).toBe(1);
    expect(m.duplicate).toBe(4);
    expect(m.added).toBe(0);
    expect(m.rows.find((r) => r.id === base[0].id)?.cat).toBe('変更後カテゴリ');
  });

  it('IDを全件書き換えたCSVの再投入 → 追加0件・idChanged 2,705件（内容キーで一致）', () => {
    const reIdentified = rows.map((t) => ({ ...t, id: 'NEWID-' + t.id }));
    const m = mergeRows(rows, reIdentified);
    expect(m.added).toBe(0);
    expect(m.idChanged).toBe(rows.length);
    expect(m.duplicate).toBe(rows.length);
    expect(m.rows.length).toBe(rows.length);
  });

  it('同日・同店・同額の取引が本当に複数ある場合、2件目以降は新規として追加される', () => {
    const base: Transaction = rows[0];
    const existing: Transaction[] = [base];
    // IDだけ変えて内容は同一の行を2件投入（1件は元のIDと一致、内容も完全一致→重複想定を避けるため2件とも新ID）
    const dup1: Transaction = { ...base, id: 'X1' };
    const dup2: Transaction = { ...base, id: 'X2' };
    const m = mergeRows(existing, [dup1, dup2]);
    // 1件目：内容キーが一致 → 既存(base)を更新扱い（duplicate+idChanged）
    // 2件目：内容キーの一致は既に消費済み → 新規として追加
    expect(m.idChanged).toBe(1);
    expect(m.duplicate).toBe(1);
    expect(m.added).toBe(1);
    expect(m.rows.length).toBe(2);
  });
});
