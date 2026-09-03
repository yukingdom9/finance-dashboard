import type { Transaction } from '../types/transaction';
import type { Narrative, NarrativeRow } from '../types/analysis';
import { THRESHOLDS } from './constants';
import { alignMonths } from './period';
import { yearAgg } from './aggregate';
import { categoryDeltas } from './compare';
import { yen, pct } from '../format/number';

/**
 * ホームの要約文（data-spec.md §7-4）。テンプレートのみで生成し、外部モデル・AIは使用しない。
 * headline / rows[].text / foot は最終的な日本語の文字列（プレーンテキスト）を返す。
 * 「数字を等幅で強調する」等のマークアップは表示層（components/Story.tsx）の責務とし、
 * このためにスタイリング前の生の数値（dTotal 等）も Narrative に含める。
 */
export function buildNarrative(
  included: Transaction[],
  y: number,
  cy: number,
  partialMonths: string[],
  anomalyIds: Set<string>,
): Narrative {
  const upto = alignMonths(y, cy, included, partialMonths);
  const a = yearAgg(included, y, upto, anomalyIds);
  const b = yearAgg(included, cy, upto, anomalyIds);

  const dTotal = a.total - b.total;
  const pTotal = b.total ? (dTotal / b.total) * 100 : 0;
  const dReg = a.reg - b.reg;
  const pReg = b.reg ? (dReg / b.reg) * 100 : 0;

  const deltas = categoryDeltas(included, y, cy, upto).filter((d) => Math.abs(d.d) >= THRESHOLDS.NARRATIVE_MIN_DELTA);
  const ups = deltas.filter((d) => d.d > 0).slice(0, 2);
  const downs = deltas.filter((d) => d.d < 0).slice(-2).reverse();

  const dir = dTotal > 0 ? '多く' : '少なく';
  const headline = `今年は${cy}年の同じ時期より ${yen(Math.abs(dTotal))} ${dir}使っています（${pct(pTotal)}）。`;

  const line = (u: (typeof deltas)[number]) =>
    `${u.k} ${u.p == null ? '' : pct(u.p) + '　'}${u.d > 0 ? '+' : '−'}${yen(Math.abs(u.d))}`;
  const rows: NarrativeRow[] = [
    ...ups.map((u) => ({ tag: '増えた' as const, cls: 'up' as const, cat: u.k, text: line(u) })),
    ...downs.map((u) => ({ tag: '減った' as const, cls: 'down' as const, cat: u.k, text: line(u) })),
  ];

  const bigOneoff = Math.abs(a.oneoff - b.oneoff) > Math.abs(dReg);
  const foot = bigOneoff
    ? `差の大半はパソコンや家電などの臨時の支出です。毎月の暮らしの支出そのものは ${pct(pReg)} にとどまります。`
    : `毎月の暮らしの支出そのものが ${pct(pReg)} 動いています。臨時の買い物ではなく、生活のしかたが変わっています。`;

  return { upto, a, b, headline, dTotal, pTotal, rows, foot };
}

export interface MonthGap {
  /** 0-indexed（0=1月） */
  monthIndex: number;
  d: number;
}

/**
 * カテゴリー別画面の「最も動いた月」の指摘（features.md F-09 / ui-spec.md V-03）。
 * 前年との差が最大の月を返す。しきい値（3,000円超）を満たさない場合は null。
 */
export function mostMovedMonth(curMonthly: number[], prevMonthly: number[], upto: number): MonthGap | null {
  const gaps: MonthGap[] = [];
  for (let i = 0; i < upto; i++) {
    gaps.push({ monthIndex: i, d: curMonthly[i] - (prevMonthly[i] ?? 0) });
  }
  gaps.sort((x, y) => Math.abs(y.d) - Math.abs(x.d));
  const top = gaps[0];
  if (!top || Math.abs(top.d) <= THRESHOLDS.CATEGORY_MONTH_GAP_MIN) return null;
  return top;
}
