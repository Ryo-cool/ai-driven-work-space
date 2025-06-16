import { Mastra } from '@mastra/core'
import { Agent } from '@mastra/core'
import { aiAssistant } from './agents/ai-assistant'
import {
  translateTool,
  summarizeTool,
  generateMermaidTool,
  generateSlidesTool,
} from './tools/text-processing'

// Mastraコンフィグレーション
export const mastra = new Mastra({
  // ログレベル設定
  logLevel: process.env.NODE_ENV === 'production' ? 'INFO' : 'DEBUG',
})

// ワークフロー定義のエクスポート
export { default as textProcessingWorkflow } from './workflows/text-processing'

// エージェントの作成（Mastraに依存しない実装）
export const agents = {
  'ai-assistant': {
    name: 'ai-assistant',
    description: aiAssistant.description,
    instructions: aiAssistant.instructions,
    run: async (input: any) => {
      // 簡易的な実装（実際はMastraのエージェント機能を使用）
      return {
        output: 'Mocked output',
        usage: { totalTokens: 100 },
        metadata: {},
      }
    }
  }
}

// ヘルパー関数
export const getAgent = (name: string) => {
  const agent = agents[name as keyof typeof agents]
  if (!agent) {
    throw new Error(`Agent ${name} not found`)
  }
  return agent
}

// エラーハンドリング設定
export const handleAIError = (error: unknown) => {
  if (error instanceof Error) {
    console.error('AI Processing Error:', error.message)
    if (error.message.includes('rate limit')) {
      return { error: 'API rate limit exceeded. Please try again later.' }
    }
    if (error.message.includes('network')) {
      return { error: 'Network error. Please check your connection.' }
    }
    return { error: 'An error occurred while processing your request.' }
  }
  return { error: 'An unexpected error occurred.' }
}