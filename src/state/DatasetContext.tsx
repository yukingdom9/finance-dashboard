import { createContext, useCallback, useContext, useEffect, useMemo, useReducer } from 'react';
import type { ReactNode } from 'react';
import type { Transaction } from '../types/transaction';
import type { AliasMap, ImportRecord, ImportResult, StoreMode } from '../types/dataset';
import { emptyAliasMap, SCHEMA_VERSION } from '../types/dataset';
import type { DerivedIndex } from '../types/analysis';
import { buildIndex } from '../analysis/index';
import { storeLoad, storeSave, storeClear } from '../data/store';
import { importFiles } from '../data/importFiles';
import { exportBackup, importBackup } from '../data/backup';
import { generateSampleTransactions } from '../sample/generate';

export interface DatasetState {
  rows: Transaction[];
  files: ImportRecord[];
  aliases: AliasMap;
  isDemo: boolean;
  storeMode: StoreMode;
  storeNote: string;
  index: DerivedIndex;
  lastImport: ImportResult[] | null;
  /** 保存済みの利用者データが存在するか（サンプル表示中でも把握しておく。ui-spec.md V-09） */
  hasSavedData: boolean;
  ready: boolean;
}

type SetDataPayload = Partial<Omit<DatasetState, 'index'>> & {
  rows: Transaction[];
  aliases: AliasMap;
};

type Action = { type: 'SET_DATA'; payload: SetDataPayload } | { type: 'SET_READY' };

function reducer(state: DatasetState, action: Action): DatasetState {
  switch (action.type) {
    case 'SET_DATA': {
      const next: DatasetState = { ...state, ...action.payload, index: buildIndex(action.payload.rows, action.payload.aliases) };
      return next;
    }
    case 'SET_READY':
      return { ...state, ready: true };
    default:
      return state;
  }
}

function initialState(): DatasetState {
  return {
    rows: [],
    files: [],
    aliases: emptyAliasMap(),
    isDemo: true,
    storeMode: 'memory',
    storeNote: '',
    index: buildIndex([], emptyAliasMap()),
    lastImport: null,
    hasSavedData: false,
    ready: false,
  };
}

export interface DatasetContextValue {
  state: DatasetState;
  importCsv: (files: File[]) => Promise<ImportResult[]>;
  importBackupFile: (file: File) => Promise<{ ok: boolean; error?: string }>;
  exportBackupFile: () => void;
  resetAll: () => Promise<void>;
  showDemo: () => void;
  returnToUserData: () => Promise<boolean>;
  updateAliases: (aliases: AliasMap) => Promise<void>;
}

const DatasetContext = createContext<DatasetContextValue | null>(null);

