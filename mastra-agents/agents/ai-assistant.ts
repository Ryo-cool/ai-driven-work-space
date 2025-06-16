import { z } from 'zod'
import { Agent } from '@mastra/core'

// AIアシスタントエージェントの定義
export const aiAssistant = {
  name: 'ai-assistant',
  description: 'A sophisticated AI assistant for text processing and enhancement',
  
  instructions: `
    You are an advanced AI writing assistant specialized in:
    - Text translation and localization with cultural awareness
    - Content summarization and expansion with context preservation
    - Writing improvement and style enhancement
    - Code generation, explanation, and debugging
    - Error detection and intelligent correction
    - Content transformation (mindmaps, slides, diagrams)
    
    Guidelines:
    1. Provide high-quality, context-aware responses
    2. Maintain the original intent and tone of the content
    3. Consider the target audience and use case
    4. When translating, preserve cultural nuances
    5. For code generation, follow best practices and include comments
    6. For summaries, capture key points without losing critical information
    7. For improvements, enhance clarity while maintaining voice
    
    Always analyze the context and document type to provide the most appropriate response.
  `,
  
  // エージェントの能力と制限
  capabilities: {
    languages: ['ja', 'en', 'es', 'fr', 'de', 'zh', 'ko'],
    maxTokens: 4096,
    supportedFormats: ['text', 'markdown', 'code', 'mermaid'],
  },
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

// コンテキスト分析用のスキーマ
export const contextAnalysisSchema = z.object({
  text: z.string(),
  documentType: z.enum(['general', 'technical', 'academic', 'creative', 'business']).optional(),
  language: z.string().optional(),
  domain: z.string().optional(),
})

export type ContextAnalysis = z.infer<typeof contextAnalysisSchema>

// エージェントレスポンスのスキーマ
export const agentResponseSchema = z.object({
  result: z.string(),
  metadata: z.object({
    processedTokens: z.number(),
    processingTime: z.number(),
    confidence: z.number().min(0).max(1),
    suggestions: z.array(z.string()).optional(),
  }).optional(),
  error: z.string().optional(),
})

export type AgentResponse = z.infer<typeof agentResponseSchema>

// エージェント実行関数
export async function executeAgent(
  input: TextProcessingInput,
  agent: Agent
): Promise<AgentResponse> {
  try {
    const startTime = Date.now()
    
    // コンテキスト分析
    const context = await analyzeContext({
      text: input.text,
      documentType: input.parameters?.documentType,
      language: input.language,
      domain: input.parameters?.domain,
    })
    
    // エージェント実行
    const result = await agent.run({
      input: {
        ...input,
        context: {
          ...context,
          originalContext: input.context,
        },
      },
    })
    
    const processingTime = Date.now() - startTime
    
    return {
      result: result.output,
      metadata: {
        processedTokens: result.usage?.totalTokens || 0,
        processingTime,
        confidence: calculateConfidence(result),
        suggestions: generateSuggestions(input.type, result),
      },
    }
  } catch (error) {
    console.error('Agent execution error:', error)
    return {
      result: '',
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    }
  }
}

// コンテキスト分析関数
async function analyzeContext(input: ContextAnalysis): Promise<Record<string, any>> {
  // 言語検出
  const detectedLanguage = detectLanguage(input.text)
  
  // ドキュメントタイプ推定
  const documentType = input.documentType || inferDocumentType(input.text)
  
  // ドメイン特定
  const domain = input.domain || inferDomain(input.text)
  
  return {
    language: input.language || detectedLanguage,
    documentType,
    domain,
    complexity: calculateTextComplexity(input.text),
    keywords: extractKeywords(input.text),
  }
}

// ヘルパー関数
function detectLanguage(text: string): string {
  // 簡易的な言語検出（実際の実装では高度な言語検出ライブラリを使用）
  if (/[\u3040-\u309F\u30A0-\u30FF]/.test(text)) return 'ja'
  if (/[\u4E00-\u9FFF]/.test(text)) return 'zh'
  if (/[\uAC00-\uD7AF]/.test(text)) return 'ko'
  return 'en'
}

function inferDocumentType(text: string): string {
  if (/function|class|const|let|var|import|export/.test(text)) return 'technical'
  if (/research|study|analysis|hypothesis/.test(text)) return 'academic'
  if (/business|revenue|strategy|market/.test(text)) return 'business'
  return 'general'
}

function inferDomain(text: string): string {
  if (/react|vue|angular|javascript|typescript/.test(text.toLowerCase())) return 'web-development'
  if (/machine learning|ai|neural|deep learning/.test(text.toLowerCase())) return 'ai-ml'
  if (/design|ui|ux|color|layout/.test(text.toLowerCase())) return 'design'
  return 'general'
}

function calculateTextComplexity(text: string): number {
  const words = text.split(/\s+/)
  const avgWordLength = words.reduce((sum, word) => sum + word.length, 0) / words.length
  const sentenceCount = text.split(/[.!?]+/).length - 1
  const avgSentenceLength = words.length / Math.max(sentenceCount, 1)
  
  // 複雑度スコア（0-1）
  return Math.min((avgWordLength / 10 + avgSentenceLength / 50) / 2, 1)
}

function extractKeywords(text: string): string[] {
  // 簡易的なキーワード抽出（実際の実装ではNLPライブラリを使用）
  const words = text.toLowerCase().split(/\s+/)
  const wordFreq: Record<string, number> = {}
  
  words.forEach(word => {
    if (word.length > 3) {
      wordFreq[word] = (wordFreq[word] || 0) + 1
    }
  })
  
  return Object.entries(wordFreq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([word]) => word)
}

function calculateConfidence(result: any): number {
  // 結果の信頼度を計算（0-1）
  if (!result.output) return 0
  if (result.error) return 0.2
  if (result.usage?.totalTokens > 3000) return 0.7
  return 0.9
}

function generateSuggestions(type: string, result: any): string[] {
  const suggestions: string[] = []
  
  switch (type) {
    case 'translate':
      suggestions.push('Review for cultural appropriateness')
      suggestions.push('Consider adding context notes')
      break
    case 'summarize':
      suggestions.push('Verify key points are captured')
      suggestions.push('Check for any critical omissions')
      break
    case 'code':
      suggestions.push('Add error handling')
      suggestions.push('Include unit tests')
      suggestions.push('Consider edge cases')
      break
  }
  
  return suggestions
}