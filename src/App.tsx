import { DatasetProvider, useDataset } from './state/DatasetContext';
import { ViewProvider, useView } from './state/ViewContext';
import { Sidebar } from './components/Sidebar';
import { Home } from './views/Home';
import { Spending } from './views/Spending';
import { Categories } from './views/Categories';
import { Trends } from './views/Trends';
import { FixedCosts } from './views/FixedCosts';
import { Anomalies } from './views/Anomalies';
import { Merchants } from './views/Merchants';
import { MerchantDetail } from './views/MerchantDetail';
import { Transactions } from './views/Transactions';
import { Import } from './views/Import';
import { TransactionModal } from './modals/TransactionModal';
import { DataQualityModal } from './modals/DataQualityModal';
import { MergeMerchantsModal } from './modals/MergeMerchantsModal';
import { EmptyState } from './components/EmptyState';
import { PageHead } from './components/PageHead';

function ModalHost() {
  const { state, closeModal } = useView();
  if (!state.modal) return null;
  if (state.modal.type === 'transaction') return <TransactionModal id={state.modal.id} onClose={closeModal} />;
  if (state.modal.type === 'dataQuality') return <DataQualityModal onClose={closeModal} />;
  if (state.modal.type === 'mergeMerchants') return <MergeMerchantsModal keys={state.modal.keys} onClose={closeModal} />;
  return null;
}

function MainArea() {
  const { state: ds } = useDataset();
  const { state: vs, goToView } = useView();

  if (!ds.ready) return null;

  if (!ds.index.all.length && vs.view !== 'import') {
    return (
      <div className="page">
        <PageHead title="データがありません" sub="CSVを読み込むと、ここに分析結果が出ます" />
        <div className="wrap">
          <div className="panel">
            <EmptyState
              title="まだ取引が1件もありません"
              desc="「データを読み込む」から、マネーフォワードのCSVを入れてください。"
              action={
                <button className="backbtn" onClick={() => goToView('import')}>
                  データを読み込む
                </button>
              }
            />
          </div>
        </div>
      </div>
    );
  }

  switch (vs.view) {
    case 'dashboard':
      return <Home />;
    case 'spending':
      return <Spending />;
    case 'categories':
      return <Categories />;
    case 'trends':
      return <Trends />;
    case 'fixed':
      return <FixedCosts />;
    case 'anomaly':
      return <Anomalies />;
    case 'merchants':
      return <Merchants />;
    case 'merchantDetail':
      return <MerchantDetail />;
    case 'transactions':
      return <Transactions />;
    case 'import':
      return <Import />;
    default:
      return null;
  }
}

function Shell() {
  return (
    <div className="app">
      <Sidebar />
      <main className="main">
        <MainArea />
      </main>
      <ModalHost />
    </div>
  );
}

export default function App() {
  return (
    <DatasetProvider>
      <ViewProvider>
        <Shell />
      </ViewProvider>
    </DatasetProvider>
  );
}
