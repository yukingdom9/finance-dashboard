import { describe, it, expect } from 'vitest';
import { parseCSV } from '../../src/data/csv';

describe('parseCSV（data-spec.md §1-1）', () => {
  it('単純なCSVをパースする', () => {
    const rows = parseCSV('a,b,c\n1,2,3');
    expect(rows).toEqual([
      ['a', 'b', 'c'],
      ['1', '2', '3'],
    ]);
  });

  it('引用符内のカンマを1セルとして扱う', () => {
    const rows = parseCSV('a,b\n"1,000",2');
    expect(rows).toEqual([
      ['a', 'b'],
      ['1,000', '2'],
    ]);
  });

  it('引用符内の改行を1セルとして扱う', () => {
    const rows = parseCSV('a,b\n"1\n2",3');
    expect(rows).toEqual([
      ['a', 'b'],
      ['1\n2', '3'],
    ]);
  });

  it('エスケープされた引用符（""）を1つの引用符として扱う', () => {
    const rows = parseCSV('a\n"say ""hi"""');
    expect(rows).toEqual([['a'], ['say "hi"']]);
  });

  it('CRLFを1つの改行として扱う', () => {
    const rows = parseCSV('a,b\r\n1,2\r\n');
    expect(rows).toEqual([
      ['a', 'b'],
      ['1', '2'],
    ]);
  });

  it('すべてのセルが空の行は除外する', () => {
    const rows = parseCSV('a,b\n1,2\n,\n3,4');
    expect(rows).toEqual([
      ['a', 'b'],
      ['1', '2'],
      ['3', '4'],
    ]);
  });
});
