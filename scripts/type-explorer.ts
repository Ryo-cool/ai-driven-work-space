#!/usr/bin/env npx ts-node

/**
 * 型定義エクスプローラー
 * MastraとConvexの型構造を詳細に調査するためのツール
 */

import { createTool } from '@mastra/core'
import { Agent } from '@mastra/core'
import { z } from 'zod'

// AI SDK は mastra-agents でのみ利用可能なのでダミーを作成
const dummyModel = { provider: 'openai', name: 'gpt-4o' }

console.log('🔍 Type Explorer - MastraとConvexの型構造調査\n')

// =============================================================================
// 1. Mastra Tool Context の型構造調査
// =============================================================================

console.log('📋 1. Mastra Tool Context Structure')
console.log('='.repeat(50))

const exploreTool = createTool({
  id: 'explore-context',
  description: 'Context structure explorer',
  inputSchema: z.object({
    test: z.string(),
    optional: z.string().optional(),
  }),
  outputSchema: z.object({
    result: z.string(),
  }),
  execute: async (context) => {
    console.log('\n🔍 Context Object Keys:', Object.keys(context))
    console.log('🔍 Context Type:', typeof context)
    console.log('🔍 Context Constructor:', context.constructor.name)
    
    // 各プロパティの詳細調査
    for (const [key, value] of Object.entries(context)) {
      console.log(`🔹 ${key}:`, {
        type: typeof value,
        value: value,
        keys: typeof value === 'object' && value ? Object.keys(value) : 'N/A'
      })
    }
    
    // TypeScript型情報を実行時に確認
    console.log('\n🔍 Detailed Analysis:')
    
    // context.context の中身 (これが inputSchema の内容)
    if ('context' in context) {
      console.log('✅ context.context exists:', context.context)
    }
    
    // context.input の有無確認
    if ('input' in context) {
      console.log('✅ context.input exists:', (context as any).input)
    } else {
      console.log('❌ context.input does NOT exist')
    }
    
    return {
      result: 'Context exploration complete'
    }
  },
})

// ダミー実行でcontext構造を確認
console.log('🧪 Simulating tool execution...')
try {
  // ToolExecutionContextの型情報を取得
  const mockContext = {
    context: { test: 'sample', optional: 'value' },
    runId: 'test-run',
    threadId: 'test-thread',
    runtimeContext: {},
  }
  
  console.log('\n📊 Mock Context Structure:')
  exploreTool.execute(mockContext as any)
} catch (error) {
  console.log('⚠️ Mock execution failed:', error)
}

// =============================================================================
// 2. Mastra Agent の型構造調査  
// =============================================================================

console.log('\n\n📋 2. Mastra Agent Structure')
console.log('='.repeat(50))

try {
  const testAgent = new Agent({
    name: 'test-agent',
    description: 'Type exploration agent',
    instructions: 'Test agent for type exploration',
    model: dummyModel as any,
  })
  
  console.log('🔍 Agent Properties:', Object.keys(testAgent))
  console.log('🔍 Agent Type:', typeof testAgent)
  console.log('🔍 Agent Constructor:', testAgent.constructor.name)
  
  // Agentの詳細プロパティ確認
  for (const [key, value] of Object.entries(testAgent)) {
    console.log(`🔹 ${key}:`, {
      type: typeof value,
      isFunction: typeof value === 'function',
      keys: typeof value === 'object' && value && !Array.isArray(value) ? Object.keys(value) : 'N/A'
    })
  }
} catch (error) {
  console.log('⚠️ Agent creation failed:', error)
}

// =============================================================================
// 3. 型定義ファイルの場所特定
// =============================================================================

console.log('\n\n📋 3. Type Definition Files Location')
console.log('='.repeat(50))

import { execSync } from 'child_process'

try {
  // Mastraの型定義ファイル検索
  console.log('🔍 Searching for Mastra type definitions...')
  const mastraTypes = execSync('find node_modules/@mastra -name "*.d.ts" | head -10', { 
    encoding: 'utf8', 
    cwd: process.cwd() 
  })
  console.log('📁 Mastra Types:', mastraTypes)
  
  // パッケージ情報
  const mastraPackage = require('@mastra/core/package.json')
  console.log('📦 Mastra Version:', mastraPackage.version)
  console.log('📦 Mastra Main:', mastraPackage.main)
  console.log('📦 Mastra Types:', mastraPackage.types)
  
} catch (error) {
  console.log('⚠️ File search failed:', error)
}

// =============================================================================
// 4. 型チェック用のテンプレート生成
// =============================================================================

console.log('\n\n📋 4. Generating Type Check Templates')
console.log('='.repeat(50))

const typeCheckTemplate = `
// 型チェック用テンプレート (自動生成)
import { createTool, Agent } from '@mastra/core'
import { z } from 'zod'

// ✅ 確認済み: 正しいツール実装パターン
export const correctToolPattern = createTool({
  id: 'correct-pattern',
  inputSchema: z.object({
    text: z.string(),
    options: z.object({}).optional(),
  }),
  outputSchema: z.object({
    result: z.string(),
  }),
  execute: async (context) => {
    // ✅ 正しい方法: context.context でinputにアクセス
    const { text, options } = context.context
    return { result: \`Processed: \${text}\` }
  },
})

// ❌ エラーパターン: これは動作しない
export const incorrectToolPattern = createTool({
  id: 'incorrect-pattern',
  inputSchema: z.object({ text: z.string() }),
  outputSchema: z.object({ result: z.string() }),
  execute: async ({ input }) => {
    // ❌ エラー: Property 'input' does not exist
    const { text } = input
    return { result: text }
  },
})

// 型情報デバッグ用ヘルパー
export function debugToolContext<T>(context: T): void {
  console.log('Context keys:', Object.keys(context as any))
  console.log('Context:', context)
}
`

console.log('📝 Type Check Template:')
console.log(typeCheckTemplate)

// =============================================================================
// 5. 実用的な型ガード作成
// =============================================================================

console.log('\n\n📋 5. Type Guards and Utilities')
console.log('='.repeat(50))

const typeUtilities = `
// 型ガードとユーティリティ関数
export function isValidToolContext(context: unknown): context is { context: Record<string, any> } {
  return typeof context === 'object' && 
         context !== null && 
         'context' in context &&
         typeof (context as any).context === 'object'
}

export function safeGetToolInput<T>(context: unknown): T | null {
  if (isValidToolContext(context)) {
    return context.context as T
  }
  return null
}

// 使用例:
// const input = safeGetToolInput<{ text: string }>(context)
// if (input) {
//   console.log(input.text)
// }
`

console.log('🛡️ Type Utilities:')
console.log(typeUtilities)

console.log('\n\n✅ Type exploration complete!')
console.log('🎯 Next: Run this script with `npx ts-node scripts/type-explorer.ts`')