/// <reference path="./types.d.ts" />
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { cache } from 'hono/cache'
import { Ai } from '@cloudflare/ai'

// 環境変数の型定義
interface Env {
  AI: any
  AI_CACHE: KVNamespace
  ENVIRONMENT: string
  MAX_REQUESTS_PER_MINUTE: string
}

// リクエストの型定義
interface AIRequest {
  type: 'translate' | 'summarize' | 'expand' | 'improve' | 'transform_mindmap' | 'transform_slides' | 'code_explain' | 'code_fix'
  text: string
  context?: string
  parameters?: Record<string, any>
  userId: string
  documentId: string
}

// レスポンスの型定義
interface AIResponse {
  success: boolean
  result?: string
  error?: string
  processingTime: number
  cached: boolean
}

// Honoアプリケーションの初期化
const app = new Hono<{ Bindings: Env }>()

// CORS設定
app.use('/*', cors({
  origin: ['http://localhost:3000', 'https://example.com'],
  allowMethods: ['POST', 'GET', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
  maxAge: 600,
}))

// キャッシュ設定（GETリクエストのみ）
app.use('/api/ai/status/*', cache({
  cacheName: 'ai-status-cache',
  cacheControl: 'max-age=60',
}))

// ヘルスチェックエンドポイント
app.get('/api/ai/health', (c) => {
  return c.json({
    status: 'healthy',
    environment: c.env.ENVIRONMENT,
    timestamp: new Date().toISOString(),
  })
})

// レート制限チェック
async function checkRateLimit(userId: string, env: Env): Promise<boolean> {
  const key = `rate_limit:${userId}`
  const current = await env.AI_CACHE.get(key)
  
  if (!current) {
    await env.AI_CACHE.put(key, '1', { expirationTtl: 60 })
    return true
  }
  
  const count = parseInt(current)
  const limit = parseInt(env.MAX_REQUESTS_PER_MINUTE)
  
  if (count >= limit) {
    return false
  }
  
  await env.AI_CACHE.put(key, (count + 1).toString(), { expirationTtl: 60 })
  return true
}

// キャッシュキー生成
function getCacheKey(request: AIRequest): string {
  return `ai_result:${request.type}:${request.text.substring(0, 100)}:${JSON.stringify(request.parameters || {})}`
}

// AI処理メインエンドポイント
app.post('/api/ai/process', async (c) => {
  const startTime = Date.now()
  
  try {
    const request = await c.req.json<AIRequest>()
    
    // レート制限チェック
    const canProceed = await checkRateLimit(request.userId, c.env)
    if (!canProceed) {
      return c.json<AIResponse>({
        success: false,
        error: 'Rate limit exceeded. Please try again later.',
        processingTime: Date.now() - startTime,
        cached: false,
      }, 429)
    }
    
    // キャッシュチェック
    const cacheKey = getCacheKey(request)
    const cachedResult = await c.env.AI_CACHE.get(cacheKey)
    
    if (cachedResult) {
      return c.json<AIResponse>({
        success: true,
        result: cachedResult,
        processingTime: Date.now() - startTime,
        cached: true,
      })
    }
    
    // AI処理
    const ai = new Ai(c.env.AI)
    let result: string
    
    switch (request.type) {
      case 'translate':
        result = await processTranslation(ai, request.text, request.parameters?.targetLanguage || 'ja')
        break
      case 'summarize':
        result = await processSummarization(ai, request.text)
        break
      case 'expand':
        result = await processExpansion(ai, request.text, request.context)
        break
      case 'improve':
        result = await processImprovement(ai, request.text, request.context)
        break
      case 'transform_mindmap':
        result = await processToMindMap(ai, request.text)
        break
      case 'transform_slides':
        result = await processToSlides(ai, request.text)
        break
      case 'code_explain':
        result = await processCodeExplanation(ai, request.text)
        break
      case 'code_fix':
        result = await processCodeFix(ai, request.text)
        break
      default:
        throw new Error(`Unknown AI task type: ${request.type}`)
    }
    
    // 結果をキャッシュ（24時間）
    await c.env.AI_CACHE.put(cacheKey, result, { expirationTtl: 86400 })
    
    return c.json<AIResponse>({
      success: true,
      result,
      processingTime: Date.now() - startTime,
      cached: false,
    })
    
  } catch (error) {
    console.error('AI processing error:', error)
    return c.json<AIResponse>({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      processingTime: Date.now() - startTime,
      cached: false,
    }, 500)
  }
})

// AI処理関数群
async function processTranslation(ai: Ai, text: string, targetLanguage: string): Promise<string> {
  const response = await ai.run('@cf/meta/m2m100-1.2b', {
    text,
    source_lang: 'en',
    target_lang: targetLanguage,
  })
  return response.translated_text || text
}

async function processSummarization(ai: Ai, text: string): Promise<string> {
  const response = await ai.run('@cf/facebook/bart-large-cnn', {
    input_text: text,
    max_length: 150,
  })
  return response.summary || `Summary: ${text.substring(0, 100)}...`
}

async function processImprovement(ai: Ai, text: string, context?: string): Promise<string> {
  const prompt = context 
    ? `Improve the following text. Context: ${context}\n\nText: ${text}`
    : `Improve the following text: ${text}`
    
  const response = await ai.run('@cf/meta/llama-2-7b-chat-fp16', {
    prompt,
    max_tokens: 500,
  })
  return response.response || text
}

async function processExpansion(ai: Ai, text: string, context?: string): Promise<string> {
  const prompt = context
    ? `Expand the following text with more details. Context: ${context}\n\nText: ${text}`
    : `Expand the following text with more details: ${text}`
    
  const response = await ai.run('@cf/meta/llama-2-7b-chat-fp16', {
    prompt,
    max_tokens: 800,
  })
  return response.response || `${text} [Expanded content would go here]`
}

async function processToMindMap(ai: Ai, text: string): Promise<string> {
  const prompt = `Convert the following text into a Mermaid mindmap format:\n\n${text}`
  
  const response = await ai.run('@cf/meta/llama-2-7b-chat-fp16', {
    prompt,
    max_tokens: 500,
  })
  
  // フォールバック処理
  if (!response.response || !response.response.includes('graph')) {
    const lines = text.split('\n').filter(line => line.trim())
    let mermaidCode = 'graph TD\n'
    mermaidCode += `    A["${lines[0]?.substring(0, 50) || 'Main Topic'}"]\n`
    
    lines.slice(1, 5).forEach((line, index) => {
      const nodeId = String.fromCharCode(66 + index)
      mermaidCode += `    A --> ${nodeId}["${line.substring(0, 40)}"]\n`
    })
    
    return mermaidCode
  }
  
  return response.response
}

async function processToSlides(ai: Ai, text: string): Promise<string> {
  const prompt = `Convert the following text into presentation slides format with markdown:\n\n${text}`
  
  const response = await ai.run('@cf/meta/llama-2-7b-chat-fp16', {
    prompt,
    max_tokens: 800,
  })
  
  return response.response || generateBasicSlides(text)
}

async function processCodeExplanation(ai: Ai, code: string): Promise<string> {
  const prompt = `Explain the following code in simple terms:\n\n${code}`
  
  const response = await ai.run('@cf/meta/llama-2-7b-chat-fp16', {
    prompt,
    max_tokens: 500,
  })
  
  return response.response || `This code ${code.substring(0, 50)}...`
}

async function processCodeFix(ai: Ai, code: string): Promise<string> {
  const prompt = `Fix any bugs or issues in the following code:\n\n${code}`
  
  const response = await ai.run('@cf/meta/llama-2-7b-chat-fp16', {
    prompt,
    max_tokens: 600,
  })
  
  return response.response || code
}

// ヘルパー関数
function generateBasicSlides(text: string): string {
  const paragraphs = text.split('\n\n').filter(p => p.trim())
  let slides = `# ${paragraphs[0]?.substring(0, 60) || 'Presentation'}\n\n`
  
  paragraphs.slice(1, 4).forEach((para, index) => {
    slides += `# Slide ${index + 2}\n\n`
    slides += `- ${para.substring(0, 100)}\n\n`
  })
  
  slides += '# Summary\n\n- Key points\n- Conclusion\n'
  return slides
}

// エクスポート
export default app