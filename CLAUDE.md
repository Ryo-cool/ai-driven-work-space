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

```bash
# プロジェクト初期化
npx create-next-app@latest ai-workspace --typescript --tailwind --app
cd ai-workspace
npx convex dev --configure
npm create mastra@latest mastra-agents

# 開発環境起動（全て同時起動で統一体験）
npm run dev          # Next.js
npx convex dev       # Convex（ホットリロード対応）
mastra dev          # Mastraプレイグラウンド
wrangler dev        # Cloudflare Workers

# デプロイ
vercel deploy                    # Next.js
npx convex deploy               # Convex
mastra deploy --platform cloudflare  # Cloudflare Workers
```

## アーキテクチャ設計

### ディレクトリ構造
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
├── mastra-agents/        # Mastraエージェント
│   ├── agents/          # AIエージェント定義
│   ├── tools/           # カスタムAIツール
│   └── workflows/       # マルチステップワークフロー
├── workers/              # Cloudflare Workers
│   └── ai-processor/     # エッジAI処理
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

## 進捗記録

> 注意: Claude Code使用時は、タスク完了後にこのセクションを更新してください

### 完了済みタスク
- [x] プロジェクト初期設定
  - [x] Next.jsプロジェクト作成
  - [x] Convex初期化
  - [x] Mastra初期化
  - [x] 必要パッケージのインストール
  - [x] 環境変数設定
- [x] UI/UX方針決定
  - [x] デザインコンセプト: Figma風 + ニューモーフィズム
  - [x] カラーパレット定義
  - [x] コンポーネント設計方針
- [x] Phase 1: 基礎実装
  - [x] Convexスキーマ設計
  - [x] 基本エディタ機能
    - [x] TipTapベースのエディタコンポーネント（Editor.tsx）
    - [x] ツールバーコンポーネント（Toolbar.tsx）
    - [x] Convex連携フック（useDocument.ts）
  - [x] AIコマンドパレット
    - [x] AIコマンド定義（ai-commands.ts）
    - [x] コマンドパレットUI（CommandPalette.tsx）
    - [x] TipTapエクステンション（AICommandExtension.ts）
  - [x] ワークスペースページ
    - [x] ホームページ（ドキュメント一覧）
    - [x] ワークスページページ（app/workspace/[id]/page.tsx）
    - [x] Convexプロバイダー設定
    - [x] テストデータ自動生成（seed.ts）
  - [x] リアルタイム同期
    - [x] Y.js + TipTap Collaboration統合
    - [x] ConvexYjsProvider実装
    - [x] リアルタイムドキュメント同期
  - [x] プレゼンス表示
    - [x] アクティブユーザー表示（Presence.tsx）
    - [x] リアルタイムカーソル位置同期
- [x] Phase 2: AI統合
  - [x] AI API連携（OpenAI/Anthropic）
    - [x] Convex Actionsでの安全なAPI呼び出し（aiActions.ts）
    - [x] エラーハンドリングとリトライ機能
    - [x] ローディング状態とUIフィードバック
  - [x] AIコマンドの実際処理
    - [x] 翻訳、要約、拡張、改善、コード生成、修正
    - [x] コンテキスト認識処理
    - [x] 日本語ローカライゼーション
  - [ ] Mastraエージェント統合（オプション）
- [ ] Phase 3: 高度な機能
  - [ ] コンテンツ自動変換
  - [ ] コード実行環境
  - [ ] Cloudflareエッジ最適化

### 現在の進行状況
**Current Phase**: Phase 2 完了 - 高度な機能拡張フェーズへ  
**Last Updated**: 2025/01/06  
**Notes**: メジャーブレークスルー！Y.jsリアルタイムコラボレーションとAI API統合を完全に実装。コア機能は全て完成し、「魔法的な」コラボレーション体験を実現

### 次のタスク（Phase 3: 高度な機能）
1. コンテンツ自動変換（テキスト→Mermaid図、マインドマップ、スライド）
2. コード実行環境（サンドボックス内JavaScript実行）
3. Cloudflareエッジ最適化（AI処理の高速化）
4. ユーザー認証システムの実装
5. パフォーマンス最適化とスケーラビリティ向上