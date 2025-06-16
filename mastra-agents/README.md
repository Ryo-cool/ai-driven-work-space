# Mastra Agents

AI-driven work spaceプロジェクトのMastraエージェント実装。

## 概要

このモジュールは、テキスト処理、翻訳、要約、コンテンツ変換などのAI機能を提供するMastraエージェントを実装しています。

## 機能

- **AIアシスタントエージェント**: 高度なテキスト処理と改善
- **カスタムツール**: 翻訳、要約、Mermaid図生成、スライド生成
- **マルチステップワークフロー**: 複数のAI処理を組み合わせた複雑なタスク
- **Convex統合**: リアルタイムデータベースとの連携

## セットアップ

1. 環境変数の設定
```bash
cp .env.example .env
# .envファイルを編集してAPIキーを設定
```

2. 依存関係のインストール
```bash
npm install
```

3. 開発サーバーの起動
```bash
npm run dev
```

## 開発コマンド

```bash
# 開発サーバー（自動リロード付き）
npm run dev

# Mastraプレイグラウンド
npm run dev:mastra

# テスト実行
npm test
npm run test:watch    # ウォッチモード
npm run test:coverage # カバレッジ付き

# ビルド
npm run build

# 型チェック
npm run typecheck

# デバッグモード
npm run debug
```

## API エンドポイント

### ヘルスチェック
```
GET /health
```

### エージェント一覧
```
GET /api/agents
```

### ワークフロー実行
```
POST /api/workflows/text-processing
Content-Type: application/json

{
  "text": "処理したいテキスト",
  "operations": [
    { "type": "translate", "parameters": { "targetLanguage": "en" } },
    { "type": "summarize" }
  ]
}
```

### 単一処理実行
```
POST /api/process
Content-Type: application/json

{
  "type": "improve",
  "text": "改善したいテキスト",
  "parameters": {}
}
```

## ディレクトリ構造

```
mastra-agents/
├── agents/          # AIエージェント定義
├── tools/           # カスタムツール実装
├── workflows/       # ワークフロー定義
├── tests/          # テストファイル
├── src/            # サーバー実装
└── mastra.config.ts # Mastra設定
```

## テスト

```bash
# 全テスト実行
npm test

# 特定のテストファイルを実行
npm test agents/ai-assistant.test.ts

# カバレッジレポート生成
npm run test:coverage
```

## デバッグ

Node.jsのインスペクタを使用したデバッグ:

```bash
npm run debug
```

Chrome DevToolsで `chrome://inspect` を開いてデバッグ。

## 環境変数

- `OPENAI_API_KEY`: OpenAI APIキー
- `ANTHROPIC_API_KEY`: Anthropic APIキー
- `MASTRA_ENDPOINT`: Mastraサーバーエンドポイント
- `USE_MASTRA_AGENTS`: Mastraエージェント使用フラグ
- `PORT`: サーバーポート（デフォルト: 3001）
- `LOG_LEVEL`: ログレベル（debug, info, warn, error）

## トラブルシューティング

### ポート競合エラー
```bash
# ポートを変更して起動
PORT=3002 npm run dev
```

### TypeScriptエラー
```bash
# 型チェックを実行
npm run typecheck
```

### テスト失敗
```bash
# キャッシュクリア後に再実行
npm run clean
npm test
```