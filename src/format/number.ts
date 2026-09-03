/**
 * 数値・日付の書式（ui-spec.md §2-7）。
 * 「丸めは表示の直前にのみ行う」（data-spec.md §15-2）の原則に従い、
 * ここに置く関数はすべて表示直前の丸め専用とする。内部計算では使わないこと。
 */

const NUM_FMT = new Intl.NumberFormat('ja-JP');

/** 金額（絶対値）。例：¥138,391 */
export function yen(n: number): string {
  return '¥' + NUM_FMT.format(Math.round(Math.abs(n)));
}

/** 符号付き金額。負の場合は「−」（マイナス記号）を前置する。例：−¥98,034 */
export function yenS(n: number): string {
  return (n < 0 ? '−' : '') + yen(n);
}

/** 万単位・小数1桁（軸ラベル・省略表示用）。1万未満はそのまま円で表示。例：50.0万 / 8,200 */
export function man(n: number): string {
  const a = Math.abs(n);
  if (a >= 10000) {
    const sign = n < 0 ? '−' : '';
    return sign + (Math.round(a / 1000) / 10).toFixed(1) + '万';
  }
  return (n < 0 ? '−' : '') + NUM_FMT.format(Math.round(a));
}

/** 符号付き割合。小数第1位まで。例：+8.4% / -22.9% */
export function pct(n: number): string {
  return (n > 0 ? '+' : n < 0 ? '−' : '') + Math.abs(n).toFixed(1) + '%';
}

/** 倍率。100を超える場合は「100倍超」（data-spec.md §12, ui-spec.md §2-7） */
export function ratioLabel(n: number): string {
  return n >= 100 ? '100倍超' : Math.round(n) + '倍';
}

/** 日付（一覧）。YYYY/MM/DD はすでに Transaction.date がこの形式のためそのまま使う */
export function dateFull(date: string): string {
  return date;
}

/** 日付（狭い列）。MM/DD */
export function dateShort(date: string): string {
  const parts = date.split('/');
  return parts.length === 3 ? `${parts[1]}/${parts[2]}` : date;
}

/** 年月。YYYY年M月 */
export function ymLabel(ym: string): string {
  const [y, m] = ym.split('-');
  return `${y}年${Number(m)}月`;
}

const MONTH_LABELS = Array.from({ length: 12 }, (_, i) => `${i + 1}月`);
export function monthLabels(): string[] {
  return MONTH_LABELS;
}

export function pad2(n: number): string {
  return String(n).padStart(2, '0');
}
