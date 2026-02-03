# タスク一覧（ソファマスター）

企画書の「8. タスク一覧」を独立させたものです。

## 運用ルール

- 以後の作業で、**実装＋最低限の動作確認**が完了したタスクは `[x]` に更新する
- 更新単位は A1/B1 などの**タスク単位**とする

## フェーズA: データ基盤

- [x] A1 ソファDBスキーマ定義 + サンプルデータ作成 (`data/sofas.json`)
- [x] A2 ヒアリング質問データ作成 (`data/questions.json`)
- [ ] A3 スプレッドシートからのデータ移行方法検討 (`scripts/convert-spreadsheet.js`)
- [ ] A4 ソファカタログ画像の整理・配置 (`images/sofas/catalog/`)

## フェーズB: バックエンドAPI

- [x] B1 サーバー起動時にソファDB・質問データを読み込み (`server/server.js`)
- [x] B2 `GET /api/hearing/questions` 実装 (`server/server.js`)
- [x] B3 提案アルゴリズム実装（フィルタ+スコアリング） (`server/recommend.js`)
- [x] B4 `POST /api/recommend` 実装 (`server/server.js`)
- [x] B5 `GET /api/sofas`, `GET /api/sofas/:id` 実装 (`server/server.js`)

## フェーズC: フロントエンド - 基盤 & ヒアリング

- [x] C1 HTML構造を3ステップ構成に改修 + プログレスバー追加 (`src/index.html`)
- [x] C2 チャットUI・提案カード・プログレスバーのCSS追加 (`src/css/style.css`)
- [x] C3 app.jsをステップベースのナビゲーションに改修 (`src/js/app.js`)
- [x] C4 ヒアリングチャットUI実装 (`src/js/hearing.js`)

## フェーズD: フロントエンド - 提案 & 合成連携（新フロー）

- [x] D1 Step1に部屋画像選択（テンプレ + アップロード）を追加 (`src/index.html`, `src/js/hearing.js`)
- [x] D2 おすすめ提案画面の実装（カード表示・カラー切替・詳細モーダル） (`src/js/recommend.js`)
- [x] D3 モーダル内で合成（部屋画像 + ソファ） (`src/js/recommend.js`)
- [x] D4 複数角度画像の表示（詳細モーダル内スライドショー） (`src/js/recommend.js`)

## フェーズE: 統合 & 仕上げ

- [x] E1 Step3削除・2ステップ化の整理（UI/JS/文書） (`src/index.html`, `src/js/app.js`, `README.md`)
- [x] E2 エラーハンドリング（API失敗・結果0件等） (各ファイル)
- [x] E3 レスポンシブ対応の確認・調整 (`src/css/style.css`)
- [ ] E4 全体通しテスト (-)

## 推奨実装順序

```
A1 + A2 + C1（並行）
  ↓
A3 + A4 + C2（並行）
  ↓
B1 → B2 + B3（並行）→ B4 + B5
  ↓
C3 → C4
  ↓
D1 → D2 + D3
  ↓
E1 → E2 → E3 → E4
```
