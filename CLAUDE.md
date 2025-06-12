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

## 🔧 型安全性ベストプラクティス

### 型エラー対策の戦略的アプローチ

新しいライブラリ導入時や型エラーが発生した場合の対処法：

#### 1. 事前調査フェーズ
```bash
# 型構造調査用スクリプト実行
npm run type:explore        # Mastra型構造調査
node scripts/convex-type-analysis.cjs  # Convex型構造調査
npm run type:check:mastra   # Mastraプロジェクト型チェック
npm run check:all           # 全体型チェック
```

#### 2. Mastra型パターン

**✅ 正しいMastraツール実装パターン:**
```typescript
import { createTool } from '@mastra/core'
import { z } from 'zod'

export const correctTool = createTool({
  id: 'my-tool',
  description: 'Tool description',
  inputSchema: z.object({
    text: z.string(),
    options: z.object({}).optional(),
  }),
  outputSchema: z.object({
    result: z.string(),
  }),
  execute: async (context) => {
    // ✅ 正しい方法: context.context でinputアクセス
    const { text, options } = context.context;
    return { result: `Processed: ${text}` };
  },
});
```

**❌ 間違ったパターン (TypeScriptエラーになる):**
```typescript
execute: async ({ input }) => {
  // ❌ Property 'input' does not exist on ToolExecutionContext
  const { text } = input;
  return { result: text };
}
```

**🛡️ 型安全なMastraエージェント設定:**
```typescript
import { Agent } from '@mastra/core'
import { openai } from '@ai-sdk/openai'  // 必須依存関係

export const aiAgent = new Agent({
  name: 'ai-assistant',  // ✅ nameプロパティ使用
  description: 'AI assistant description',
  instructions: 'Agent instructions here',
  model: openai('gpt-4o'),  // ✅ AI SDK直接使用
});
```

#### 3. Convex型パターン

**✅ 正しいConvex実装パターン:**
```typescript
import { v } from 'convex/values'
import { mutation, query, action } from './_generated/server'

// Mutation例
export const createDocument = mutation({
  args: {
    title: v.string(),
    content: v.string(),
    userId: v.id('users'),
    metadata: v.optional(v.object({
      tags: v.array(v.string()),
      priority: v.union(v.literal('high'), v.literal('medium'), v.literal('low'))
    }))
  },
  handler: async (ctx, args) => {
    // ✅ 型安全なargs使用 - 分割代入推奨
    const { title, content, userId, metadata } = args;
    
    // ✅ データベース操作
    const documentId = await ctx.db.insert('documents', {
      title,
      content,
      userId,
      metadata,
      createdAt: Date.now(),
    });
    
    return documentId;
  },
});

// Query例
export const getDocument = query({
  args: { id: v.id('documents') },
  handler: async (ctx, args) => {
    // ✅ 型安全なクエリ + nullチェック必須
    const document = await ctx.db.get(args.id);
    if (!document) {
      throw new Error('Document not found');
    }
    return document;
  },
});

// Action例 (外部API呼び出し用)
export const processWithAI = action({
  args: {
    documentId: v.id('documents'),
    taskType: v.union(
      v.literal('translate'),
      v.literal('summarize'),
      v.literal('improve')
    ),
    parameters: v.optional(v.any())
  },
  handler: async (ctx, args) => {
    // ✅ 外部API呼び出し可能
    const result = await callExternalAI(args.taskType, args.parameters);
    
    // ✅ 他のConvex関数呼び出し
    await ctx.runMutation(api.documents.updateDocument, {
      id: args.documentId,
      content: result
    });
    
    return result;
  },
});
```

#### 4. 統合パターン（Convex + Mastra）

**✅ 推奨統合パターン:**
```typescript
// Convex Action内でMastraツールを呼び出し
export const processDocumentWithAI = action({
  args: {
    documentId: v.id('documents'),
    operation: v.union(
      v.literal('translate'),
      v.literal('summarize'),
      v.literal('improve')
    )
  },
  handler: async (ctx, args) => {
    // 1. Convexからデータ取得
    const document = await ctx.runQuery(api.documents.get, { 
      id: args.documentId 
    });
    
    // 2. Mastraツール実行
    const result = await executeToolSafely({
      operation: args.operation,
      text: document.content
    });
    
    // 3. 結果をConvexに保存
    await ctx.runMutation(api.documents.update, {
      id: args.documentId,
      content: result
    });
    
    return { success: true, result };
  },
});
```

