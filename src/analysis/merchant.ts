import type { Transaction } from '../types/transaction';
import type { AliasMap } from '../types/dataset';
import type { MerchantGroup } from '../types/analysis';
import { spend } from './filters';
import { median } from './stats';

/**
 * 組み込みエイリアス表（data-spec.md §13-3 の「組み込みエイリアス表」）。
 *
 * 実装判断：ワイヤーフレームのサンプルデータ生成器には
 * {'カ)ソルパツク給与':'カ)ソルパツク', '居酒屋とりまる忘年会':'居酒屋とりまる', ...} という
 * エイリアスが含まれていたが、これはデモ用架空データ固有の補正（架空の会社名・取引名）であり、
 * 実際の利用者データに適用できる一般則ではない。実データに対して汎用的に有効な組み込みルールは
 * data-spec.md からも特定できなかったため、v1では空のテーブルとする。
 * 将来、実データの検証で汎用的なパターンが見つかった場合にここへ追加できるよう、
 * 構造（F-22の利用者定義エイリアスと同じ解決順序）はそのまま残す。
 */
const BUILTIN_MERCHANT_ALIAS: Record<string, string> = {};

/** 自動正規化（キーの生成）。data-spec.md §13-1 */
export function normName(s: string): string {
  return s
    .replace(/\/NFC$/, '')
    .replace(/\s*[（(].*?[）)]\s*/g, '')
    .replace(/[0-9]{4,}/g, '')
    .replace(/\s|　/g, '')
    .replace(/(第[1-4]期|[0-9]{1,2}月分?|[0-9]{2}年[0-9]{1,2}月)$/, '')
    .trim();
}

/** 表示名の生成（括弧・スペースは保持する）。data-spec.md §13-2 */
export function displayName(name: string): string {
  return name.replace(/\s*(第[1-4]期|[0-9]{1,2}月分?|[0-9]{2}年[0-9]{1,2}月分?)\s*$/, '').trim() || name;
}

/** 支払先キーの解決：自動正規化 → 組み込みエイリアス → 利用者定義エイリアス（F-22）。data-spec.md §13-3 */
export function merchantKey(t: Transaction, aliases: AliasMap): string {
  let k = normName(t.name);
  k = BUILTIN_MERCHANT_ALIAS[k] ?? k;
  k = aliases.merge[k] ?? k;
  return k;
}

/**
 * 支払先索引の構築（data-spec.md §13、buildIndexの3番目のステップ）。
 * 支出額 > 0 の取引のみを対象とする。グループの表示名は、そのグループの中で最初に
 * 出現した取引の displayName を使う（§13-2）。ただし利用者が手動名寄せ時に表示名を
 * 明示的に選んだ場合（aliases.labels）はそれを優先する（本実装での拡張、types/dataset.ts 参照）。
 */
export function buildMerchantIndex(expenses: Transaction[], aliases: AliasMap): Record<string, MerchantGroup> {
  const index: Record<string, MerchantGroup> = {};
  for (const t of expenses) {
    if (spend(t) <= 0) continue;
    const key = merchantKey(t, aliases);
    let group = index[key];
    if (!group) {
      const label = aliases.labels[key] ?? displayName(t.name);
      group = { key, label, cat: t.cat, sub: t.sub, bank: t.bank, tx: [], med: 0 };
      index[key] = group;
    }
    group.tx.push(t);
  }
  for (const group of Object.values(index)) {
    group.med = median(group.tx.map(spend));
  }
  return index;
}

/** 任意の取引配列に対する支払先別の単純集計（features.md F-18/F-19、ui-spec V-03「どこで使ったか」） */
export interface MerchantStat {
  key: string;
  label: string;
  cat: string;
  total: number;
  n: number;
  byM: Record<string, number>;
  tx: Transaction[];
}

export function merchantStats(txs: Transaction[], aliases: AliasMap): MerchantStat[] {
  const g: Record<string, MerchantStat> = {};
  for (const t of txs) {
    const k = merchantKey(t, aliases);
    let o = g[k];
    if (!o) {
      o = { key: k, label: aliases.labels[k] ?? displayName(t.name), cat: t.cat, total: 0, n: 0, byM: {}, tx: [] };
      g[k] = o;
    }
    o.total += spend(t);
    o.n++;
    o.byM[t.ym] = (o.byM[t.ym] ?? 0) + spend(t);
    o.tx.push(t);
  }
  return Object.values(g).sort((a, b) => b.total - a.total);
}
