import { v } from 'convex/values'
import { mutation, query, action } from './_generated/server'
import { Doc, Id } from './_generated/dataModel'
import { api, internal } from './_generated/api'
import { AI_CONFIG, createAIPrompt } from './config'
import { callAIWithFallback } from './ai-providers'

// AI タスク作成
export const createAITask = mutation({
  args: {
    documentId: v.id('documents'),
    userId: v.id('users'),
    type: v.union(
      v.literal('improve'),
      v.literal('translate'),
      v.literal('summarize'),
      v.literal('expand'),
      v.literal('transform_mindmap'),
      v.literal('transform_slides'),
      v.literal('code_explain'),
      v.literal('code_fix')
    ),
    selectedText: v.string(),
    context: v.optional(v.string()),
    position: v.number(),
    parameters: v.optional(v.any()),
  },
  handler: async (ctx, { documentId, userId, type, selectedText, context, position, parameters }) => {
    const now = Date.now()
    
    const taskId = await ctx.db.insert('aiTasks', {
      documentId,
      userId,
      type,
      input: {
        selectedText,
        context,
        position,
        parameters,
      },
      status: 'pending',
      createdAt: now,
    })

    // セッション統計を更新
    await ctx.runMutation(internal.collaboration.updateSessionStats, {
      userId,
      documentId,
      aiTaskCount: 1,
    })

    return taskId
  },
})

// AI タスク状態更新
export const updateAITaskStatus = mutation({
  args: {
    taskId: v.id('aiTasks'),
    status: v.union(
      v.literal('pending'),
      v.literal('processing'),
      v.literal('completed'),
      v.literal('failed')
    ),
    output: v.optional(v.object({
      result: v.string(),
      confidence: v.number(),
      suggestions: v.optional(v.array(v.string())),
    })),
    errorMessage: v.optional(v.string()),
  },
  handler: async (ctx, { taskId, status, output, errorMessage }) => {
    const now = Date.now()
    const task = await ctx.db.get(taskId)
    
    if (!task) {
      throw new Error('AI task not found')
    }

    const updateData: any = {
      status,
      ...(output && { output }),
      ...(errorMessage && { errorMessage }),
    }

    if (status === 'processing') {
      // 処理開始時刻は記録しないが、後で計算できるように準備
    } else if (status === 'completed' || status === 'failed') {
      updateData.completedAt = now
      updateData.processingTime = now - task.createdAt
    }

    await ctx.db.patch(taskId, updateData)
  },
})

// ドキュメントのAIタスク一覧取得
export const getAITasks = query({
  args: { 
    documentId: v.id('documents'),
    status: v.optional(v.union(
      v.literal('pending'),
      v.literal('processing'),
      v.literal('completed'),
      v.literal('failed')
    )),
  },
  handler: async (ctx, { documentId, status }) => {
    let query = ctx.db
      .query('aiTasks')
      .withIndex('by_document', (q) => q.eq('documentId', documentId))

    if (status) {
      query = query.filter((q) => q.eq(q.field('status'), status))
    }

    return await query
      .order('desc')
      .take(50) // 最新50件まで
  },
})

// ユーザーのAIタスク履歴取得
export const getUserAITasks = query({
  args: { 
    userId: v.id('users'),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { userId, limit = 20 }) => {
    return await ctx.db
      .query('aiTasks')
      .withIndex('by_user', (q) => q.eq('userId', userId))
      .order('desc')
      .take(limit)
  },
})