#### 5. ファイル命名規則

**Convex命名制約:**
- ✅ `camelCase.ts` (例: `aiProviders.ts`)
- ❌ `kebab-case.ts` (例: `ai-providers.ts`) - Convexエラーになる

**Mastra命名規則:**
- ✅ `kebab-case` または `camelCase` 両方OK
- ✅ ES Module対応 (`"type": "module"` in package.json)

#### 6. トラブルシューティング手順

1. **🔍 型エラー発生時:**
   ```bash
   # 1. 型構造を確認
   console.log('Context keys:', Object.keys(context))
   
   # 2. 型定義ファイルを直接確認
   find node_modules/@mastra -name "*.d.ts" | head -5
   
   # 3. 最小限のテストケースで検証
   ```

2. **🧪 新しいツール作成時:**
   ```typescript
   // 既存の動作確認済みツールをコピーして修正
   // context.context パターンを必ず使用
   // 型ガードを実装して安全性確保
   ```

3. **📚 ドキュメント不足時:**
   - 実際の型定義ファイル (`node_modules/@mastra/core/dist/index.d.ts`) を確認
   - 既存の動作するコードをテンプレートとして使用
   - CLAUDE.mdに学んだパターンを追記

4. **🔄 継続的改善:**
   ```bash
   # CI/CDパイプラインで型チェック必須化
   npm run check:all  # 型チェック + lint + build
   ```

### 型安全性確保のツール

```bash
# 定期的に実行すべきコマンド
npm run typecheck              # TypeScript型チェック
npm run type:check:mastra      # Mastraプロジェクト専用型チェック
npm run lint                   # ESLintコード品質チェック
npm run build                  # ビルド時型検証
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
    - [x] Convex Actionsでの安全なAPI呼び出し（ai.ts統合）
    - [x] エラーハンドリングとリトライ機能
    - [x] ローディング状態とUIフィードバック
  - [x] AIコマンドの実際処理
    - [x] 翻訳、要約、拡張、改善、コード生成、修正
    - [x] コンテキスト認識処理
    - [x] 日本語ローカライゼーション
  - [x] **インラインAIコマンドの完全実装 (Issue #7完了)**
    - [x] 強化されたコンテキスト認識（文書種別、言語、専門分野判定）
    - [x] ストリーミング風プログレス表示
    - [x] 結果受け入れ/拒否機能とプレビュー
    - [x] Y.js競合回避のトランザクション処理
    - [x] 全6種類のAIコマンド完全動作（/translate, /summarize, /expand, /improve, /code, /fix）
  - [ ] Mastraエージェント統合（オプション）
- [x] **開発品質向上**
  - [x] TypeScript & ESLintエラー完全修正
  - [x] Makefile導入（開発効率向上）
  - [x] GitHub Actions CI/CD設定
  - [x] PRテンプレート & Issueテンプレート
  - [x] 自動ラベル付け設定
  - [x] package.jsonスクリプト最適化
  - [x] プロジェクト構成の最適化（tsconfig.json分離、.gitignore整理）
  - [x] CI/CDパイプライン完全安定化
- [ ] Phase 3: 高度な機能
  - [ ] コンテンツ自動変換
  - [ ] コード実行環境
  - [ ] Cloudflareエッジ最適化

### 現在の進行状況
**Current Phase**: **Phase 2 完全完了！** - Issue #7インラインAIコマンド実装完了 🎉  
**Last Updated**: 2025/06/12  
**Notes**: 
- **🎯 Issue #7完了！** インラインAIコマンドの完全実装達成
- **✨ 魔法的なユーザー体験:** コンテキスト認識、ストリーミング表示、結果プレビュー機能
- **🔧 技術的完成度:** 型安全性、エラーハンドリング、Y.js競合回避まで完璧実装
- **🚀 準備完了:** Phase 3の高度な機能開発への土台完成
- **CI/CD完全安定化:** 全ての型エラー解消、ビルドパイプライン修正

### 次のタスク（Phase 3: 高度な機能）
1. コンテンツ自動変換（テキスト→Mermaid図、マインドマップ、スライド）
2. コード実行環境（サンドボックス内JavaScript実行）
3. Cloudflareエッジ最適化（AI処理の高速化）
4. ユーザー認証システムの実装
5. パフォーマンス最適化とスケーラビリティ向上