# ソファマスター - Sofa Recommendation & Composition Web App

ユーザーの好み・予算・ライフスタイルをヒアリングし、最適なソファを提案。さらに部屋写真にソファを合成して「実際に置いた時のイメージ」を提供するWebアプリ。

2ステップフロー:

```
[Step 1: ヒアリング + 部屋画像選択] → [Step 2: おすすめ提案 + 合成]
```

## 現状の進捗（2026-02-03時点）

- **実装済み**: Step 1（ヒアリングUI + API連携）
- **実装済み**: Step 2（提案UIのカード一覧・詳細モーダル・カラー切替）
- **未対応**: Step1で部屋画像選択、Step2モーダル内合成

## セットアップ

### 1. 依存パッケージのインストール

```bash
cd server
npm install
```

### 2. 環境変数の設定

`server/.env` に Google Gemini API キーを設定:

```
GEMINI_API_KEY=your_api_key_here
```

### 3. サーバー起動

```bash
cd server
node server.js
```

ブラウザで `http://localhost:3000` にアクセス。

## 使い方（完成形の想定）

1. **Step 1**: ヒアリング + 部屋画像選択（テンプレ or アップロード）
2. **Step 2**: おすすめ提案（カード表示・詳細・カラー切替）
3. **Step 2 詳細モーダル内**で合成（選択ソファ + 部屋画像）

## 使い方（現状の実装範囲）

1. Step1の質問に回答
2. Step2でおすすめ一覧を確認（詳細モーダル確認まで）

## 技術スタック

- **Frontend**: HTML / CSS / JavaScript（フレームワーク不使用）
- **Backend**: Node.js + Express v5
- **AI画像合成**: Google Gemini (`gemini-2.5-flash-image`)
- **アップロード処理**: Multer
- **データ**: JSONファイル（`data/sofas.json`, `data/questions.json`）

## ディレクトリ構成（現在）

```
CC0203/
├── data/
│   ├── sofas.json
│   └── questions.json
├── images/
│   ├── rooms/             # プリセット部屋画像
│   │   └── uploads/       # アップロード画像（一時保存、合成後自動削除）
│   └── sofas/             # プリセットソファ画像
├── src/
│   ├── index.html
│   ├── css/style.css
│   └── js/
│       ├── app.js
│       ├── hearing.js
│       └── recommend.js
└── server/
    ├── server.js
    ├── package.json
    └── .env
```

## API（現状）

- `POST /api/compose` 画像合成（Gemini）
- `POST /api/upload-room` 部屋画像アップロード
- `GET /api/uploaded-rooms` アップロード済み部屋画像一覧

## API（追加予定）

- `GET /api/hearing/questions` ヒアリング質問定義
- `POST /api/recommend` おすすめソファ返却
- `GET /api/sofas` 全ソファ一覧
- `GET /api/sofas/:id` ソファ詳細取得

## 機能一覧（実装済み）

- 部屋画像の選択UI（ギャラリー表示）
- ソファ画像の選択UI（ギャラリー表示）
- 部屋画像のアップロード（JPEG/PNG/WebP、10MB上限）
- Gemini AI による自然な画像合成（パース・ライティング・影を自動調整）
- 合成画像のCanvas表示・PNGダウンロード
- アップロード画像は合成で一度使用後に自動削除
- レスポンシブデザイン対応
- ローディング表示・エラーハンドリング

## 次の実装予定（要優先度決定）

- Step1で部屋画像選択（テンプレ + アップロード）
- Step2の詳細モーダル内で合成フロー追加
- エラーハンドリング強化
