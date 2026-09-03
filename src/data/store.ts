import { SCHEMA_VERSION, type StoredDataset, type StoreMode } from '../types/dataset';

/**
 * 永続化：IndexedDB → localStorage → メモリの3段フォールバック（architecture.md §7）。
 * サンプルデータは保存しない（呼び出し側の責務。DatasetContext.isDemo が true の間は
 * storeSave を呼ばない）。
 */

const DB_NAME = 'money-flow';
const DB_STORE = 'kv';
const KEY = 'dataset';
const IDB_TIMEOUT_MS = 3000;

export interface StoreState {
  mode: StoreMode;
  /** 保存できなかった場合などの警告文言 */
  note: string;
}

function idbOpen(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!('indexedDB' in window)) {
      reject(new Error('indexedDB なし'));
      return;
    }
    let settled = false;
    const timer = setTimeout(() => {
      if (!settled) {
        settled = true;
        reject(new Error('タイムアウト'));
      }
    }, IDB_TIMEOUT_MS);

    let req: IDBOpenDBRequest;
    try {
      req = indexedDB.open(DB_NAME, 1);
    } catch (e) {
      clearTimeout(timer);
      reject(e);
      return;
    }
    req.onupgradeneeded = () => {
      req.result.createObjectStore(DB_STORE);
    };
    req.onsuccess = () => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(req.result);
    };
    req.onerror = () => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      reject(req.error ?? new Error('open失敗'));
    };
  });
}

export async function storeSave(payload: StoredDataset): Promise<StoreState> {
  const json = JSON.stringify(payload);
  try {
    const db = await idbOpen();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(DB_STORE, 'readwrite');
      tx.objectStore(DB_STORE).put(json, KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    return { mode: 'indexeddb', note: '' };
  } catch {
    // 失敗 → localStorage へフォールバック
  }
  try {
    localStorage.setItem(DB_NAME, json);
    return { mode: 'localstorage', note: '' };
  } catch {
    return {
      mode: 'memory',
      note: 'このブラウザでは保存できませんでした。バックアップの書き出しをお使いください。',
    };
  }
}

export type LoadResult =
  | { status: 'ok'; dataset: StoredDataset; mode: StoreMode }
  | { status: 'empty' }
  | { status: 'newer'; savedVersion: number }
  | { status: 'corrupt'; error: string };

export function normalizeSchema(raw: unknown): LoadResult {
  if (typeof raw !== 'object' || raw === null || !Array.isArray((raw as StoredDataset).rows)) {
    return { status: 'corrupt', error: '保存データの形式が不正です' };
  }
  const ds = raw as StoredDataset;
  const version = ds.schemaVersion ?? 1; // 未定義 → 版1として読む（data-spec.md §3-4）
  if (version > SCHEMA_VERSION) {
    return { status: 'newer', savedVersion: version };
  }
  // version < SCHEMA_VERSION の場合はここで移行処理を挟む（現状 SCHEMA_VERSION=1 のため未使用）
  return {
    status: 'ok',
    dataset: { ...ds, schemaVersion: SCHEMA_VERSION, aliases: ds.aliases ?? { merge: {}, labels: {} }, files: ds.files ?? [] },
    mode: 'memory', // 呼び出し側で実際のmodeに上書きする
  };
}

export async function storeLoad(): Promise<LoadResult> {
  try {
    const db = await idbOpen();
    const json = await new Promise<string | undefined>((resolve, reject) => {
      const tx = db.transaction(DB_STORE, 'readonly');
      const r = tx.objectStore(DB_STORE).get(KEY);
      r.onsuccess = () => resolve(r.result as string | undefined);
      r.onerror = () => reject(r.error);
    });
    if (json) {
      const result = normalizeSchema(JSON.parse(json));
      if (result.status === 'ok') return { ...result, mode: 'indexeddb' };
      return result;
    }
  } catch {
    // IndexedDBが使えない、またはデータなし → localStorageへ
  }
  try {
    const json = localStorage.getItem(DB_NAME);
    if (json) {
      const result = normalizeSchema(JSON.parse(json));
      if (result.status === 'ok') return { ...result, mode: 'localstorage' };
      return result;
    }
  } catch {
    // localStorageも使えない
  }
  return { status: 'empty' };
}

export async function storeClear(): Promise<void> {
  try {
    const db = await idbOpen();
    await new Promise<void>((resolve) => {
      const tx = db.transaction(DB_STORE, 'readwrite');
      tx.objectStore(DB_STORE).delete(KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  } catch {
    // 無視
  }
  try {
    localStorage.removeItem(DB_NAME);
  } catch {
    // 無視
  }
}
