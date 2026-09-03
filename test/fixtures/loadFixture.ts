import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { decodeCSV } from '../../src/data/decode';
import { csvToRows } from '../../src/data/mapper';
import type { Transaction } from '../../src/types/transaction';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const FIXTURE_PATH = path.resolve(__dirname, '../../design/fixtures/anonymized-real-data.csv');

export interface FixtureLoadResult {
  rows: Transaction[];
  skipped: number;
  hasId: boolean;
}

/** design/fixtures/anonymized-real-data.csv を実際のCSVパイプライン（decode→CSVパース→列マッピング）で読み込む */
export function loadFixture(): FixtureLoadResult {
  const buf = readFileSync(FIXTURE_PATH);
  const arrayBuffer = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer;
  const { text } = decodeCSV(arrayBuffer);
  const { rows, error, skipped, hasId } = csvToRows(text, 'anonymized-real-data.csv');
  if (error) throw new Error(`fixture読み込みエラー: ${error}`);
  return { rows, skipped, hasId };
}
