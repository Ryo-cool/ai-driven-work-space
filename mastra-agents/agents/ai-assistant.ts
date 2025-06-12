import { Agent } from '@mastra/core'
import { z } from 'zod'

// AIアシスタントエージェントの定義
export const aiAssistant = new Agent({
  id: 'ai-assistant',
  name: 'AI Writing Assistant',
  description: 'A sophisticated AI assistant for text processing and enhancement',
  
  // エージェントの性格と能力を定義
  instructions: `
    You are an advanced AI writing assistant specialized in:
    - Text translation and localization
    - Content summarization and expansion
    - Writing improvement and style enhancement
    - Code generation and explanation
    - Error detection and correction
    
    You provide high-quality, context-aware responses while maintaining
    the original intent and tone of the content.
  `,
  
  // デフォルトモデル設定
  model: {
    provider: 'OPEN_AI',
    name: 'gpt-4o',
    toolChoice: 'auto',
  },
  
  // エラーハンドリングとリトライ設定
  maxRetries: 3,
  retryDelay: 1000,
  
  // カスタム設定
  metadata: {
    version: '1.0.0',
    capabilities: [
      'translate',
      'summarize',
      'expand',
      'improve',
      'code',
      'fix',
      'transform_mindmap',
      'transform_slides'
    ],
  },
})

// テキスト処理用のスキーマ定義
export const textProcessingSchema = z.object({
  text: z.string().min(1, 'Text is required'),
  type: z.enum([
    'translate',
    'summarize',
    'expand',
    'improve',
    'code',
    'fix',
    'transform_mindmap',
    'transform_slides',
    'code_explain',
    'code_fix'
  ]),
  context: z.string().optional(),
  parameters: z.record(z.any()).optional(),
  language: z.string().optional().default('ja'),
  maxLength: z.number().optional(),
})

export type TextProcessingInput = z.infer<typeof textProcessingSchema>