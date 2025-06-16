# CLAUDE.md

このファイルは、このリポジトリでコードを扱う際のClaude Code (claude.ai/code) へのガイダンスを提供します。

## プロジェクト概要

最新技術スタック（Next.js App Router、Convex、Mastra、Cloudflare Workers）を活用したAI駆動型リアルタイムコラボレーションワークスペース。技術探求とワクワクする体験の創造が目的。

## 技術スタック

### コア技術
- **Next.js** (App Router) - フロントエンドフレームワーク
- **Convex** - リアクティブデータベース（リアルタイム同期）
- **Mastra** - TypeScript AI エージェントフレームワーク
- **Cloudflare Workers** - エッジ AI 処理

### 開発環境
- Node.js 20.0+
- TypeScript
- Tailwind CSS

## 技術スタックの特徴

### TypeScript統一による開発体験
フロントエンドからバックエンド、AI処理まで一つの言語で統一。エンドツーエンドの型安全性により実行時エラーを大幅削減。

### リアルタイム処理のシナジー
- ConvexのリアクティブクエリとNext.jsの自動最適化
- MastraのワークフローとConvexの状態管理が連携
- AI処理の進行状況もリアルタイム追跡可能

### エッジコンピューティング統合
- Cloudflare Workersの世界200+都市分散
- MastraエージェントをエッジでLightweight実行
- 地理的位置に関係なく一貫した低レイテンシ体験

## 開発コマンド

### 🚀 Makefile を使用した効率的な開発

プロジェクトには開発効率を向上させるMakefileが用意されています：

```bash
# ヘルプ表示
make help

# 初期セットアップ
make setup           # 依存関係のインストール + 環境チェック

# 開発
make dev            # Next.js開発サーバー起動
make convex-dev     # Convex開発サーバー起動 (別ターミナル)

# コード品質チェック
make lint           # ESLintチェック
make typecheck      # TypeScriptの型チェック
make ci-check       # CI環境での全チェック実行

# ビルド & デプロイ
make build          # プロダクションビルド
make clean          # ビルドファイルのクリア
```

### 📦 npm スクリプト

```bash
# 開発環境起動
npm run dev          # Next.js (Turbopack有効)
npm run convex       # Convex開発サーバー

# コード品質
npm run lint         # ESLintチェック
npm run lint:fix     # ESLint自動修正
npm run typecheck    # TypeScript型チェック
npm run ci           # 統合チェック (typecheck + lint + build)

# デプロイ
npm run build        # プロダクションビルド
npm run convex:deploy # Convex本番デプロイ
```

### 🔄 CI/CD パイプライン

GitHub ActionsによるPR時の自動CI：
- TypeScript型チェック
- ESLintコード品質チェック  
- プロダクションビルドテスト
- 依存関係脆弱性チェック
- マルチNode.jsバージョン対応検証

## アーキテクチャ設計

### ディレクトリ構造

**プロジェクト構成 (2025/06/12更新):**
```
ai-driven-work-space/
├── app/                    # Next.js App Router
│   ├── workspace/         # メインワークスペース
│   ├── api/              # API routes
│   └── components/       # UI components
├── convex/               # Convexスキーマ・関数
│   ├── schema.ts         # データベーススキーマ
│   ├── documents.ts      # ドキュメント操作
│   └── collaboration.ts  # リアルタイムコラボレーション
├── mastra-agents/        # Mastraエージェント（一時的にプレースホルダー）
│   ├── agents/          # AIエージェント定義
│   ├── tools/           # カスタムAIツール（型定義のみ）
│   └── tsconfig.json    # 独立したTypeScript設定
├── workers/              # Cloudflare Workers（独立プロジェクト）
│   └── ai-processor/     # エッジAI処理
│       ├── src/         # Workerソースコード
│       └── tsconfig.json # Worker専用TypeScript設定
├── .env.local           # 環境変数設定
└── package.json         # 依存関係とスクリプト
```

### データモデル（Convex）

**documents**: タイトル、コンテンツ、作成者、コラボレーターを持つドキュメント
**operations**: Operational Transform用のテキスト操作（insert/delete/retain）
**presence**: リアルタイム協調編集用のユーザーカーソル位置と選択範囲

