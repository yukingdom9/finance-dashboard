import type { Transaction } from '../types/transaction';
import { isExpense, spend } from './filters';
import { needOrWant } from './constants';
import { sum } from './stats';
import { ratioLabel } from '../format/number';

/**
 * 暮らしの支出／臨時の支出、削りにくい／選べる（data-spec.md §9）。
 *
 * 実装メモ：ratioLabel（format/number.ts）への依存について。
 * architecture.md の3層分離は「分析層はDOM・Reactを知らない」ことを求めているが、
 * ratioLabel は純粋な文字列整形（100倍超の丸め等）でありDOM非依存のため、
 * 分析層からの利用は3層分離の趣旨に反しないと判断した。
 * これにより「10000倍」のような無意味な表示（data-spec.md §12で報告された事故）を
 * 分類理由の文言でも一箇所のロジックで確実に防げる。
 */

/** 臨時の支出 ⟺ cat==='特別な支出' または sub==='旅行' または異常値（data-spec.md §9-1） */
export function isOneoff(t: Transaction, anomalyIds: Set<string>): boolean {
  return t.cat === '特別な支出' || t.sub === '旅行' || anomalyIds.has(t.id);
}

export interface OneoffReason {
  oneoff: boolean;
  why: string;
}

/** 臨時の支出への分類理由（data-spec.md §9-1 の表） */
export function classifyOneoff(t: Transaction, anomalyIds: Set<string>, anomalyRatio: Map<string, number>): OneoffReason {
  if (t.cat === '特別な支出') return { oneoff: true, why: 'パソコン・家電などの大きな買い物' };
  if (t.sub === '旅行') return { oneoff: true, why: '旅行' };
  if (anomalyIds.has(t.id)) {
    const r = anomalyRatio.get(t.id) ?? 0;
    return { oneoff: true, why: `${t.cat}のふだんの${ratioLabel(r)}` };
  }
  return { oneoff: false, why: '' };
}

export function splitRegularOneoff(
  txs: Transaction[],
  anomalyIds: Set<string>,
): { regular: Transaction[]; oneoff: Transaction[] } {
  const regular: Transaction[] = [];
  const oneoff: Transaction[] = [];
  for (const t of txs) (isOneoff(t, anomalyIds) ? oneoff : regular).push(t);
  return { regular, oneoff };
}

export interface GroupItem {
  label: string;
  cat: string;
  v: number;
  n: number;
}
export interface GroupBreakdown {
  total: number;
  list: GroupItem[];
}

/** 表示単位のラベル（data-spec.md §9-3）：食費・自動車のみ中項目まで分ける */
function groupLabel(cat: string, sub: string): string {
  return cat === '食費' || cat === '自動車' ? `${cat}・${sub}` : cat;
}

/** 暮らしの支出の内訳：cat単位で集計（data-spec.md §9-3） */
export function regularBreakdown(txs: Transaction[]): GroupBreakdown {
  const map = new Map<string, GroupItem>();
  for (const t of txs) {
    const item = map.get(t.cat) ?? { label: t.cat, cat: t.cat, v: 0, n: 0 };
    item.v += spend(t);
    item.n += 1;
    map.set(t.cat, item);
  }
  const list = [...map.values()].sort((a, b) => b.v - a.v);
  return { total: sum(list, (i) => i.v), list };
}

/** 臨時の支出の内訳：個別取引を金額降順で列挙（data-spec.md §9-3） */
export function oneoffList(txs: Transaction[]): { total: number; items: Transaction[] } {
  const items = txs.slice().sort((a, b) => spend(b) - spend(a));
  return { total: sum(items, spend), items };
}

/**
 * 削りにくい／選べる の内訳（data-spec.md §9-2, §9-3）。
 * 戻り値は [need(削りにくい), want(選べる), other(その他)] の3要素固定。
 */
export function needWantBreakdown(txs: Transaction[]): [GroupBreakdown, GroupBreakdown, GroupBreakdown] {
  const maps: [Map<string, GroupItem>, Map<string, GroupItem>, Map<string, GroupItem>] = [new Map(), new Map(), new Map()];
  for (const t of txs) {
    const k = needOrWant(t.cat, t.sub);
    const gi = k === 'need' ? 0 : k === 'want' ? 1 : 2;
    const label = groupLabel(t.cat, t.sub);
    const item = maps[gi].get(label) ?? { label, cat: t.cat, v: 0, n: 0 };
    item.v += spend(t);
    item.n += 1;
    maps[gi].set(label, item);
  }
  return maps.map((m) => {
    const list = [...m.values()].sort((a, b) => b.v - a.v);
    return { total: sum(list, (i) => i.v), list };
  }) as [GroupBreakdown, GroupBreakdown, GroupBreakdown];
}

/**
 * 月ごとの積み上げ系列（features.md F-13）。
 * mode='oneoff' なら [暮らし, 臨時] の2系列、mode='need' なら [削りにくい, 選べる, その他] の3系列。
 */
export function monthlyGroupSeries(
  yearExpenses: Transaction[],
  mode: 'oneoff' | 'need',
  anomalyIds: Set<string>,
): number[][] {
  const groupCount = mode === 'oneoff' ? 2 : 3;
  const series: number[][] = Array.from({ length: groupCount }, () => new Array(12).fill(0));
  for (const t of yearExpenses) {
    if (!isExpense(t)) continue;
    let gi: number;
    if (mode === 'oneoff') {
      gi = isOneoff(t, anomalyIds) ? 1 : 0;
    } else {
      const k = needOrWant(t.cat, t.sub);
      gi = k === 'need' ? 0 : k === 'want' ? 1 : 2;
    }
    series[gi][t.m - 1] += spend(t);
  }
  return series;
}
