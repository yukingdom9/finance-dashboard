import type { Transaction } from '../types/transaction';

/**
 * サンプルデータ生成（初回表示用）。architecture.md ディレクトリ構成 src/sample/generate.ts。
 *
 * 決定論的な擬似乱数で、添付CSVの構造を模した架空データを生成する。
 * design/fixtures/README.md の注意事項どおり、匿名化された実データ（fixtures/anonymized-real-data.csv）は
 * ここでは使わない（金額・日付が実データそのものであり、配布物に含めると家計が露出するため）。
 * ロジックはワイヤーフレーム（wireframe/finance-dashboard.html）のサンプル生成部を移植したもの。
 */

let seed = 20240124;
function rnd(): number {
  seed = (seed * 1103515245 + 12345) & 0x7fffffff;
  return seed / 0x7fffffff;
}
function ri(a: number, b: number): number {
  return a + Math.floor(rnd() * (b - a + 1));
}
function pick<T>(arr: T[]): T {
  return arr[Math.floor(rnd() * arr.length)];
}
function jitter(base: number, pct: number): number {
  return Math.round(base * (1 + (rnd() * 2 - 1) * pct));
}

const TODAY = new Date(2026, 8, 3); // 2026-09-03
const START = new Date(2024, 0, 1);

interface MerchantDef {
  n: string;
  c: string;
  s: string;
  a: number;
  v: number;
  f: number;
  b: string;
}
const M = (n: string, c: string, s: string, a: number, v: number, f: number, b: string): MerchantDef => ({ n, c, s, a, v, f, b });

const MERCHANTS: MerchantDef[] = [
  M('マクドナルド', '食費', '外食', 820, 0.22, 11, '三井住友カード'),
  M('すき家', '食費', '外食', 690, 0.2, 3.2, '三井住友カード'),
  M('かつや 稲毛海岸店', '食費', '外食', 950, 0.12, 1.4, '三井住友カード'),
  M('セブン-イレブン', '食費', '食料品', 980, 0.55, 1.4, '三井住友カード'),
  M('ファミリーマート', '食費', '食料品', 760, 0.5, 0.9, '三井住友カード'),
  M('ローソン', '食費', '食料品', 690, 0.5, 0.7, '三井住友カード'),
  M('ヤオコー 稲毛海岸店', '食費', '食料品', 3500, 0.3, 1.6, '三井住友カード'),
  M('コストコホールセール', '食費', '食料品', 9200, 0.35, 0.6, '三井住友カード'),
  M('イオンモール幕張新都心', '食費', '食料品', 2400, 0.5, 1.5, 'イオンカード'),
  M('業務スーパー', '食費', '食料品', 2800, 0.35, 0.7, '三井住友カード'),
  M('スターバックス', '食費', 'カフェ', 620, 0.25, 1.1, '三井住友カード'),
  M('ドトールコーヒー', '食費', 'カフェ', 480, 0.2, 0.6, '三井住友カード'),
  M('バーガーキング', '食費', '外食', 1080, 0.15, 0.5, '三井住友カード'),
  M('ミスタードーナツ', '食費', '外食', 580, 0.3, 0.9, '三井住友カード'),
  M('丸亀製麺', '食費', '外食', 870, 0.2, 0.8, '三井住友カード'),
  M('日高屋', '食費', '外食', 940, 0.2, 0.5, '三井住友カード'),
  M('ガスト', '食費', '外食', 1420, 0.3, 0.4, '三井住友カード'),
  M('Uber Eats', '食費', '外食', 2100, 0.3, 0.6, '三井住友カード'),
  M('居酒屋 とりまる', '食費', '外食', 4600, 0.4, 0.35, '三井住友カード'),
  M('Coke ON Pay', '食費', '食料品', 180, 0.15, 2.2, '三井住友カード'),
  M('ENEOS セルフ稲毛', '自動車', 'ガソリン', 5400, 0.3, 1.5, '三井住友カード'),
  M('タイムズ駐車場', '自動車', '駐車場', 700, 0.5, 1.1, '三井住友カード'),
  M('コイン洗車場', '自動車', '洗車', 500, 0.2, 0.6, '三井住友カード'),
  M('ETC 首都高速', '自動車', '道路料金', 1200, 0.5, 1.0, '三井住友カード'),
  M('JR東日本 モバイルSuica', '交通費', '電車', 1500, 0.5, 1.6, 'モバイルSuica'),
  M('京成バス', '交通費', 'バス', 260, 0.1, 0.5, 'モバイルSuica'),
  M('MKタクシー', '交通費', 'タクシー', 2800, 0.4, 0.18, '三井住友カード'),
  M('Amazon.co.jp', '日用品', '日用品', 2200, 0.7, 3.2, 'Amazon.co.jp'),
  M('マツモトキヨシ', '日用品', '日用品', 1800, 0.45, 1.2, '三井住友カード'),
  M('ニトリ', '日用品', '日用品', 3400, 0.5, 0.35, '三井住友カード'),
  M('ダイソー', '日用品', '日用品', 660, 0.4, 0.8, '三井住友カード'),
  M('ヨドバシカメラ', '日用品', '日用品', 4200, 0.7, 0.5, '三井住友カード'),
  M('ユニクロ', '衣服・美容', '衣服', 5400, 0.5, 0.5, '三井住友カード'),
  M('ZOZOTOWN', '衣服・美容', '衣服', 8600, 0.55, 0.3, '楽天カード'),
  M('ON THE GO 美容室', '衣服・美容', '美容院・理髪', 5700, 0.1, 0.6, '三井住友カード'),
  M('無印良品', '衣服・美容', '衣服', 3600, 0.5, 0.4, '三井住友カード'),
  M('Steam', '趣味・娯楽', '映画・音楽・ゲーム', 2400, 0.9, 1.6, '三井住友カード'),
  M('PlayStation Store', '趣味・娯楽', '映画・音楽・ゲーム', 4200, 0.6, 0.35, '三井住友カード'),
  M('タワーレコード', '趣味・娯楽', '音楽', 3200, 0.5, 0.3, '三井住友カード'),
  M('紀伊國屋書店', '教養・教育', '書籍', 1800, 0.5, 1.1, '三井住友カード'),
  M('Amazon Kindle', '教養・教育', '書籍', 980, 0.6, 2.4, 'Amazon.co.jp'),
  M('丸善ジュンク堂', '教養・教育', '書籍', 2600, 0.5, 0.5, '三井住友カード'),
  M('スギ薬局', '健康・医療', '薬', 1600, 0.4, 0.6, '三井住友カード'),
  M('稲毛海岸内科クリニック', '健康・医療', '医療費', 2400, 0.4, 0.2, '三井住友カード'),
  M('ロフト', '交際費', 'プレゼント代', 3800, 0.5, 0.25, '三井住友カード'),
  M('東京ガス', '水道・光熱費', 'ガス・灯油代', 5200, 0.45, 1, '千葉銀行'),
  M('関西電力', '水道・光熱費', '電気代', 11800, 0.42, 1, '三井住友カード'),
  M('千葉県営水道', '水道・光熱費', '水道代', 3050, 0.06, 0.5, '三井住友カード'),
];

