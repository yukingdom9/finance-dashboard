import { useDataset } from '../state/DatasetContext';
import { useView } from '../state/ViewContext';
import type { ViewId } from '../state/ViewContext';

const NAV_ITEMS: { id: ViewId; ico: string; label: string }[] = [
  { id: 'dashboard', ico: '◉', label: 'ホーム' },
  { id: 'spending', ico: '▤', label: '支出をくわしく' },
  { id: 'categories', ico: '▧', label: 'カテゴリー別' },
  { id: 'trends', ico: '◫', label: '年ごとの比較' },
  { id: 'fixed', ico: '↻', label: '決まって出ていくお金' },
  { id: 'anomaly', ico: '△', label: 'いつもと違う支出' },
  { id: 'merchants', ico: '▣', label: 'お店・サービス別' },
  { id: 'transactions', ico: '≡', label: '取引をさがす' },
];
const IMPORT_ITEM: { id: ViewId; ico: string; label: string } = { id: 'import', ico: '⤓', label: 'データを読み込む' };

export function Sidebar() {
  const { state: ds } = useDataset();
  const { state: vs, goToView, setYear, setCompareYear, openModal } = useView();
  const years = ds.index.years;

  const navBtn = (item: (typeof NAV_ITEMS)[number]) => {
    const active = vs.view === item.id || (item.id === 'merchants' && vs.view === 'merchantDetail');
    return (
      <button key={item.id} aria-current={active ? 'page' : undefined} onClick={() => goToView(item.id)}>
        <span className="ico">{item.ico}</span>
        {item.label}
      </button>
    );
  };

  return (
    <aside className="rail">
      <div className="brand">
        <b>お金の流れ</b>
        <span>家計データ分析</span>
      </div>
      <nav className="nav">{NAV_ITEMS.map(navBtn)}</nav>
      <div className="nav-sep" />
      <div className="period">
        <div>
          <label htmlFor="selYear">見る年</label>
          <select id="selYear" value={vs.year ?? ''} onChange={(e) => setYear(Number(e.target.value))}>
            {years
              .slice()
              .reverse()
              .map((y) => (
                <option key={y} value={y}>
                  {y}年
                </option>
              ))}
          </select>
        </div>
        <div>
          <label htmlFor="selCmp">くらべる年</label>
          <select id="selCmp" value={vs.compareYear ?? ''} onChange={(e) => setCompareYear(Number(e.target.value))}>
            {years
              .filter((y) => y !== vs.year)
              .slice()
              .reverse()
              .map((y) => (
                <option key={y} value={y}>
                  {y}年
                </option>
              ))}
          </select>
        </div>
      </div>
      <div className="datanote">
        {ds.isDemo && (
          <>
            <span className="chip" style={{ marginBottom: 6, display: 'inline-block' }}>
              サンプルデータ
            </span>
            <br />
          </>
        )}
        読み込み済み {ds.index.all.length.toLocaleString('ja-JP')}件
        <br />
        集計対象 {ds.index.included.length.toLocaleString('ja-JP')}件
        <br />
        <button onClick={() => openModal({ type: 'dataQuality' })}>除外の内訳</button>
      </div>
      <div className="rail-foot nav">{navBtn(IMPORT_ITEM)}</div>
    </aside>
  );
}