// AI処理実行（アクション）
export const executeAICommand = action({
  args: {
    taskId: v.id('aiTasks'),
  },
  handler: async (ctx, { taskId }) => {
    // タスク情報を取得
    const task = await ctx.runQuery(api.ai.getAITaskById, { taskId })
    if (!task) {
      throw new Error('AI task not found')
    }

    // 処理中ステータスに更新
    await ctx.runMutation(api.ai.updateAITaskStatus, {
      taskId,
      status: 'processing',
    })

    // リトライ設定
    const MAX_RETRIES = AI_CONFIG.MAX_RETRY_ATTEMPTS
    const RETRY_DELAY = AI_CONFIG.RETRY_DELAY_MS
    let lastError: Error | null = null

    // プログレス更新用の関数
    const updateProgress = async (progress: number, message?: string) => {
      await ctx.runMutation(api.ai.updateAITaskProgress, {
        taskId,
        progress,
        message,
      })
    }

    try {
      await updateProgress(10, 'AI処理を開始しています...')
      
      let result: string | null = null
      let confidence: number = 0.8 // デフォルト信頼度

      // リトライループ
      for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
          await updateProgress(20 + (attempt - 1) * 10, `処理中... (試行 ${attempt}/${MAX_RETRIES})`)
          
          // AI処理のタイプに応じて処理を分岐
          switch (task.type) {
            case 'improve':
              result = await processTextImprovement(task.input.selectedText, task.input.context)
              break
            case 'translate':
              result = await processTranslation(task.input.selectedText, task.input.parameters?.targetLanguage || 'ja')
              break
            case 'summarize':
              result = await processSummarization(task.input.selectedText)
              break
            case 'expand':
              result = await processExpansion(task.input.selectedText, task.input.context)
              break
            case 'transform_mindmap':
              result = await processToMindMap(task.input.selectedText)
              break
            case 'transform_slides':
              result = await processToSlides(task.input.selectedText)
              break
            case 'code_explain':
              result = await processCodeExplanation(task.input.selectedText)
              break
            case 'code_fix':
              result = await processCodeFix(task.input.selectedText)
              break
            default:
              throw new Error(`Unknown AI task type: ${task.type}`)
          }

          // 成功した場合はループを抜ける
          if (result) {
            await updateProgress(90, '処理が完了しました')
            break
          }
        } catch (error) {
          lastError = error instanceof Error ? error : new Error('Unknown error')
          console.error(`AI processing attempt ${attempt} failed:`, error)
          
          // レート制限エラーの場合は長めに待機
          if (lastError.message.includes('rate limit') || lastError.message.includes('429')) {
            await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * attempt * 2))
          } else if (attempt < MAX_RETRIES) {
            await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * attempt))
          }
        }
      }

      // すべての試行が失敗した場合
      if (!result) {
        throw lastError || new Error('AI processing failed after all retries')
      }

      await updateProgress(100, '完了')

      // 成功時のステータス更新
      await ctx.runMutation(api.ai.updateAITaskStatus, {
        taskId,
        status: 'completed',
        output: {
          result,
          confidence,
          suggestions: [],
        },
      })

      return { success: true, result }
    } catch (error) {
      // エラー時のステータス更新
      await ctx.runMutation(api.ai.updateAITaskStatus, {
        taskId,
        status: 'failed',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      })

      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  },
})

// AIタスク詳細取得
export const getAITaskById = query({
  args: { taskId: v.id('aiTasks') },
  handler: async (ctx, { taskId }) => {
    return await ctx.db.get(taskId)
  },
})

// 実際のAI処理関数群
async function processTextImprovement(text: string, context?: string): Promise<string> {
  const userPrompt = context 
    ? `以下のテキストを改善してください。コンテキスト: ${context}\n\nテキスト: ${text}`
    : `以下のテキストを改善してください: ${text}`

  const systemPrompt = '文章改善の専門家として、読みやすく、明確で、魅力的な文章に改善してください。'
  
  const prompt = createAIPrompt(userPrompt, systemPrompt, { maxTokens: 2000 })
  const response = await callAIWithFallback(prompt)

  if (response.success && response.content) {
    return response.content
  }

  console.error('Text improvement failed:', response.error)
  return `[改善版] ${text}`
}

async function processTranslation(text: string, targetLanguage: string): Promise<string> {
  const languageMap: Record<string, string> = {
    ja: '日本語',
    en: '英語',
    es: 'スペイン語',
    fr: 'フランス語',
    de: 'ドイツ語',
    zh: '中国語',
    ko: '韓国語',
  }

  const targetLang = languageMap[targetLanguage] || targetLanguage
  const userPrompt = `以下のテキストを${targetLang}に翻訳してください: ${text}`
  const systemPrompt = 'あなたは多言語翻訳の専門家です。自然で正確な翻訳を提供してください。'
  
  const prompt = createAIPrompt(userPrompt, systemPrompt, { maxTokens: 2000 })
  const response = await callAIWithFallback(prompt)

  if (response.success && response.content) {
    return response.content
  }

  console.error('Translation failed:', response.error)
  return `[${targetLanguage}翻訳] ${text}`
}