interface RecurringDef {
  n: string;
  c: string;
  s: string;
  a: number;
  v: number;
  day: number;
  b: string;
  from: string | null;
  until?: string;
  months?: number[];
}
const RECURRING: RecurringDef[] = [
  { n: 'カンリヒ（管理費）', c: '住宅', s: '管理費・積立金', a: 29570, v: 0, day: 27, b: '千葉銀行', from: '2024-01' },
  { n: 'U-NEXT光 利用料', c: '通信費', s: 'インターネット', a: 3646, v: 0, day: 12, b: '三井住友カード', from: '2024-01' },
  { n: '楽天モバイル 通信料', c: '通信費', s: '携帯電話', a: 1078, v: 0, day: 16, b: '楽天カード', from: '2024-01' },
  { n: 'ChefBox 定期便', c: '食費', s: '食料品', a: 8640, v: 0.06, day: 8, b: '三井住友カード', from: '2024-03' },
  { n: 'Spotify Premium', c: '趣味・娯楽', s: '音楽', a: 980, v: 0, day: 5, b: '三井住友カード', from: '2024-01' },
  { n: 'Netflix', c: '趣味・娯楽', s: '映画・音楽・ゲーム', a: 1590, v: 0, day: 19, b: '三井住友カード', from: '2024-01' },
  { n: 'Amazonプライム会費', c: '趣味・娯楽', s: '映画・音楽・ゲーム', a: 600, v: 0, day: 22, b: 'Amazon.co.jp', from: '2024-01' },
  { n: 'エニタイムフィットネス', c: '健康・医療', s: 'フィットネス', a: 8580, v: 0, day: 3, b: '三井住友カード', from: '2025-04' },
  { n: 'ChatGPT Plus', c: '通信費', s: '情報サービス', a: 3000, v: 0.03, day: 14, b: '三井住友カード', from: '2024-06' },
  {
    n: 'Adobe Creative Cloud',
    c: '通信費',
    s: '情報サービス',
    a: 6480,
    v: 0,
    day: 23,
    b: '三井住友カード',
    from: '2024-01',
    until: '2025-07',
  },
  { n: '日経電子版', c: '教養・教育', s: '書籍', a: 4277, v: 0, day: 10, b: '三井住友カード', from: '2024-01', until: '2026-02' },
  {
    n: '損保ジャパン 自動車保険',
    c: '保険',
    s: 'その他保険',
    a: 19950,
    v: 0,
    day: 20,
    b: '千葉銀行',
    from: null,
    months: [4],
  },
];

