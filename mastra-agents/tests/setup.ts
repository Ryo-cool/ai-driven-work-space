// Jest setup file
import { jest } from '@jest/globals'

// グローバルモック設定
global.console = {
  ...console,
  error: jest.fn(),
  warn: jest.fn(),
  log: jest.fn(),
}

// 環境変数のモック
process.env.OPENAI_API_KEY = 'test-openai-key'
process.env.ANTHROPIC_API_KEY = 'test-anthropic-key'
process.env.NODE_ENV = 'test'

// タイムアウト設定
jest.setTimeout(30000)

// AIプロバイダーのモック
jest.mock('@ai-sdk/openai', () => ({
  createOpenAI: jest.fn(() => ({
    chat: jest.fn().mockResolvedValue({
      text: 'Mocked AI response',
      usage: { totalTokens: 100 },
    }),
  })),
}))

// Mastraコアのモック
jest.mock('@mastra/core', () => ({
  Mastra: jest.fn().mockImplementation(() => ({
    agents: {},
    db: {},
    kv: {},
  })),
  Agent: jest.fn().mockImplementation((config) => ({
    name: config.name,
    run: jest.fn().mockResolvedValue({
      output: 'Mocked agent output',
      usage: { totalTokens: 50 },
    }),
  })),
  Tool: jest.fn().mockImplementation((config) => ({
    id: config.id,
    execute: config.execute || jest.fn(),
  })),
  Workflow: jest.fn().mockImplementation((config) => ({
    name: config.name,
    run: jest.fn().mockResolvedValue({
      success: true,
      data: { results: [] },
    }),
  })),
  Step: jest.fn().mockImplementation((config) => ({
    id: config.id,
    execute: config.execute || jest.fn(),
  })),
}))

// テストユーティリティ
export const mockAgentResponse = (output: string, metadata?: any) => ({
  output,
  usage: { totalTokens: 100 },
  metadata: metadata || {},
})

export const mockToolResponse = (data: any) => ({
  success: true,
  data,
})

export const mockWorkflowResponse = (results: any[]) => ({
  success: true,
  data: {
    results,
    totalProcessingTime: 1000,
    success: true,
  },
})

// テストヘルパー
export const createMockAgent = (name: string) => ({
  name,
  run: jest.fn().mockResolvedValue(mockAgentResponse('Test output')),
})

export const createMockTool = (id: string, execute?: Function) => ({
  id,
  execute: execute || jest.fn().mockResolvedValue({ success: true }),
})

export const resetAllMocks = () => {
  jest.clearAllMocks()
}