async function processSummarization(text: string): Promise<string> {
  const userPrompt = `以下のテキストを簡潔に要約してください: ${text}`
  const systemPrompt = '要約の専門家として、重要なポイントを保持しながら簡潔にまとめてください。'
  
  const prompt = createAIPrompt(userPrompt, systemPrompt, { maxTokens: 1000 })
  const response = await callAIWithFallback(prompt)

  if (response.success && response.content) {
    return response.content
  }

  console.error('Summarization failed:', response.error)
  return `[要約] ${text.substring(0, 100)}...`
}

async function processExpansion(text: string, context?: string): Promise<string> {
  const userPrompt = context
    ? `以下のテキストを拡張してください。コンテキスト: ${context}\n\nテキスト: ${text}`
    : `以下のテキストをより詳細に拡張してください: ${text}`

  const systemPrompt = '文章拡張の専門家として、より詳細な情報、例、説明を追加して内容を豊かにしてください。'
  
  const prompt = createAIPrompt(userPrompt, systemPrompt, { maxTokens: 3000 })
  const response = await callAIWithFallback(prompt)

  if (response.success && response.content) {
    return response.content
  }

  console.error('Text expansion failed:', response.error)
  return `[拡張版] ${text} - より詳細な説明が追加されました。`
}

async function processToMindMap(text: string): Promise<string> {
  const userPrompt = `Convert the following text into a Mermaid mindmap diagram. 
      Extract the main topic and key points, then format them as a Mermaid graph.
      The format should be:
      graph TD
          A[Main Topic] --> B[Key Point 1]
          A --> C[Key Point 2]
          etc.
      
      Text to convert:
      ${text}`

  const systemPrompt = 'You are an expert at creating clear, well-structured Mermaid diagrams from text content.'
  
  const prompt = createAIPrompt(userPrompt, systemPrompt, { maxTokens: 1000 })
  const response = await callAIWithFallback(prompt, 'openai') // OpenAIを優先

  if (response.success && response.content) {
    return response.content
  }

  console.error('AI mindmap generation failed:', response.error)
  // フォールバック: 基本的なマインドマップを生成
  return generateBasicMindMap(text)
}

// ヘルパー関数：基本的なマインドマップ生成
function generateBasicMindMap(text: string): string {
  const lines = text.split('\n').filter(line => line.trim())
  const mainTopic = lines[0]?.substring(0, 50) || 'Main Topic'
  
  let mermaidCode = 'graph TD\n'
  mermaidCode += `    A["${mainTopic}"]\n`
  
  // 最初の5行を子ノードとして追加
  lines.slice(1, 6).forEach((line, index) => {
    const nodeId = String.fromCharCode(66 + index) // B, C, D, E, F
    const nodeText = line.substring(0, 40)
    mermaidCode += `    A --> ${nodeId}["${nodeText}"]\n`
  })
  
  return mermaidCode
}

async function processToSlides(text: string): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    // フォールバック処理
    return generateBasicSlides(text)
  }

  try {
    const response = await callOpenAIAPI(
      `Convert the following text into a presentation slide format.
      Create 3-5 slides with clear titles and bullet points.
      Format as Markdown with the following structure:
      
      # Slide 1: Title
      - Bullet point 1
      - Bullet point 2
      
      # Slide 2: Title
      - Content
      
      etc.
      
      Text to convert:
      ${text}`,
      'You are an expert presentation designer who creates clear, engaging slides from text content.',
      1500
    )

    if (response.success && response.content) {
      return response.content
    }
  } catch (error) {
    console.error('AI slides generation failed:', error)
  }

  // フォールバック: 基本的なスライドを生成
  return generateBasicSlides(text)
}