### AI統合パターン

- **インラインコマンド**: `/translate`, `/summarize`, `/expand` などのスラッシュコマンド
- **コンテキスト認識処理**: AIエージェントがドキュメント全体の文脈を分析
- **コンテンツ変換**: テキストをMermaid図、マインドマップ、スライドに変換
- **コード実行**: サンドボックス内JavaScript実行とAIエラー解析

## 必要な環境変数

```env
# Convex
CONVEX_DEPLOYMENT=
NEXT_PUBLIC_CONVEX_URL=

# AI Provider
OPENAI_API_KEY=
ANTHROPIC_API_KEY=

# Cloudflare
CLOUDFLARE_API_TOKEN=
CLOUDFLARE_ACCOUNT_ID=
```

## 実装フェーズ

### Phase 1（Week 1-2）: 基礎の魔法
- リアルタイム同期エディタ（Operational Transform）
- プレゼンス表示
- AIアシスタント基盤

### Phase 2（Week 3-4）: AIとの対話
- Mastraエージェント統合
- インラインAIコマンド
- コンテキスト認識AI

### Phase 3（Week 5-6）: 創造的な機能
- コンテンツ自動変換
- コード実行環境
- Cloudflareエッジ最適化

## 重要な技術的考慮事項

- **リアルタイム同期**: Operational Transform (OT) または CRDT の実装が重要
- **AI応答速度**: Cloudflare Workersでのエッジ処理でレスポンス時間短縮
- **型安全性**: TypeScriptの型定義を活用したエンドツーエンドの型安全性
- **エラーハンドリング**: AIの応答エラーやネットワーク切断時の適切な処理

## 🔧 型安全性について

プロジェクトではエンドツーエンドの型安全性を重視しています。

**型安全性詳細ガイド**: `docs/TYPE_SAFETY.md`

### 重要なポイント

- **Mastra**: `context.context` パターンでinputアクセス
- **Convex**: Union型とRecord型で型エラー回避
- **TipTap**: undefinedチェックで安全な操作

### 型チェックコマンド

```bash
npm run typecheck              # TypeScript型チェック
npm run lint                   # ESLintコード品質チェック
npm run build                  # ビルド時型検証
npm run check:all              # 全体チェック
```

## 開発の焦点

「魔法的な」コラボレーション体験の創造：
1. 複数ユーザーによるリアルタイム同時編集
2. インラインAIコマンドによるテキスト改善・翻訳・要約
3. コンテンツの視覚的フォーマット変換
4. AIを活用したコード実行とエラー解析・修正提案

## この組み合わせでしか実現できない体験

- **AI が賢くなるほどアプリも賢くなる**: Mastraエージェントの学習データ蓄積とConvexのリアルタイム反映
- **地球規模でのリアルタイムAIコラボレーション**: 東京とニューヨークのユーザーが同時編集、AIも地域最適化
- **開発体験と本番体験の完全一致**: ローカル開発環境が本番環境と同じアーキテクチャ

## 📚 ドキュメント構成

プロジェクトドキュメントは以下のように分離されています：

- **CLAUDE.md** (このファイル): プロジェクト概要、技術スタック、開発コマンド、アーキテクチャ
- **docs/PROGRESS.md**: 詳細な進捗記録とマイルストーン
- **docs/DEVELOPMENT.md**: 次セッション用の実装ガイドと技術詳細
- **docs/TYPE_SAFETY.md**: 型安全性ベストプラクティスとトラブルシューティング

## 📊 現在の状況（簡潔版）

**現在の進行状況**: Phase 2完全完了 → Issue #8実装中  
**作業ブランチ**: `feature/mastra-development-environment`  
**次のタスク**: Mastra開発環境の整備とテスト基盤構築

**前セッション完了**:
- ✅ Issue #7: インラインAIコマンド完全実装 (6種類すべて)
- ✅ コンテキスト認識、ストリーミングUI、結果プレビュー機能
- ✅ 型安全性、CI/CD完全安定化

**詳細情報**:
- 進捗詳細: `docs/PROGRESS.md`
- 実装ガイド: `docs/DEVELOPMENT.md`