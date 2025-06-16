# 型安全性ベストプラクティス

新しいライブラリ導入時や型エラーが発生した場合の対処法をまとめたガイド。

## 🔧 型エラー対策の戦略的アプローチ

### 事前調査フェーズ

```bash
# 型構造調査用スクリプト実行
npm run type:explore        # Mastra型構造調査
node scripts/convex-type-analysis.cjs  # Convex型構造調査
npm run type:check:mastra   # Mastraプロジェクト型チェック
npm run check:all           # 全体型チェック
```

### Mastra型パターン

#### ✅ 正しいMastraツール実装パターン

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

#### ❌ 間違ったパターン (TypeScriptエラーになる)

```typescript
execute: async ({ input }) => {
  // ❌ Property 'input' does not exist on ToolExecutionContext
  const { text } = input;
  return { result: text };
}
```

#### 🛡️ 型安全なMastraエージェント設定

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

### Convex型パターン

#### ✅ 正しいConvex実装パターン

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

### 統合パターン（Convex + Mastra）

#### ✅ 推奨統合パターン

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

### ファイル命名規則

#### Convex命名制約
- ✅ `camelCase.ts` (例: `aiProviders.ts`)
- ❌ `kebab-case.ts` (例: `ai-providers.ts`) - Convexエラーになる

#### Mastra命名規則
- ✅ `kebab-case` または `camelCase` 両方OK
- ✅ ES Module対応 (`"type": "module"` in package.json)

## 🔧 トラブルシューティング手順

### 1. 🔍 型エラー発生時

```bash
# 1. 型構造を確認
console.log('Context keys:', Object.keys(context))

# 2. 型定義ファイルを直接確認
find node_modules/@mastra -name "*.d.ts" | head -5

# 3. 最小限のテストケースで検証
```

### 2. 🧪 新しいツール作成時

```typescript
// 既存の動作確認済みツールをコピーして修正
// context.context パターンを必ず使用
// 型ガードを実装して安全性確保
```

### 3. 📚 ドキュメント不足時

- 実際の型定義ファイル (`node_modules/@mastra/core/dist/index.d.ts`) を確認
- 既存の動作するコードをテンプレートとして使用
- CLAUDE.mdに学んだパターンを追記

### 4. 🔄 継続的改善

```bash
# CI/CDパイプラインで型チェック必須化
npm run check:all  # 型チェック + lint + build
```

## 型安全性確保のツール

定期的に実行すべきコマンド:

```bash
npm run typecheck              # TypeScript型チェック
npm run type:check:mastra      # Mastraプロジェクト専用型チェック
npm run lint                   # ESLintコード品質チェック
npm run build                  # ビルド時型検証
```

## よくある型エラーと解決策

### 1. AICommand戻り値型エラー

**問題**: `Property 'success' does not exist on type 'string'`

**解決**:
```typescript
// ❌ 間違い
action: async (text, context) => {
  const result = await processAI({ type: 'translate', selectedText: text })
  return result.content  // string型を返している
}

// ✅ 正しい
action: async (text, context) => {
  const result = await processAI({ type: 'translate', selectedText: text })
  return result  // { success: boolean; content?: string; error?: string } を返す
}
```

### 2. Convex関数の型エラー

**問題**: `Element implicitly has an 'any' type`

**解決**:
```typescript
// ❌ 間違い
function createPrompt(type: string, text: string) {
  const prompts = { translate: {...}, summarize: {...} }
  return prompts[type]  // 型エラー
}

// ✅ 正しい
function createPrompt(
  type: 'translate' | 'summarize',  // Union型で制限
  text: string
) {
  const prompts: Record<string, PromptConfig> = {  // 明示的な型定義
    translate: {...},
    summarize: {...}
  }
  return prompts[type]
}
```

### 3. TipTap エディタ型エラー

**問題**: `Argument of type 'string | undefined' is not assignable`

**解決**:
```typescript
// ❌ 間違い
editor?.chain().focus().insertContentAt({ from, to }, result.content).run()

// ✅ 正しい
editor?.chain().focus().insertContentAt({ from, to }, result.content || '').run()
```