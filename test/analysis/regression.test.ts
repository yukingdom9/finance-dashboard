import { describe, it, expect } from 'vitest';
import { loadFixture } from '../fixtures/loadFixture';
import { buildIndex } from '../../src/analysis/index';
import { emptyAliasMap } from '../../src/types/dataset';
import { yearAgg } from '../../src/analysis/aggregate';

/**
 * design/fixtures/anonymized-real-data.csv を固定入力とした回帰テスト。
 * 期待値は design/architecture.md §13 および design/fixtures/README.md に記載の実測値。
 */
describe('fixture回帰テスト（design/fixtures/anonymized-real-data.csv）', () => {
  const { rows, skipped } = loadFixture();
  const idx = buildIndex(rows, emptyAliasMap());

  it('取り込み件数・スキップ件数', () => {
    // fixtureの末尾に日付欠損の壊れた行が2件混入している（design/fixtures/README.md未記載）。
    // data-spec.md §6-2「日付が解析できない行はスキップする」により rows=2705, skipped=2 になる。
    expect(rows.length).toBe(2705);
    expect(skipped).toBe(2);
  });

  it('集計対象件数（除外495：振替418・その他77）', () => {
    expect(idx.included.length).toBe(2210);
    expect(rows.length - idx.included.length).toBe(495);
  });

  it('支払先グループ数 408', () => {
    expect(Object.keys(idx.merchIndex).length).toBe(408);
  });

  it('ひと月の暮らしに必要な額 ¥138,391（Q1 116,999 / Q3 153,484 / 31ヶ月）', () => {
    expect(Math.round(idx.living.med)).toBe(138391);
    expect(Math.round(idx.living.q1)).toBe(116999);
    expect(Math.round(idx.living.q3)).toBe(153484);
    expect(idx.living.n).toBe(31);
  });

  it('固定費の検出 5件 / 異常値の検出 24件', () => {
    expect(idx.fixed.length).toBe(5);
    expect(idx.anomalies.length).toBe(24);
  });

  it('年間支出 2024/2025/2026', () => {
    const y2024 = yearAgg(idx.included, 2024, 12, idx.anomalyIds).total;
    const y2025 = yearAgg(idx.included, 2025, 12, idx.anomalyIds).total;
    const y2026 = yearAgg(idx.included, 2026, 12, idx.anomalyIds).total;
    expect(Math.round(y2024)).toBe(2040879);
    expect(Math.round(y2025)).toBe(2800291);
    expect(Math.round(y2026)).toBe(1512765);
  });

  it('集計途中と判定される月：2024-01、2026-09', () => {
    expect(idx.partialMonths).toEqual(['2024-01', '2026-09']);
  });
});
