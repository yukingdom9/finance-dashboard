/**
 * しきい値・カテゴリー定義・色（data-spec.md §15、architecture.md §9-3）。
 * 判定に使う定数はすべてここに集約する。利用者には開放しない（architecture.md §11）。
 */
export const THRESHOLDS = {
  PARTIAL_MONTH_RATIO: 0.5, // 集計途中の月
  FIXED_MIN_MONTHS: 6, // 固定費：最低出現月数
  FIXED_MIN_COVERAGE: 0.4, // 固定費：発生率
  FIXED_MAX_CV: 0.15, // 固定費：変動係数
  FIXED_NEW_WITHIN_MONTHS: 5, // 固定費：「最近始まった」
  FIXED_RECENT_MONTHS: 3, // 固定費：「止まったかも」判定に使う直近月数
  ANOMALY_MIN_AMOUNT: 10_000, // 異常値：絶対額
  ANOMALY_SUB_RATIO: 5, // 異常値：中項目中央値との倍率
  ANOMALY_MERCHANT_RATIO: 2.5, // 異常値：支払先自身との倍率
  NARRATIVE_MIN_DELTA: 8_000, // 要約文に載せる最小の差額
  RATIO_DISPLAY_CAP: 100, // 「100倍超」表示のしきい値
  SUMMARY_PCT_MIN_BASE_RATIO: 0.08, // サマリー指標：割合表示に使う基準比（対 入ってきたお金）
  SUMMARY_PCT_MIN_BASE_ABS: 50_000, // サマリー指標：割合表示に使う基準額の下限
  FLAT_DELTA_ABS: 1_000, // |差額| がこれ未満は「±」（横ばい）扱い
  BONUS_SKEW_THRESHOLD: 0.15, // 賞与の偏り判定（features.md F-24）
  // 「最も動いた月」の指摘を表示する最小差額。ui-spec.md V-03「前年との差が3,000円超のとき」。
  // architecture.md §9-3 の THRESHOLDS 一覧には掲載が漏れていたが、
  // 「しきい値を分散させない」原則（architecture.md §14）に従いここに集約する。
  CATEGORY_MONTH_GAP_MIN: 3_000,
} as const;

/** 区分（data-spec.md §9-2） */
export type Kind = 'need' | 'want' | 'mixed' | 'other';

export interface CategoryDef {
  cat: string;
  col: string;
  name: string; // 色の呼び名
  kind: Kind;
}

/** 18の既知カテゴリー＋収入（data-spec.md §15） */
export const CATEGORIES: CategoryDef[] = [
  { cat: '食費', col: '#3D7FB8', name: '青', kind: 'mixed' },
  { cat: '住宅', col: '#2F4E80', name: '紺', kind: 'need' },
  { cat: '水道・光熱費', col: '#57A8CC', name: '水色', kind: 'need' },
  { cat: '通信費', col: '#3FA09C', name: '青緑', kind: 'need' },
  { cat: '趣味・娯楽', col: '#8B63BC', name: '紫', kind: 'want' },
  { cat: '教養・教育', col: '#6B70C4', name: '藤', kind: 'want' },
  { cat: '日用品', col: '#4EA070', name: '緑', kind: 'need' },
  { cat: '衣服・美容', col: '#CC6F98', name: '桃', kind: 'want' },
  { cat: '健康・医療', col: '#8AB24E', name: '黄緑', kind: 'need' },
  { cat: '交通費', col: '#6E99D8', name: '空色', kind: 'need' },
  { cat: '自動車', col: '#C89B3C', name: '山吹', kind: 'mixed' },
  { cat: '税・社会保障', col: '#6C7E93', name: '鈍色', kind: 'need' },
  { cat: '保険', col: '#3F8E76', name: '深緑', kind: 'need' },
  { cat: '交際費', col: '#E08E4C', name: '橙', kind: 'want' },
  { cat: '特別な支出', col: '#CB584F', name: '赤', kind: 'want' },
  { cat: '現金・カード', col: '#98A3AE', name: '灰', kind: 'other' },
  { cat: 'その他', col: '#B6BDC5', name: '薄灰', kind: 'other' },
  { cat: '未分類', col: '#CFD5DB', name: '淡灰', kind: 'other' },
  { cat: '収入', col: '#2F9E8F', name: '緑青', kind: 'other' },
];

export const CATEGORY_COLOR: Record<string, string> = Object.fromEntries(CATEGORIES.map((c) => [c.cat, c.col]));
export const CATEGORY_KIND: Record<string, Kind> = Object.fromEntries(CATEGORIES.map((c) => [c.cat, c.kind]));

/**
 * 未知の大項目の色（data-spec.md §15）。
 * カテゴリー名のハッシュから彩度を抑えた色相を決定し、既知カテゴリーと視覚的に区別する。
 */
export function unknownCategoryColor(cat: string): string {
  let h = 0;
  for (let i = 0; i < cat.length; i++) h = (h * 31 + cat.charCodeAt(i)) | 0;
  const hue = ((h % 360) + 360) % 360;
  return `hsl(${hue}, 22%, 62%)`;
}

/** カテゴリー色を取得する（未知カテゴリーはハッシュ色） */
export function categoryColor(cat: string): string {
  return CATEGORY_COLOR[cat] ?? unknownCategoryColor(cat);
}

/**
 * 削りにくい／選べる の区分（data-spec.md §9-2）。
 * 未知の大項目は 'other' として扱い、集計から落とさない。
 */
export function needOrWant(cat: string, sub: string): Exclude<Kind, 'mixed'> {
  if (cat === '食費') return sub === '食料品' ? 'need' : 'want';
  if (cat === '自動車') return sub === '車検・整備' || sub === 'ガソリン' ? 'need' : 'want';
  const k = CATEGORY_KIND[cat];
  if (!k) return 'other';
  return k === 'mixed' ? 'need' : k;
}

/** 支出グループの色（ui-spec.md §2-1） */
export const GROUP_COLORS = {
  regular: '#5E8FBF', // 暮らしの支出
  oneoff: '#E0904A', // 臨時の支出
  need: '#3F8E76', // 削りにくい支出
  want: '#CC6F98', // 選べる支出
  other: '#B6BDC5', // その他
} as const;
