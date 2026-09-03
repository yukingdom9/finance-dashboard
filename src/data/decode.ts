/**
 * 文字コードの判定（data-spec.md §2）
 *
 * 1. UTF-8としてデコードし、先頭のBOM（U+FEFF）を除去する
 * 2. 置換文字 U+FFFD の出現数を数える
 * 3. 3個以上あれば Shift_JIS としてデコードし直す
 * 4. Shift_JISのデコードに失敗した場合はUTF-8の結果を使う
 */

export type Encoding = 'UTF-8' | 'Shift_JIS';

export interface DecodeResult {
  text: string;
  enc: Encoding;
}

export function decodeCSV(buf: ArrayBuffer): DecodeResult {
  const utf8 = new TextDecoder('utf-8').decode(buf).replace(/^﻿/, '');
  const bad = (utf8.match(/�/g) || []).length;
  if (bad >= 3) {
    try {
      const sjis = new TextDecoder('shift_jis', { fatal: false }).decode(buf);
      return { text: sjis, enc: 'Shift_JIS' };
    } catch {
      // Shift_JISのデコードに失敗した場合はUTF-8の結果を使う
    }
  }
  return { text: utf8, enc: 'UTF-8' };
}