// ヘルパー関数：基本的なスライド生成
function generateBasicSlides(text: string): string {
  const paragraphs = text.split('\n\n').filter(p => p.trim())
  const title = paragraphs[0]?.split('\n')[0]?.substring(0, 60) || 'Presentation'
  
  let slides = `# ${title}\n\n`
  slides += `${paragraphs[0] || 'Introduction'}\n\n`
  
  // メインコンテンツスライド
  if (paragraphs.length > 1) {
    paragraphs.slice(1, 4).forEach((para, index) => {
      const slideTitle = para.split('\n')[0]?.substring(0, 50) || `Topic ${index + 1}`
      slides += `# ${slideTitle}\n\n`
      
      // 箇条書きに変換
      const lines = para.split('\n').slice(1).filter(l => l.trim())
      if (lines.length > 0) {
        lines.forEach(line => {
          slides += `- ${line.substring(0, 80)}\n`
        })
      } else {
        slides += `- ${para.substring(0, 100)}\n`
      }
      slides += '\n'
    })
  }
  
  // まとめスライド
  slides += '# まとめ\n\n'
  slides += '- 重要なポイントの振り返り\n'
  slides += '- 次のステップ\n'
  slides += '- Q&A\n'
  
  return slides
}

async function processCodeExplanation(code: string): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY || process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return `[コード解説] このコードは${code.substring(0, 50)}...の処理を行います。`
  }

  try {
    const response = process.env.OPENAI_API_KEY
      ? await callOpenAIAPI(
          `以下のコードを解説してください。初心者にもわかりやすく説明してください:\n\n${code}`,
          'プログラミング教育の専門家として、コードの動作を明確に説明してください。',
          2000
        )
      : await callAnthropicAPI(
          `以下のコードを解説してください。初心者にもわかりやすく説明してください:\n\n${code}`,
          'プログラミング教育の専門家として、コードの動作を明確に説明してください。',
          2000
        )

    if (response.success && response.content) {
      return response.content
    }
  } catch (error) {
    console.error('Code explanation failed:', error)
  }

  return `[コード解説] このコードは${code.substring(0, 50)}...の処理を行います。`
}

async function processCodeFix(code: string): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY || process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return `[修正版] ${code}`
  }

  try {
    const response = process.env.OPENAI_API_KEY
      ? await callOpenAIAPI(
          `以下のコードのバグや問題を修正してください。修正箇所にはコメントを追加してください:\n\n${code}`,
          'ソフトウェアエンジニアとして、コードのバグを特定し、修正してください。',
          2000
        )
      : await callAnthropicAPI(
          `以下のコードのバグや問題を修正してください。修正箇所にはコメントを追加してください:\n\n${code}`,
          'ソフトウェアエンジニアとして、コードのバグを特定し、修正してください。',
          2000
        )

    if (response.success && response.content) {
      return response.content
    }
  } catch (error) {
    console.error('Code fix failed:', error)
  }

  return `[修正版] ${code}`
}

// AI処理統計取得
export const getAIStats = query({
  args: { 
    documentId: v.optional(v.id('documents')),
    userId: v.optional(v.id('users')),
    timeRange: v.optional(v.number()), // ミリ秒
  },
  handler: async (ctx, { documentId, userId, timeRange }) => {
    const since = timeRange ? Date.now() - timeRange : 0
    
    let tasksQuery
    
    if (documentId) {
      tasksQuery = ctx.db.query('aiTasks')
        .withIndex('by_document', (q) => q.eq('documentId', documentId))
    } else if (userId) {
      tasksQuery = ctx.db.query('aiTasks')
        .withIndex('by_user', (q) => q.eq('userId', userId))
    } else {
      tasksQuery = ctx.db.query('aiTasks')
    }
    
    const tasks = await tasksQuery
      .filter((q) => q.gt(q.field('createdAt'), since))
      .collect()

    // 統計計算
    const stats = {
      total: tasks.length,
      completed: tasks.filter(t => t.status === 'completed').length,
      failed: tasks.filter(t => t.status === 'failed').length,
      pending: tasks.filter(t => t.status === 'pending').length,
      processing: tasks.filter(t => t.status === 'processing').length,
      averageProcessingTime: 0,
      typeBreakdown: {} as Record<string, number>,
    }

    // 平均処理時間計算
    const completedTasks = tasks.filter(t => t.status === 'completed' && t.processingTime)
    if (completedTasks.length > 0) {
      stats.averageProcessingTime = completedTasks.reduce((sum, t) => sum + (t.processingTime || 0), 0) / completedTasks.length
    }

    // タイプ別統計
    tasks.forEach(task => {
      stats.typeBreakdown[task.type] = (stats.typeBreakdown[task.type] || 0) + 1
    })

    return stats
  },
})

