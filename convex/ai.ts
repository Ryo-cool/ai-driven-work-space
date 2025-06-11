import { v } from 'convex/values'
import { mutation, query, action } from './_generated/server'
import { Doc, Id } from './_generated/dataModel'

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

    try {
      let result: string
      let confidence: number = 0.8 // デフォルト信頼度

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

// 実際のAI処理関数群（プレースホルダー）
async function processTextImprovement(text: string, context?: string): Promise<string> {
  // TODO: 実際のAI APIコールを実装
  // 現在はモックレスポンス
  return `[改善版] ${text}`
}

async function processTranslation(text: string, targetLanguage: string): Promise<string> {
  // TODO: 実際のAI APIコールを実装
  return `[${targetLanguage}翻訳] ${text}`
}

async function processSummarization(text: string): Promise<string> {
  // TODO: 実際のAI APIコールを実装
  return `[要約] ${text.substring(0, 100)}...`
}

async function processExpansion(text: string, context?: string): Promise<string> {
  // TODO: 実際のAI APIコールを実装
  return `[拡張版] ${text} - より詳細な説明が追加されました。`
}

async function processToMindMap(text: string): Promise<string> {
  // TODO: Mermaid形式のマインドマップ生成
  return `
graph TD
    A[${text.substring(0, 20)}] --> B[ポイント1]
    A --> C[ポイント2]
    A --> D[ポイント3]
  `
}

async function processToSlides(text: string): Promise<string> {
  // TODO: スライド形式に変換
  return `
# スライド 1
${text}

# スライド 2
詳細説明

# スライド 3
まとめ
  `
}

async function processCodeExplanation(code: string): Promise<string> {
  // TODO: コード解説
  return `[コード解説] このコードは${code.substring(0, 50)}...の処理を行います。`
}

async function processCodeFix(code: string): Promise<string> {
  // TODO: コード修正
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
    
    let query = ctx.db.query('aiTasks')
    
    if (documentId) {
      query = query.withIndex('by_document', (q) => q.eq('documentId', documentId))
    } else if (userId) {
      query = query.withIndex('by_user', (q) => q.eq('userId', userId))
    }
    
    const tasks = await query
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

// internal functions (convex内部で使用)
export const { updateSessionStats } = {} as any // プレースホルダー