/** 中央値・四分位・合計。すべて純粋関数（architecture.md §9-1）。0件を渡されても落ちないこと。 */

export function sum<T>(arr: T[], f: (x: T) => number = (x) => x as unknown as number): number {
  let s = 0;
  for (const x of arr) s += f(x);
  return s;
}

export function median(arr: number[]): number {
  if (!arr.length) return 0;
  const s = [...arr].sort((a, b) => a - b);
  const h = s.length >> 1;
  return s.length % 2 ? s[h] : (s[h - 1] + s[h]) / 2;
}

/** 四分位（data-spec.md §8）：昇順ソート後、位置 p=(n-1)×q として線形補間する */
export function quantile(arr: number[], q: number): number {
  if (!arr.length) return 0;
  const s = [...arr].sort((a, b) => a - b);
  const p = (s.length - 1) * q;
  const lo = Math.floor(p);
  const hi = Math.ceil(p);
  return s[lo] + (s[hi] - s[lo]) * (p - lo);
}

/** 変動係数（母標準偏差 / 平均）。data-spec.md §11 条件C */
export function coefficientOfVariation(vals: number[]): number {
  if (!vals.length) return Infinity;
  const mean = sum(vals) / vals.length;
  if (!mean) return Infinity;
  const sd = Math.sqrt(sum(vals, (v) => (v - mean) ** 2) / vals.length);
  return sd / mean;
}
