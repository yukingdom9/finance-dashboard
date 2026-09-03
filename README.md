# お金の流れ

マネーフォワード ME からエクスポートした「収入・支出詳細」CSVを読み込み、家計を分析するブラウザ完結型アプリです。
サーバー・アカウントを持たず、データはブラウザ内（IndexedDB → localStorage → メモリの順にフォールバック）にのみ保存されます。外部への通信は一切行いません。

設計資料は [design/](design/) を参照してください。`data-spec.md` が計算ロジックの、`ui-spec.md` が画面仕様の唯一の正です。

## セットアップ

```bash
npm install
```

## 開発

```bash
npm run dev
```

Viteの開発サーバーが起動します（`http://localhost:5173/` 程度）。ホットリロードで確認できます。

## テスト

```bash
npm test          # 一回実行
npm run test:watch # ウォッチモード
```

`design/fixtures/anonymized-real-data.csv` を使った回帰テスト（実データの集計値と一致するかの検証）を含みます。

## 型チェック

```bash
npm run typecheck
```

## 本番ビルド

```bash
npm run build
```

`dist/index.html` に単一HTMLファイルとして出力されます。JS・CSSはすべてインライン化されているため、**このファイルをダブルクリックするだけで`file://`から動作します**（ローカルサーバー不要）。ローカルサーバーで確認したい場合は `npm run preview` も使えます。

## ディレクトリ構成

`architecture.md` §4 のとおりです。

```
src/
  data/       CSV解析・重複排除・永続化（データ層）
  analysis/   data-spec.md の全計算ロジック（分析層・純粋関数のみ）
  charts/     自前SVGグラフ
  components/ 画面をまたいで再利用する部品
  views/      画面（1画面=1ファイル）
  modals/     モーダル
  state/      DatasetContext（データ）／ViewContext（画面状態）
  sample/     初回表示用の架空サンプルデータ生成
  format/     数値・日付の表示整形
test/
  data/       データ層のテスト
  analysis/   分析層のテスト（境界値・回帰テストを含む）
  fixtures/   テスト用ヘルパー
```

## 既知の制約・今後の課題

- ドラッグ&ドロップでの実CSV取り込みは自動テスト（`csvToRows`/`mergeRows`単体）でカバーしており、ブラウザでの手動確認を推奨します。
- キーボードのみでの全操作確認は未実施です。フォーカスリング・Treemapの`tabindex`/`role="button"`は実装済みです。
