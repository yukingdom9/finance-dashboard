import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { decodeCSV } from '../../src/data/decode';
import { csvToRows } from '../../src/data/mapper';
import type { Transaction } from '../../src/types/transaction';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const FIXTURE_PATH = path.resolve(__dirname, '../../design/fixtures/anonymized-real-data.csv');

/**
 * design/ は実データ由来の金額・日付を含むため公開リポジトリには含めていない（.gitignore参照）。
 * ローカルの開発環境にはあるが、CI（GitHub Actions）のチェックアウトには存在しない。
 * このファイルが無い環境では、依存するテストを describe.skipIf などで丸ごとスキップすること。
 */
export const FIXTURE_AVAILABLE = existsSync(FIXTURE_PATH);

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
