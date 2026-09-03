/** 軸目盛りの丸め（architecture.md §10-2）。刻みは 1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10 の系列。 */
export function niceMax(v: number): number {
  if (v <= 0) return 1;
  const e = Math.pow(10, Math.floor(Math.log10(v)));
  const f = v / e;
  const step = f <= 1 ? 1 : f <= 1.5 ? 1.5 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 3 ? 3 : f <= 4 ? 4 : f <= 5 ? 5 : f <= 6 ? 6 : f <= 8 ? 8 : 10;
  return step * e;
}

export function axisTicks(max: number, n = 4): number[] {
  const out: number[] = [];
  for (let i = 0; i <= n; i++) out.push((max * i) / n);
  return out;
}