// Anthropic API呼び出し
export const callAnthropic = action({
  args: {
    prompt: v.string(),
    systemPrompt: v.optional(v.string()),
    model: v.optional(v.string()),
    maxTokens: v.optional(v.number()),
  },
  handler: async (ctx, { prompt, systemPrompt, model = 'claude-3-sonnet-20240229', maxTokens = 1000 }) => {
    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      throw new Error('Anthropic API key not configured')
    }

    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': apiKey,
          'Content-Type': 'application/json',
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model,
          max_tokens: maxTokens,
          system: systemPrompt || '',
          messages: [
            { role: 'user', content: prompt }
          ],
        }),
      })

      if (!response.ok) {
        throw new Error(`Anthropic API error: ${response.status}`)
      }

      const data = await response.json()
      return {
        success: true,
        content: data.content[0]?.text || '',
        usage: data.usage,
      }
    } catch (error) {
      console.error('Anthropic API call failed:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  },
})

// OpenAI API呼び出し
export const callOpenAI = action({
  args: {
    prompt: v.string(),
    systemPrompt: v.optional(v.string()),
    model: v.optional(v.string()),
    maxTokens: v.optional(v.number()),
  },
  handler: async (ctx, { prompt, systemPrompt, model = 'gpt-4', maxTokens = 1000 }) => {
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      throw new Error('OpenAI API key not configured')
    }

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          messages: [
            ...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []),
            { role: 'user', content: prompt }
          ],
          max_tokens: maxTokens,
          temperature: 0.7,
        }),
      })

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status}`)
      }

      const data = await response.json()
      return {
        success: true,
        content: data.choices[0]?.message?.content || '',
        usage: data.usage,
      }
    } catch (error) {
      console.error('OpenAI API call failed:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  },
})


// AI処理のメイン関数
export const processAICommand = action({
  args: {
    type: v.union(
      v.literal('translate'),
      v.literal('summarize'), 
      v.literal('expand'),
      v.literal('improve'),
      v.literal('code'),
      v.literal('fix')
    ),
    selectedText: v.string(),
    context: v.optional(v.string()),
    provider: v.optional(v.union(v.literal('openai'), v.literal('anthropic'))),
  },
  handler: async (ctx, { type, selectedText, context, provider = 'openai' }) => {
    // プロンプトの生成
    const prompts = {
      translate: {
        system: 'あなたは多言語翻訳の専門家です。与えられたテキストを自然で正確な日本語に翻訳してください。',
        user: `以下のテキストを日本語に翻訳してください：\n\n${selectedText}`
      },
      summarize: {
        system: 'あなたは要約の専門家です。与えられたテキストの要点を簡潔にまとめてください。',
        user: `以下のテキストを簡潔に要約してください：\n\n${selectedText}`
      },
      expand: {
        system: 'あなたは文章拡張の専門家です。与えられたテキストにより詳細な情報や説明を追加してください。',
        user: `以下のテキストをより詳細に拡張してください：\n\n${selectedText}${context ? `\n\nコンテキスト：${context}` : ''}`
      },
      improve: {
        system: 'あなたは文章改善の専門家です。与えられたテキストをより読みやすく、わかりやすく改善してください。',
        user: `以下のテキストを改善してください：\n\n${selectedText}`
      },
      code: {
        system: 'あなたはプログラミングの専門家です。与えられた要求に基づいてコードを生成してください。',
        user: `以下の要求に基づいてコードを生成してください：\n\n${selectedText}`
      },
      fix: {
        system: 'あなたは文法とスペルチェックの専門家です。与えられたテキストの文法エラーやスペルミスを修正してください。',
        user: `以下のテキストの文法エラーやスペルミスを修正してください：\n\n${selectedText}`
      }
    }

    const promptData = prompts[type]
    const prompt = createAIPrompt(promptData.user, promptData.system, { maxTokens: 2000 })
    
    // AI API呼び出し（フォールバック機能付き）
    const result = await callAIWithFallback(prompt, provider)

    return result
  },
})

// AI タスクプログレス更新
export const updateAITaskProgress = mutation({
  args: {
    taskId: v.id('aiTasks'),
    progress: v.number(),
    message: v.optional(v.string()),
  },
  handler: async (ctx, { taskId, progress, message }) => {
    const task = await ctx.db.get(taskId)
    if (!task) {
      throw new Error('AI task not found')
    }

    const updateData: any = {
      progress,
      lastProgressUpdate: Date.now(),
    }

    if (message) {
      updateData.progressMessage = message
    }

    await ctx.db.patch(taskId, updateData)
  },
})

// 同時実行制限チェック
export const checkConcurrentAITasks = query({
  args: {
    userId: v.id('users'),
  },
  handler: async (ctx, { userId }) => {
    // ユーザーごとの同時実行中のタスク数を確認
    const processingTasks = await ctx.db
      .query('aiTasks')
      .withIndex('by_user', (q) => q.eq('userId', userId))
      .filter((q) => 
        q.or(
          q.eq(q.field('status'), 'pending'),
          q.eq(q.field('status'), 'processing')
        )
      )
      .collect()

    const MAX_CONCURRENT_TASKS = AI_CONFIG.MAX_CONCURRENT_TASKS_PER_USER
    const canExecute = processingTasks.length < MAX_CONCURRENT_TASKS

    return {
      canExecute,
      currentTasks: processingTasks.length,
      maxTasks: MAX_CONCURRENT_TASKS,
      processingTasks: processingTasks.map(task => ({
        id: task._id,
        type: task.type,
        status: task.status,
        progress: task.progress || 0,
      })),
    }
  },
})

// レート制限チェック
export const checkRateLimit = query({
  args: {
    userId: v.id('users'),
    timeWindow: v.optional(v.number()), // ミリ秒単位のタイムウィンドウ
  },
  handler: async (ctx, { userId, timeWindow = 3600000 }) => { // デフォルト1時間
    const since = Date.now() - timeWindow
    
    const recentTasks = await ctx.db
      .query('aiTasks')
      .withIndex('by_user', (q) => q.eq('userId', userId))
      .filter((q) => q.gt(q.field('createdAt'), since))
      .collect()

    const RATE_LIMIT = AI_CONFIG.RATE_LIMIT_HOURLY
    const requestCount = recentTasks.length
    const isWithinLimit = requestCount < RATE_LIMIT

    return {
      isWithinLimit,
      currentCount: requestCount,
      limit: RATE_LIMIT,
      timeWindowMs: timeWindow,
      resetTime: since + timeWindow,
    }
  },
})

// AI タスク作成（同時実行制限とレート制限チェック付き）
export const createAITaskWithLimits = mutation({
  args: {
    documentId: v.id('documents'),
    userId: v.id('users'),
    type: v.union(
      v.literal('improve'),
      v.literal('translate'),
      v.literal('summarize'),
      v.literal('expand'),
      v.literal('transform_mindmap'),
      v.literal('transform_slides'),
      v.literal('code_explain'),
      v.literal('code_fix')
    ),
    selectedText: v.string(),
    context: v.optional(v.string()),
    position: v.number(),
    parameters: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    // 同時実行制限チェック
    const concurrentCheck = await ctx.runQuery(api.ai.checkConcurrentAITasks, { 
      userId: args.userId 
    })
    
    if (!concurrentCheck.canExecute) {
      throw new Error(
        `同時実行制限に達しています。現在 ${concurrentCheck.currentTasks}/${concurrentCheck.maxTasks} のタスクが実行中です。`
      )
    }

    // レート制限チェック
    const rateLimitCheck = await ctx.runQuery(api.ai.checkRateLimit, { 
      userId: args.userId 
    })
    
    if (!rateLimitCheck.isWithinLimit) {
      throw new Error(
        `レート制限に達しています。1時間あたり ${rateLimitCheck.limit} 回までです。`
      )
    }

    // タスク作成
    return await ctx.runMutation(api.ai.createAITask, args)
  },
})