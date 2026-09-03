import { describe, it, expect } from 'vitest';
import { csvToRows, fallbackId } from '../../src/data/mapper';

const HEADER = '計算対象,日付,内容,金額（円）,保有金融機関,大項目,中項目,メモ,振替,ID';

describe('csvToRows（data-spec.md §1-2, §3-1, §3-2）', () => {
  it('必須列（日付・金額・大項目）が揃っていれば正常に変換する', () => {
    const text = `${HEADER}\n1,2024/01/15,テスト店,-1000,テスト銀行,食費,外食,,0,ID1`;
    const r = csvToRows(text, 'f.csv');
    expect(r.error).toBeUndefined();
    expect(r.rows).toHaveLength(1);
    expect(r.rows[0]).toMatchObject({
      id: 'ID1',
      date: '2024/01/15',
      y: 2024,
      m: 1,
      ym: '2024-01',
      name: 'テスト店',
      amount: -1000,
      bank: 'テスト銀行',
      cat: '食費',
      sub: '外食',
      include: 1,
      transfer: 0,
    });
  });

  it('列名の揺れ（金額(円) / 金融機関）を受け付ける', () => {
    const text = `計算対象,日付,内容,金額(円),金融機関,大項目\n1,2024/01/15,テスト店,-500,銀行A,日用品`;
    const r = csvToRows(text, 'f.csv');
    expect(r.error).toBeUndefined();
    expect(r.rows[0].amount).toBe(-500);
    expect(r.rows[0].bank).toBe('銀行A');
  });

  it('必須列（日付・金額・大項目のいずれか）が欠けるとエラーを返す', () => {
    const text = `内容,金額（円）\nテスト,1000`;
    const r = csvToRows(text, 'bad.csv');
    expect(r.error).toMatch(/収入・支出詳細/);
    expect(r.rows).toHaveLength(0);
  });

  it('中身が空のファイルはエラーを返す', () => {
    const r = csvToRows('', 'empty.csv');
    expect(r.error).toBe('中身が空でした');
  });

  it('日付が解析できない行はスキップし件数を報告する', () => {
    const text = `${HEADER}\n1,不正な日付,店,-100,銀行,食費,,,,ID1\n1,2024/02/01,店2,-200,銀行,食費,,,,ID2`;
    const r = csvToRows(text, 'f.csv');
    expect(r.rows).toHaveLength(1);
    expect(r.skipped).toBe(1);
  });

  it('ID列が無い場合は代替キーを生成する（同一内容なら同一ID）', () => {
    const text = `日付,内容,金額（円）,保有金融機関,大項目\n2024/01/01,店A,-100,銀行A,食費`;
    const r = csvToRows(text, 'f.csv');
    expect(r.hasId).toBe(false);
    expect(r.rows[0].id).toBe(
      fallbackId({ date: '2024/01/01', name: '店A', amount: -100, bank: '銀行A' }),
    );
  });

  it('内容が空なら「（内容なし）」、金融機関が空なら「不明」、中項目が空なら「未分類」になる', () => {
    const text = `日付,内容,金額（円）,大項目\n2024/01/01,,-100,食費`;
    const r = csvToRows(text, 'f.csv');
    expect(r.rows[0].name).toBe('（内容なし）');
    expect(r.rows[0].bank).toBe('不明');
    expect(r.rows[0].sub).toBe('未分類');
  });

  it('金額に数字以外が混じっていても符号と数字だけ抽出する', () => {
    const text = `日付,内容,金額（円）,大項目\n2024/01/01,店,"-1,234",食費`;
    const r = csvToRows(text, 'f.csv');
    expect(r.rows[0].amount).toBe(-1234);
  });
});
