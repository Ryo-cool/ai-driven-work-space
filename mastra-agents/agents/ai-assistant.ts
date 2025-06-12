// Mastra Agent is temporarily disabled for CI compatibility
// TODO: Re-enable when dependency issues are resolved

import { z } from 'zod'

// Placeholder for future Mastra integration
export const aiAssistant = {
  name: 'ai-assistant',
  description: 'A sophisticated AI assistant for text processing and enhancement',
  
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
}

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