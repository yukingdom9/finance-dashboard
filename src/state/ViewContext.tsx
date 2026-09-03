import { createContext, useCallback, useContext, useEffect, useMemo, useReducer } from 'react';
import type { ReactNode } from 'react';
import { useDataset } from './DatasetContext';

export type ViewId =
  | 'dashboard'
  | 'spending'
  | 'categories'
  | 'trends'
  | 'fixed'
  | 'anomaly'
  | 'merchants'
  | 'merchantDetail'
  | 'transactions'
  | 'import';

export type ModalState =
  | { type: 'transaction'; id: string }
  | { type: 'dataQuality' }
  | { type: 'mergeMerchants'; keys: string[] };

export interface ViewState {
  view: ViewId;
  year: number | null;
  compareYear: number | null;
  category: string | null;
  month: string | null;
  merchant: string | null;
  spendMode: 'oneoff' | 'need';
  trendMetric: 'total' | 'avg';
  fixedFilter: 'all' | 'on' | 'new' | 'stopped';
  merchantSort: 'total' | 'count' | 'avg';
  merchantQuery: string;
  txSort: { key: string; dir: 1 | -1 };
  txQuery: string;
  txCategory: string;
  txPeriod: string;
  modal: ModalState | null;
}

const initial: ViewState = {
  view: 'dashboard',
  year: null,
  compareYear: null,
  category: null,
  month: null,
  merchant: null,
  spendMode: 'oneoff',
  trendMetric: 'total',
  fixedFilter: 'all',
  merchantSort: 'total',
  merchantQuery: '',
  txSort: { key: 'date', dir: -1 },
  txQuery: '',
  txCategory: 'all',
  txPeriod: 'all',
  modal: null,
};

type Action = { type: 'PATCH'; payload: Partial<ViewState> };

function reducer(state: ViewState, action: Action): ViewState {
  switch (action.type) {
    case 'PATCH':
      return { ...state, ...action.payload };
    default:
      return state;
  }
}

export interface ViewContextValue {
  state: ViewState;
  goToView: (v: ViewId) => void;
  setYear: (y: number) => void;
  setCompareYear: (y: number) => void;
  selectCategory: (cat: string) => void;
  selectMonth: (ym: string | null) => void;
  selectMerchant: (key: string | null) => void;
  goBackOneLevel: () => void;
  setSpendMode: (m: ViewState['spendMode']) => void;
  setTrendMetric: (m: ViewState['trendMetric']) => void;
  setFixedFilter: (f: ViewState['fixedFilter']) => void;
  setMerchantSort: (s: ViewState['merchantSort']) => void;
  setMerchantQuery: (q: string) => void;
  setTxSort: (key: string) => void;
  setTxQuery: (q: string) => void;
  setTxCategory: (c: string) => void;
  setTxPeriod: (p: string) => void;
  openModal: (m: ModalState) => void;
  closeModal: () => void;
  patch: (p: Partial<ViewState>) => void;
}

const ViewCtx = createContext<ViewContextValue | null>(null);

export function ViewProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initial);
  const { state: ds } = useDataset();
  const patch = useCallback((p: Partial<ViewState>) => dispatch({ type: 'PATCH', payload: p }), []);

  // データセット更新後に必ず整合を取る（architecture.md §8「状態の整合を保つ処理」）
  useEffect(() => {
    const years = ds.index.years;
    if (!years.length) {
      if (state.year !== null || state.compareYear !== null) patch({ year: null, compareYear: null });
      return;
    }
    const updates: Partial<ViewState> = {};
    let year = state.year;
    if (year === null || !years.includes(year)) {
      year = years[years.length - 1];
      updates.year = year;
    }
    const others = years.filter((y) => y !== year);
    if (state.compareYear === null || state.compareYear === year || !others.includes(state.compareYear)) {
      updates.compareYear = others.length ? others[others.length - 1] : year;
    }
    if (state.category && !ds.index.expenses.some((t) => t.cat === state.category)) {
      updates.category = null;
      updates.month = null;
      updates.merchant = null;
    }
    if (Object.keys(updates).length) patch(updates);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ds.index]);

  const goToView = useCallback((v: ViewId) => patch({ view: v }), [patch]);
  const setYear = useCallback((y: number) => patch({ year: y }), [patch]);
  const setCompareYear = useCallback((y: number) => patch({ compareYear: y }), [patch]);
  const selectCategory = useCallback((cat: string) => patch({ view: 'categories', category: cat, month: null, merchant: null }), [patch]);
  const selectMonth = useCallback((ym: string | null) => patch({ month: ym, merchant: null }), [patch]);
  const selectMerchant = useCallback((key: string | null) => patch({ merchant: key }), [patch]);
  const goBackOneLevel = useCallback(() => {
    if (state.merchant) patch({ merchant: null });
    else if (state.month) patch({ month: null });
  }, [state.merchant, state.month, patch]);
  const setSpendMode = useCallback((m: ViewState['spendMode']) => patch({ spendMode: m }), [patch]);
  const setTrendMetric = useCallback((m: ViewState['trendMetric']) => patch({ trendMetric: m }), [patch]);
  const setFixedFilter = useCallback((f: ViewState['fixedFilter']) => patch({ fixedFilter: f }), [patch]);
  const setMerchantSort = useCallback((s: ViewState['merchantSort']) => patch({ merchantSort: s }), [patch]);
  const setMerchantQuery = useCallback((q: string) => patch({ merchantQuery: q }), [patch]);
  const setTxSort = useCallback(
    (key: string) => {
      patch({ txSort: state.txSort.key === key ? { key, dir: (state.txSort.dir * -1) as 1 | -1 } : { key, dir: -1 } });
    },
    [state.txSort, patch],
  );
  const setTxQuery = useCallback((q: string) => patch({ txQuery: q }), [patch]);
  const setTxCategory = useCallback((c: string) => patch({ txCategory: c }), [patch]);
  const setTxPeriod = useCallback((p: string) => patch({ txPeriod: p }), [patch]);
  const openModal = useCallback((m: ModalState) => patch({ modal: m }), [patch]);
  const closeModal = useCallback(() => patch({ modal: null }), [patch]);

  const value = useMemo<ViewContextValue>(
    () => ({
      state,
      goToView,
      setYear,
      setCompareYear,
      selectCategory,
      selectMonth,
      selectMerchant,
      goBackOneLevel,
      setSpendMode,
      setTrendMetric,
      setFixedFilter,
      setMerchantSort,
      setMerchantQuery,
      setTxSort,
      setTxQuery,
      setTxCategory,
      setTxPeriod,
      openModal,
      closeModal,
      patch,
    }),
    [
      state,
      goToView,
      setYear,
      setCompareYear,
      selectCategory,
      selectMonth,
      selectMerchant,
      goBackOneLevel,
      setSpendMode,
      setTrendMetric,
      setFixedFilter,
      setMerchantSort,
      setMerchantQuery,
      setTxSort,
      setTxQuery,
      setTxCategory,
      setTxPeriod,
      openModal,
      closeModal,
      patch,
    ],
  );

  return <ViewCtx.Provider value={value}>{children}</ViewCtx.Provider>;
}

export function useView(): ViewContextValue {
  const ctx = useContext(ViewCtx);
  if (!ctx) throw new Error('useView は ViewProvider の内側で使ってください');
  return ctx;
}
