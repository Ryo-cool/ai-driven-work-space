// AI処理の設定値を集約管理
export const AI_CONFIG = {
  // レート制限設定
  RATE_LIMIT_HOURLY: parseInt(process.env.AI_RATE_LIMIT_HOURLY || '100'),
  RATE_LIMIT_WINDOW_MS: 60 * 60 * 1000, // 1時間
  
  // 同時実行制御
  MAX_CONCURRENT_TASKS_PER_USER: parseInt(process.env.MAX_CONCURRENT_TASKS || '3'),
  
  // リトライ設定
  MAX_RETRY_ATTEMPTS: parseInt(process.env.AI_RETRY_ATTEMPTS || '3'),
  RETRY_DELAY_MS: parseInt(process.env.AI_RETRY_DELAY_MS || '1000'),
  
  // API設定
  OPENAI_MODEL: process.env.OPENAI_MODEL || 'gpt-4o',
  ANTHROPIC_MODEL: process.env.ANTHROPIC_MODEL || 'claude-3-5-sonnet-20241022',
  DEFAULT_MAX_TOKENS: parseInt(process.env.AI_DEFAULT_MAX_TOKENS || '2000'),
  DEFAULT_TEMPERATURE: parseFloat(process.env.AI_DEFAULT_TEMPERATURE || '0.7'),
  
  // タイムアウト設定
  API_TIMEOUT_MS: parseInt(process.env.AI_API_TIMEOUT_MS || '30000'), // 30秒
} as const

// AI処理の統一レスポンス型
export interface AIResponse {
  success: boolean
  content?: string
  error?: string
  usage?: {
    prompt_tokens?: number
    completion_tokens?: number
    total_tokens?: number
  }
}

// AI処理の統一プロンプト生成
export interface AIPrompt {
  user: string
  system?: string
  maxTokens?: number
  temperature?: number
}

export const createAIPrompt = (
  userPrompt: string,
  systemPrompt?: string,
  options?: {
    maxTokens?: number
    temperature?: number
  }
): AIPrompt => ({
  user: userPrompt,
  system: systemPrompt,
  maxTokens: options?.maxTokens || AI_CONFIG.DEFAULT_MAX_TOKENS,
  temperature: options?.temperature || AI_CONFIG.DEFAULT_TEMPERATURE,
})