const ONEOFF: [string, string, string, string, number, string][] = [
  ['2024-07-17', 'ヨドバシカメラ ドラム式洗濯機', '特別な支出', '家具・家電', 148000, '三井住友カード'],
  ['2024-08-23', 'APPLE STORE iPhone 15 Pro', '特別な支出', 'スマートフォン', 159800, '三井住友カード'],
  ['2024-09-19', 'ニトリ ソファ・ダイニング', '特別な支出', '家具・家電', 96800, '三井住友カード'],
  ['2024-11-02', 'JTB 沖縄旅行 3泊4日', '趣味・娯楽', '旅行', 138000, '三井住友カード'],
  ['2025-02-27', 'APPLE STORE MacBook Pro 14', '特別な支出', 'パソコン', 298000, '三井住友カード'],
  ['2025-03-21', 'LG ゲーミングモニター 32GS95UV', '特別な支出', 'パソコン', 164800, '三井住友カード'],
  ['2025-03-25', 'ロジクール MX Master / キーボード', '特別な支出', 'パソコン', 38600, '三井住友カード'],
  ['2025-05-29', 'ダイキン エアコン 14畳 工事込', '特別な支出', '家具・家電', 218000, '三井住友カード'],
  ['2025-07-12', 'HIS 台湾旅行 4泊5日', '趣味・娯楽', '旅行', 186000, '三井住友カード'],
  ['2025-09-18', 'APPLE STORE iPhone 17 Pro', '特別な支出', 'スマートフォン', 184800, '三井住友カード'],
  ['2025-11-29', 'Nintendo Switch 2 本体', '趣味・娯楽', '映画・音楽・ゲーム', 49800, '三井住友カード'],
  ['2026-02-25', 'ネッツトヨタ 車検・整備一式', '自動車', '車検・整備', 132400, '千葉銀行'],
  ['2026-03-29', 'フェンダー ストラトキャスター', '趣味・娯楽', '音楽', 186000, '楽天カード'],
  ['2026-05-16', 'JAL 北海道旅行 3泊4日', '趣味・娯楽', '旅行', 124000, '三井住友カード'],
  ['2026-06-20', 'ヨドバシカメラ 冷蔵庫 500L', '特別な支出', '家具・家電', 176000, '三井住友カード'],
];

const OUTLIERS: [string, string, string, string, number, string][] = [
  ['2024-12-20', '居酒屋 とりまる 忘年会', '食費', '外食', 24800, '三井住友カード'],
  ['2025-06-14', 'ホテルニューオータニ 会食', '食費', '外食', 38600, '三井住友カード'],
  ['2025-12-19', '居酒屋 とりまる 忘年会', '食費', '外食', 28400, '三井住友カード'],
  ['2026-04-11', 'ヤオコー 稲毛海岸店', '食費', '食料品', 18900, '三井住友カード'],
  ['2026-07-04', 'マツモトキヨシ', '日用品', '日用品', 22400, '三井住友カード'],
  ['2026-08-08', 'ON THE GO 美容室 縮毛矯正', '衣服・美容', '美容院・理髪', 26800, '三井住友カード'],
];

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}
function fmtDate(d: Date): string {
  return `${d.getFullYear()}/${pad2(d.getMonth() + 1)}/${pad2(d.getDate())}`;
}

let idCounter = 0;
function nextId(): string {
  idCounter++;
  return 'SAMPLE' + String(idCounter).padStart(6, '0');
}

