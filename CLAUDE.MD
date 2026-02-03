# ソファーマスター - Sofa Composition Web App

## プロジェクト概要

部屋の画像とソファの画像を選択し、Google Gemini AI で自然に合成した画像を生成するWebアプリケーション。

## 技術スタック

### Frontend
- HTML / CSS / JavaScript（フレームワーク不使用）
- Canvas API（生成画像の表示・ダウンロード）

### Backend
- Node.js + Express v5
- Multer（画像アップロード処理）
- dotenv（環境変数管理）

### AI画像合成
- Google Generative AI (`@google/genai`)
- モデル: `gemini-2.5-flash-image`（マルチモーダル画像生成）

## ファイル構成

```
CC0203/
├── CLAUDE.md              # プロジェクト設計・進捗ドキュメント
├── README.md              # セットアップ・使い方ガイド
├── images/
│   ├── rooms/             # プリセット部屋画像（3枚）
│   │   └── uploads/       # ユーザーアップロード画像（一時保存、合成後自動削除）
│   └── sofas/             # プリセットソファ画像（3枚）
├── src/
│   ├── index.html         # メインHTML
│   ├── css/
│   │   └── style.css      # スタイルシート（レスポンシブ対応）
│   ├── js/
│   │   └── app.js         # アプリケーションロジック
│   └── components/        # 未使用（将来拡張用）
└── server/
    ├── server.js           # Express サーバー + Gemini API 連携
    ├── package.json        # 依存パッケージ定義
    └── .env                # GEMINI_API_KEY（Git管理外にすること）
```

## API エンドポイント

| メソッド | パス | 説明 |
|---------|------|------|
| GET | `/` | index.html を返す |
| POST | `/api/compose` | 部屋画像とソファ画像を Gemini で合成 |
| POST | `/api/upload-room` | 部屋画像をアップロード（10MB上限、JPEG/PNG/WebP） |
| GET | `/api/uploaded-rooms` | アップロード済み部屋画像一覧 |

## ユーザーフロー

1. Step 1: 部屋画像を選択（プリセット3枚 or アップロード）
2. Step 2: ソファ画像を選択（プリセット3枚）
3. 「合成する」ボタンで Gemini API にリクエスト
4. Canvas に生成画像を表示
5. 「ダウンロード」でPNG保存

## 画像アップロード仕様

- アップロードされた部屋画像は `images/rooms/uploads/` に一時保存
- 合成で一度使用した後、サーバー側で自動削除される
- ページリロード時に過去のアップロード画像は復元されない

## 開発フェーズと進捗

### Phase 1: 基本UI -- 完了
- [x] 部屋画像ギャラリー選択UI
- [x] ソファ画像ギャラリー選択UI
- [x] 画像選択のハイライト表示

### Phase 2: 画像合成機能 -- 完了
- [x] Gemini API による AI 画像合成
- [x] Canvas での生成画像表示
- [x] 合成画像のダウンロード機能
- [x] ローディングオーバーレイ

### Phase 3: 合成品質向上 -- AI委任で完了
- [x] パース・ライティング・影の調整（Gemini AI が自動処理）

### Phase 4: UX改善 -- 完了
- [x] レスポンシブデザイン
- [x] ローディング状態の表示
- [x] エラーハンドリング（アラート表示）
- [x] ダウンロード機能
- [x] 部屋画像のアップロード機能
- [x] アップロード画像の一度きり利用（自動削除）
- [x] リセット機能

## 今後の改善候補

- [ ] ドラッグ&ドロップによるアップロードUI
- [ ] ソファの手動位置・サイズ調整
- [ ] 複数ソファの配置対応
- [ ] ソファ画像のアップロード対応
- [ ] 合成履歴の保存

## サーバー起動方法

```bash
cd server
npm install
# .env に GEMINI_API_KEY を設定
node server.js
# → http://localhost:3000
```
