import type { Transaction } from './transaction';

/** 固定費の状態（data-spec.md §11） */
export type FixedStatus = 'on' | 'new' | 'stopped';

/** 支払先ごとの索引（data-spec.md §13） */
export interface MerchantGroup {
  /** 正規化＋エイリアス適用後のキー */
  key: string;
  /** 表示名（data-spec.md §13-2 / §13-3） */
  label: string;
  cat: string;
  sub: string;
  bank: string;
  tx: Transaction[];
  /** 支出額（正の値）の中央値 */
  med: number;
}

/** 決まって出ていくお金（data-spec.md §11） */
export interface FixedCost extends MerchantGroup {
  /** 発生した年月（昇順） */
  months: string[];
  /** 年月ごとの支出額合計 */
  byM: Record<string, number>;
  /** 月あたり（発生期間で月割り） */
  mean: number;
  /** 単純平均（変動係数の算出に使用） */
  unit: number;
  /** 変動係数 */
  cv: number;
  /** 年額 = mean × 12 */
  yearly: number;
  status: FixedStatus;
  /** 発生期間の合計支出額 */
  total: number;
  /** 取引件数 */
  n: number;
  /** 発生期間の月数（月割りの分母） */
  span: number;
}

/** いつもと違う支出（data-spec.md §12） */
export interface Anomaly {
  tx: Transaction;
  /** 判定に使った基準額（中項目中央値、無ければ大項目中央値） */
  usual: number;
  /** 支出額 ÷ usual */
  ratio: number;
}

/** ひと月の暮らしに必要な額（data-spec.md §8） */
export interface LivingCost {
  med: number;
  q1: number;
  q3: number;
  /** 算出に使った月数 */
  n: number;
}

/** 年次集計（data-spec.md §5） */
export interface YearAgg {
  y: number;
  /** 対象月の上限（1〜12） */
  upto: number;
  salary: number;
  other: number;
  income: number;
  /** 使ったお金（支出合計） */
  total: number;
  /** 臨時の支出 */
  oneoff: number;
  /** 暮らしの支出 = total - oneoff */
  reg: number;
  /** 使わずに残った額 */
  savings: number;
  /** 使わずに残った割合（%） */
  rate: number;
}

/** カテゴリー別の増減（data-spec.md §7-2） */
export interface CategoryDelta {
  k: string;
  cur: number;
  prev: number;
  d: number;
  /** prev <= 0 のときは null（割合を表示しない） */
  p: number | null;
}

/** 要約文の1行（増えた／減った） */
export interface NarrativeRow {
  tag: '増えた' | '減った';
  cls: 'up' | 'down';
  cat: string;
  text: string;
}

/** ホーム要約文（data-spec.md §7-4） */
export interface Narrative {
  upto: number;
  a: YearAgg;
  b: YearAgg;
  /** 1段目の全文（プレーンテキスト）。テストや非視覚的な用途向け */
  headline: string;
  /** 1段目をJSXで組み立て直すための生の値（表示層で数字部分だけ強調するため） */
  dTotal: number;
  pTotal: number;
  rows: NarrativeRow[];
  foot: string;
}

/** 賞与の偏り判定（features.md F-24 / data-spec.md には明記が薄いため features.md §F-24 を正とする） */
export interface BonusSkew {
  /** 対象年の賞与月一覧（YYYY-MM） */
  bonusMonths: string[];
  /** 年間の賞与月数 */
  bCount: number;
  /** 比較期間（1〜upto月）に含まれる賞与月数 */
  bInPeriod: number;
  /** 期間比率 upto/12 */
  periodRatio: number;
  /** |bInPeriod/bCount - periodRatio| > 0.15 のとき true */
  skewed: boolean;
}

/** buildIndex の結果。表示層はこれだけを受け取って描く（architecture.md §3） */
export interface DerivedIndex {
  /** 読み込んだ全取引（日付降順） */
  all: Transaction[];
  /** 集計対象（include===1） */
  included: Transaction[];
  /** 集計対象のうち支出（cat !== '収入'） */
  expenses: Transaction[];
  /** 集計対象のうち収入（cat === '収入'） */
  incomes: Transaction[];
  /** 集計対象が存在する年の一覧（昇順） */
  years: number[];
  /** 年月ごとの集計対象レコード数 */
  monthCounts: Record<string, number>;
  /** 全データの年月（昇順・重複なし） */
  allMonthsSorted: string[];
  /** 集計途中と判定された年月（data-spec.md §6） */
  partialMonths: string[];
  /** 支払先索引（支出額 > 0 のみ、data-spec.md §13） */
  merchIndex: Record<string, MerchantGroup>;
  /** 決まって出ていくお金（年額の大きい順） */
  fixed: FixedCost[];
  /** 固定費と判定された支払先キー */
  fixedKeys: Set<string>;
  /** 中項目（cat/sub）ごとの支出中央値 */
  subMedian: Record<string, number>;
  /** 大項目ごとの支出中央値 */
  catMedian: Record<string, number>;
  /** いつもと違う支出 */
  anomalies: Anomaly[];
  /** 異常値と判定された取引IDの集合 */
  anomalyIds: Set<string>;
  /** ひと月の暮らしに必要な額 */
  living: LivingCost;
}