function push(
  out: Transaction[],
  dateStr: string,
  name: string,
  amount: number,
  cat: string,
  sub: string,
  bank: string,
  opt: Partial<Pick<Transaction, 'include' | 'transfer'>> = {},
): void {
  const d = new Date(dateStr.replace(/-/g, '/'));
  if (d < START || d > TODAY) return;
  out.push({
    id: nextId(),
    date: fmtDate(d),
    y: d.getFullYear(),
    m: d.getMonth() + 1,
    ym: `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`,
    name,
    amount,
    bank,
    cat,
    sub,
    memo: '',
    include: opt.include ?? 1,
    transfer: opt.transfer ?? 0,
    src: 'sample',
  });
}

/** サンプルデータ生成のメイン関数。呼び出すたびに同じ結果を返す（決定論的）。 */
export function generateSampleTransactions(): Transaction[] {
  seed = 20240124;
  idCounter = 0;
  const out: Transaction[] = [];

  // 給与・賞与・その他収入
  for (let y = 2024; y <= 2026; y++) {
    for (let m = 1; m <= 12; m++) {
      const day = m === 11 ? 21 : 24;
      const base = 318000 + (y - 2024) * 7000 + ri(-2600, 3400);
      push(out, `${y}-${pad2(m)}-${pad2(day)}`, 'カ)ソルパツク 給与', base, '収入', '給与', '千葉銀行');
      if (m === 6 || m === 12) {
        push(out, `${y}-${pad2(m)}-${pad2(day)}`, 'カ)ソルパツク 賞与', jitter(392000 + (y - 2024) * 12000, 0.06), '収入', '給与', '千葉銀行');
      }
      const k = ri(2, 5);
      for (let i = 0; i < k; i++) {
        const dd = ri(1, 27);
        const t = pick([
          ['Amazonポイント', 'ポイント', ri(40, 1800)],
          ['割引', '割引', ri(24, 900)],
          ['利息', 'その他入金', ri(3, 180)],
          ['楽天ポイント', 'ポイント', ri(30, 1200)],
        ] as [string, string, number][]);
        push(out, `${y}-${pad2(m)}-${pad2(dd)}`, t[0], t[2], '収入', t[1], t[1] === 'その他入金' ? 'ドコモSMTBネット銀行' : 'Amazon.co.jp');
      }
    }
  }

  // 固定費
  for (const r of RECURRING) {
    for (let y = 2024; y <= 2026; y++) {
      for (let m = 1; m <= 12; m++) {
        const ym = `${y}-${pad2(m)}`;
        if (r.from && ym < r.from) continue;
        if (r.until && ym > r.until) continue;
        if (r.months && !r.months.includes(m)) continue;
        if (r.a === 0) continue;
        const amt = r.v === 0 ? r.a : jitter(r.a, r.v);
        push(out, `${y}-${pad2(m)}-${pad2(Math.min(r.day, 28))}`, r.n, -amt, r.c, r.s, r.b);
      }
    }
  }

  // 光熱費（季節性を持つ準固定費）
  const seasonE = [1.55, 1.5, 1.25, 1.0, 0.88, 0.95, 1.35, 1.62, 1.4, 1.0, 1.05, 1.35];
  const seasonG = [1.6, 1.55, 1.3, 1.05, 0.85, 0.7, 0.6, 0.6, 0.65, 0.85, 1.15, 1.45];
  for (let y = 2024; y <= 2026; y++) {
    for (let m = 1; m <= 12; m++) {
      const infl = 1 + (y - 2024) * 0.075;
      push(
        out,
        `${y}-${pad2(m)}-22`,
        `関西電力 電気 ${String(y).slice(2)}年${m}月`,
        -Math.round(jitter(9800 * seasonE[m - 1] * infl, 0.07)),
        '水道・光熱費',
        '電気代',
        '三井住友カード',
      );
      push(
        out,
        `${y}-${pad2(m)}-18`,
        `東京ガス ${m}月分`,
        -Math.round(jitter(4200 * seasonG[m - 1] * infl, 0.08)),
        '水道・光熱費',
        'ガス・灯油代',
        '千葉銀行',
      );
      if (m % 2 === 1) push(out, `${y}-${pad2(m)}-15`, '千葉県営水道 料金', -Math.round(jitter(6100 * infl, 0.05)), '水道・光熱費', '水道代', '三井住友カード');
    }
  }

  // 税・社会保障（年数回のまとまった支出）
  for (let y = 2024; y <= 2026; y++) {
    ([[6, 12], [8, 18], [10, 31], [1, 31]] as [number, number][]).forEach(([m, d], i) => {
      push(out, `${y}-${pad2(m)}-${pad2(d)}`, '千葉市 住民税 第' + (i + 1) + '期', -jitter(58000 + (y - 2024) * 2500, 0.03), '税・社会保障', '所得税・住民税', '千葉銀行');
    });
    push(out, `${y}-05-09`, '千葉市 自動車税', -jitter(39500, 0.01), '税・社会保障', 'その他税・社会保障', '千葉銀行');
    for (let m = 1; m <= 12; m++) {
      push(out, `${y}-${pad2(m)}-19`, '国税', -ri(4, 40), '税・社会保障', 'その他税・社会保障', 'ドコモSMTBネット銀行');
      push(out, `${y}-${pad2(m)}-19`, '地方税', -ri(2, 14), '税・社会保障', '所得税・住民税', 'ドコモSMTBネット銀行');
    }
  }

  // 日常の変動支出
  for (let y = 2024; y <= 2026; y++) {
    for (let m = 1; m <= 12; m++) {
      if (y === 2026 && m > 9) continue;
      for (const mm of MERCHANTS) {
        if (mm.c === '水道・光熱費') continue;
        let mult = 1;
        if (mm.s === '外食') mult = y === 2024 ? 0.92 : y === 2025 ? 1.14 : 1.05;
        if (mm.c === '日用品') mult = y === 2024 ? 1.2 : y === 2025 ? 1.0 : 0.72;
        if (mm.c === '衣服・美容') mult = y === 2024 ? 1.25 : y === 2025 ? 0.9 : 0.85;
        if (mm.c === '教養・教育') mult = y === 2024 ? 0.35 : y === 2025 ? 1.25 : 1.1;
        const n = Math.round(mm.f * mult + (rnd() < (mm.f * mult) % 1 ? 1 : 0));
        for (let i = 0; i < n; i++) {
          const day = ri(1, 28);
          push(out, `${y}-${pad2(m)}-${pad2(day)}`, mm.n, -Math.max(60, Math.round(jitter(mm.a, mm.v))), mm.c, mm.s, mm.b);
        }
      }
      if (rnd() < 0.45) push(out, `${y}-${pad2(m)}-${pad2(ri(2, 26))}`, 'ATM セブン銀行', -pick([10000, 20000, 30000]), '現金・カード', 'ATM引き出し', 'ドコモSMTBネット銀行');
      if (rnd() < 0.5) push(out, `${y}-${pad2(m)}-${pad2(ri(2, 26))}`, 'モバイルSuica チャージ', -3000, '現金・カード', '電子マネー', 'VIEW CARD');
      if (rnd() < 0.28) push(out, `${y}-${pad2(m)}-${pad2(ri(2, 26))}`, 'AMAZON.CO.JP (返品)', ri(300, 4200), '未分類', '未分類', '三井住友カード');
      if (rnd() < 0.2) push(out, `${y}-${pad2(m)}-${pad2(ri(2, 26))}`, '不明な引き落とし', -ri(500, 3800), '未分類', '未分類', '三井住友カード');
    }
  }

  // 単発の大型支出・異常値
  for (const [d, n, c, s, a, b] of ONEOFF) push(out, d, n, -a, c, s, b);
  for (const [d, n, c, s, a, b] of OUTLIERS) push(out, d, n, -a, c, s, b);

  // 集計対象外（振替・二重計上）
  for (let y = 2024; y <= 2026; y++) {
    for (let m = 1; m <= 12; m++) {
      if (y === 2026 && m > 9) continue;
      push(out, `${y}-${pad2(m)}-26`, 'ミツイスミトモカ-ド 引き落とし', -ri(80000, 260000), '現金・カード', 'カード引き落とし', '千葉銀行', { include: 0, transfer: 1 });
      push(out, `${y}-${pad2(m)}-03`, '振替 SBI証券 投信積立', -100000, 'その他', '投資', 'ドコモSMTBネット銀行', { include: 0, transfer: 0 });
      for (let i = 0; i < ri(3, 9); i++) {
        push(out, `${y}-${pad2(m)}-${pad2(ri(1, 28))}`, 'AMAZON.CO.JP', -ri(500, 9000), '教養・教育', '書籍', '三井住友カード', { include: 0, transfer: 1 });
      }
    }
  }

  out.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
  return out;
}
