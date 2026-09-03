import { describe, it, expect } from 'vitest';
import { decodeCSV } from '../../src/data/decode';

function toArrayBuffer(bytes: number[]): ArrayBuffer {
  return new Uint8Array(bytes).buffer;
}

describe('decodeCSV（data-spec.md §2）', () => {
  it('UTF-8（BOM無し）をそのままデコードする', () => {
    const text = '計算対象,日付,内容\n1,2024/01/01,テスト';
    const buf = new TextEncoder().encode(text).buffer as ArrayBuffer;
    const r = decodeCSV(buf);
    expect(r.enc).toBe('UTF-8');
    expect(r.text).toBe(text);
  });

  it('UTF-8（BOM付き）のBOMを除去する', () => {
    const text = '計算対象,日付,内容\n1,2024/01/01,テスト';
    const withBom = '﻿' + text;
    const buf = new TextEncoder().encode(withBom).buffer as ArrayBuffer;
    const r = decodeCSV(buf);
    expect(r.enc).toBe('UTF-8');
    expect(r.text).toBe(text);
    expect(r.text.charCodeAt(0)).not.toBe(0xfeff);
  });

  it('Shift_JISのバイト列はUTF-8デコードで置換文字が3個以上出るためShift_JISとして再デコードする', () => {
    // 「日本語」をShift_JISのバイト列で用意する（日=0x93FA 本=0x967B 語=0x8CEA）
    const sjisBytes = [0x93, 0xfa, 0x96, 0x7b, 0x8c, 0xea];
    const buf = toArrayBuffer(sjisBytes);
    const r = decodeCSV(buf);
    expect(r.enc).toBe('Shift_JIS');
    expect(r.text).toBe('日本語');
  });
});