export function DatasetProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, initialState);

  // 初回起動：保存済みデータを復元する。無ければサンプルデータを表示する（architecture.md §7-1）。
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const result = await storeLoad();
      if (cancelled) return;
      if (result.status === 'ok') {
        dispatch({
          type: 'SET_DATA',
          payload: {
            rows: result.dataset.rows,
            files: result.dataset.files,
            aliases: result.dataset.aliases,
            isDemo: false,
            storeMode: result.mode,
            storeNote: '',
            hasSavedData: true,
          },
        });
      } else {
        const note =
          result.status === 'newer'
            ? '新しい版で保存されたデータです。アプリを更新してください。'
            : result.status === 'corrupt'
              ? '保存データの読み込みに失敗しました。バックアップから復元してください。'
              : '';
        dispatch({
          type: 'SET_DATA',
          payload: {
            rows: generateSampleTransactions(),
            files: [],
            aliases: emptyAliasMap(),
            isDemo: true,
            storeMode: 'memory',
            storeNote: note,
            hasSavedData: false,
          },
        });
      }
      dispatch({ type: 'SET_READY' });
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const importCsv = useCallback(
    async (files: File[]) => {
      const outcome = await importFiles(files, {
        isDemo: state.isDemo,
        currentRows: state.rows,
        currentFiles: state.files,
        currentAliases: state.aliases,
      });
      const storeState = await storeSave({
        schemaVersion: SCHEMA_VERSION,
        rows: outcome.rows,
        files: outcome.files,
        aliases: outcome.aliases,
        savedAt: new Date().toISOString(),
      });
      dispatch({
        type: 'SET_DATA',
        payload: {
          rows: outcome.rows,
          files: outcome.files,
          aliases: outcome.aliases,
          isDemo: false,
          storeMode: storeState.mode,
          storeNote: storeState.note,
          lastImport: outcome.results,
          hasSavedData: true,
        },
      });
      return outcome.results;
    },
    [state.isDemo, state.rows, state.files, state.aliases],
  );

  const importBackupFile = useCallback(async (file: File) => {
    const result = await importBackup(file);
    if (result.status !== 'ok') {
      const error = result.status === 'newer' ? '新しい版で保存されたバックアップです。アプリを更新してください。' : result.error;
      // 失敗時も lastImport を更新し、表示層（Import.tsx）が ds.lastImport だけを見れば
      // 常に最新の結果を反映できるようにする（一時的なローカル state を持たせない）。
      dispatch({ type: 'SET_DATA', payload: { rows: state.rows, aliases: state.aliases, lastImport: [{ name: file.name, error }] } });
      return { ok: false, error };
    }
    const storeState = await storeSave(result.dataset);
    dispatch({
      type: 'SET_DATA',
      payload: {
        rows: result.dataset.rows,
        files: result.dataset.files,
        aliases: result.dataset.aliases,
        isDemo: false,
        storeMode: storeState.mode,
        storeNote: storeState.note,
        lastImport: [
          {
            name: 'バックアップ',
            enc: 'UTF-8',
            read: result.dataset.rows.length,
            added: result.dataset.rows.length,
            dup: 0,
            updated: 0,
            skipped: 0,
            idChanged: 0,
            hasId: true,
            span: '',
            at: new Date().toISOString(),
          },
        ],
        hasSavedData: true,
      },
    });
    return { ok: true };
  }, [state.rows, state.aliases]);

  const exportBackupFile = useCallback(() => {
    exportBackup({
      schemaVersion: SCHEMA_VERSION,
      rows: state.rows,
      files: state.files,
      aliases: state.aliases,
      savedAt: new Date().toISOString(),
    });
  }, [state.rows, state.files, state.aliases]);

  const resetAll = useCallback(async () => {
    await storeClear();
    dispatch({
      type: 'SET_DATA',
      payload: {
        rows: generateSampleTransactions(),
        files: [],
        aliases: emptyAliasMap(),
        isDemo: true,
        storeMode: 'memory',
        storeNote: '',
        lastImport: null,
        hasSavedData: false,
      },
    });
  }, []);

  const showDemo = useCallback(() => {
    dispatch({
      type: 'SET_DATA',
      payload: {
        rows: generateSampleTransactions(),
        files: [],
        aliases: emptyAliasMap(),
        isDemo: true,
        lastImport: null,
      },
    });
  }, []);

  /**
   * 自分のデータに戻る（実装判断）。
   * ui-spec.md V-09には「サンプルに戻して見る」から利用者データへ戻る専用の操作が
   * 明記されていない。data-spec.md §3-6 の状態Bはページ再読み込みかCSV再取り込みでのみ
   * 復帰する設計とも読めるが、それではサンプルを一目見ただけの利用者が不便になるため、
   * 保存領域を読み直すだけの安全な操作として追加した。集計や保存の仕様には影響しない
   * 表示層の操作であり、data-spec.md の計算ロジックとは矛盾しない。
   */
  const returnToUserData = useCallback(async () => {
    const result = await storeLoad();
    if (result.status !== 'ok') return false;
    dispatch({
      type: 'SET_DATA',
      payload: {
        rows: result.dataset.rows,
        files: result.dataset.files,
        aliases: result.dataset.aliases,
        isDemo: false,
        storeMode: result.mode,
        hasSavedData: true,
      },
    });
    return true;
  }, []);

  const updateAliases = useCallback(
    async (aliases: AliasMap) => {
      if (state.isDemo) {
        // サンプル表示中は保存しない（features.md F-02）
        dispatch({ type: 'SET_DATA', payload: { rows: state.rows, files: state.files, aliases } });
        return;
      }
      const storeState = await storeSave({
        schemaVersion: SCHEMA_VERSION,
        rows: state.rows,
        files: state.files,
        aliases,
        savedAt: new Date().toISOString(),
      });
      dispatch({
        type: 'SET_DATA',
        payload: { rows: state.rows, files: state.files, aliases, storeMode: storeState.mode, storeNote: storeState.note },
      });
    },
    [state.isDemo, state.rows, state.files],
  );

  const value = useMemo<DatasetContextValue>(
    () => ({ state, importCsv, importBackupFile, exportBackupFile, resetAll, showDemo, returnToUserData, updateAliases }),
    [state, importCsv, importBackupFile, exportBackupFile, resetAll, showDemo, returnToUserData, updateAliases],
  );

  return <DatasetContext.Provider value={value}>{children}</DatasetContext.Provider>;
}

export function useDataset(): DatasetContextValue {
  const ctx = useContext(DatasetContext);
  if (!ctx) throw new Error('useDataset は DatasetProvider の内側で使ってください');
  return ctx;
}
