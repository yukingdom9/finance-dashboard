import type { Transaction } from '../types/transaction';

export interface MergeResult {
  rows: Transaction[];
  added: number;
  updated: number;
  duplicate: number;
  /** 内容キーでの一致によりIDの変化を検出した件数（data-spec.md §3-3） */
  idChanged: number;
}

function contentKey(t: Pick<Transaction, 'date' | 'name' | 'amount' | 'bank'>): string {
  return `${t.date}|${t.name}|${t.amount}|${t.bank}`;
}

/**
 * 重複排除（複数CSVの統合）。data-spec.md §3-3 を唯一の正として実装する。
 *
 * IDと内容キーの二重照合を行う：
 * (a) IDが既知で内容に差分あり → 上書き（updated++）／すべて同じ → 何もしない（duplicate++）
 * (b) IDが未知だが内容キー（日付・内容・金額・金融機関）が一致 → 既存を新しい内容で更新し、
 *     既存のIDを保持する（duplicate++ かつ idChanged++）。内容キーの一致は1件ずつ消費し、
 *     同日・同店・同額の取引が本当に複数ある場合は2件目以降を新規として追加する
 * (c) いずれにも一致しない → 追加（added++）
 *
 * ワイヤーフレーム（wireframe/finance-dashboard.html）の mergeRows はUI検証用の簡略版で
 * IDのみの一致判定だった。本実装はIDの再エクスポート不安定リスクに備える保険として
 * data-spec.md の記述どおり内容キー照合を必ず併用する。
 */
export function mergeRows(existing: Transaction[], incoming: Transaction[]): MergeResult {
  const result: Transaction[] = existing.slice();
  const byId = new Map<string, number>();
  const byContent = new Map<string, number[]>();

  result.forEach((t, i) => {
    byId.set(t.id, i);
    const ck = contentKey(t);
    const arr = byContent.get(ck);
    if (arr) arr.push(i);
    else byContent.set(ck, [i]);
  });

  let added = 0;
  let updated = 0;
  let duplicate = 0;
  let idChanged = 0;

  for (const t of incoming) {
    const idIdx = byId.get(t.id);
    if (idIdx !== undefined) {
      const prev = result[idIdx];
      const changed = prev.amount !== t.amount || prev.cat !== t.cat || prev.sub !== t.sub || prev.include !== t.include;
      if (changed) {
        result[idIdx] = { ...t, id: prev.id };
        updated++;
      } else {
        duplicate++;
      }
      continue;
    }

    const ck = contentKey(t);
    const candidates = byContent.get(ck);
    if (candidates && candidates.length > 0) {
      const existingIdx = candidates.shift()!;
      const prevId = result[existingIdx].id;
      result[existingIdx] = { ...t, id: prevId };
      duplicate++;
      idChanged++;
      continue;
    }

    // (c) 追加。byContent は既存データ E のみのスナップショットとして扱う。
    // 新規追加分をここへ登録すると、同一バッチ内で内容キーがたまたま重なる
    // "本当に複数ある" 正当な別取引（実データで実際に発生する）まで誤って
    // 統合してしまう。2件目以降も引き続き (c) の新規追加として扱われるべきで、
    // 3件目以降が2件目に "idChanged" として吸収されるような連鎖が起きてはならない。
    const newIndex = result.length;
    result.push(t);
    added++;
    byId.set(t.id, newIndex);
  }

  return { rows: result, added, updated, duplicate, idChanged };
}
