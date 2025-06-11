import { v } from 'convex/values'
import { mutation, query, internalMutation } from './_generated/server'
import { Doc, Id } from './_generated/dataModel'

// プレゼンス関連

// ユーザープレゼンス更新
export const updatePresence = mutation({
  args: {
    documentId: v.id('documents'),
    userId: v.id('users'),
    cursor: v.object({
      position: v.number(),
      selection: v.optional(v.object({
        start: v.number(),
        end: v.number(),
      })),
    }),
    activity: v.union(
      v.literal('typing'),
      v.literal('selecting'),
      v.literal('idle'),
      v.literal('ai_processing')
    ),
    viewport: v.optional(v.object({
      scrollTop: v.number(),
      scrollLeft: v.number(),
    })),
  },
  handler: async (ctx, { documentId, userId, cursor, activity, viewport }) => {
    const now = Date.now()
    
    // 既存のプレゼンス情報を確認
    const existingPresence = await ctx.db
      .query('presence')
      .withIndex('by_document', (q) => q.eq('documentId', documentId))
      .filter((q) => q.eq(q.field('userId'), userId))
      .first()

    if (existingPresence) {
      // 更新
      await ctx.db.patch(existingPresence._id, {
        cursor,
        activity,
        viewport,
        lastSeen: now,
        isOnline: true,
      })
    } else {
      // 新規作成
      await ctx.db.insert('presence', {
        documentId,
        userId,
        cursor,
        activity,
        viewport,
        lastSeen: now,
        isOnline: true,
      })
    }
  },
})

// ドキュメントのプレゼンス一覧取得
export const getPresence = query({
  args: { documentId: v.id('documents') },
  handler: async (ctx, { documentId }) => {
    const fiveMinutesAgo = Date.now() - 5 * 60 * 1000
    
    return await ctx.db
      .query('presence')
      .withIndex('by_document', (q) => q.eq('documentId', documentId))
      .filter((q) => q.gt(q.field('lastSeen'), fiveMinutesAgo))
      .collect()
  },
})

// ユーザーがオフラインになったときの処理
export const setUserOffline = mutation({
  args: {
    documentId: v.id('documents'),
    userId: v.id('users'),
  },
  handler: async (ctx, { documentId, userId }) => {
    const presence = await ctx.db
      .query('presence')
      .withIndex('by_document', (q) => q.eq('documentId', documentId))
      .filter((q) => q.eq(q.field('userId'), userId))
      .first()

    if (presence) {
      await ctx.db.patch(presence._id, {
        isOnline: false,
        activity: 'idle',
      })
    }
  },
})

// Operational Transform関連

// 操作を追加
export const addOperation = mutation({
  args: {
    documentId: v.id('documents'),
    userId: v.id('users'),
    type: v.union(
      v.literal('insert'),
      v.literal('delete'),
      v.literal('retain'),
      v.literal('format')
    ),
    position: v.number(),
    length: v.optional(v.number()),
    content: v.optional(v.string()),
    attributes: v.optional(v.object({
      bold: v.optional(v.boolean()),
      italic: v.optional(v.boolean()),
      underline: v.optional(v.boolean()),
      color: v.optional(v.string()),
      backgroundColor: v.optional(v.string()),
    })),
  },
  handler: async (ctx, args) => {
    const now = Date.now()
    
    const operationId = await ctx.db.insert('operations', {
      ...args,
      timestamp: now,
      applied: false,
      conflictResolved: false,
    })

    // ドキュメントの最終更新時刻を更新
    await ctx.db.patch(args.documentId, {
      updatedAt: now,
      lastEditedBy: args.userId,
    })

    return operationId
  },
})

// 操作一覧取得（特定のタイムスタンプ以降）
export const getOperationsSince = query({
  args: {
    documentId: v.id('documents'),
    since: v.number(),
  },
  handler: async (ctx, { documentId, since }) => {
    return await ctx.db
      .query('operations')
      .withIndex('by_document', (q) => q.eq('documentId', documentId))
      .filter((q) => q.gt(q.field('timestamp'), since))
      .order('asc')
      .collect()
  },
})

// 操作を適用済みにマーク
export const markOperationApplied = mutation({
  args: {
    operationId: v.id('operations'),
    conflictResolved: v.optional(v.boolean()),
  },
  handler: async (ctx, { operationId, conflictResolved = false }) => {
    await ctx.db.patch(operationId, {
      applied: true,
      conflictResolved,
    })
  },
})

// セッション管理

// セッション開始
export const startSession = mutation({
  args: {
    userId: v.id('users'),
    documentId: v.id('documents'),
  },
  handler: async (ctx, { userId, documentId }) => {
    const now = Date.now()
    
    // 既存のアクティブセッションを終了
    const activeSessions = await ctx.db
      .query('sessions')
      .withIndex('by_user', (q) => q.eq('userId', userId))
      .filter((q) => q.eq(q.field('isActive'), true))
      .collect()

    for (const session of activeSessions) {
      await ctx.db.patch(session._id, {
        isActive: false,
        endedAt: now,
        duration: now - session.startedAt,
      })
    }

    // 新しいセッションを開始
    const sessionId = await ctx.db.insert('sessions', {
      userId,
      documentId,
      startedAt: now,
      operationCount: 0,
      aiTaskCount: 0,
      isActive: true,
    })

    return sessionId
  },
})

// セッション終了
export const endSession = mutation({
  args: {
    userId: v.id('users'),
    documentId: v.id('documents'),
  },
  handler: async (ctx, { userId, documentId }) => {
    const now = Date.now()
    
    const activeSession = await ctx.db
      .query('sessions')
      .withIndex('by_user', (q) => q.eq('userId', userId))
      .filter((q) => 
        q.and(
          q.eq(q.field('documentId'), documentId),
          q.eq(q.field('isActive'), true)
        )
      )
      .first()

    if (activeSession) {
      await ctx.db.patch(activeSession._id, {
        isActive: false,
        endedAt: now,
        duration: now - activeSession.startedAt,
      })
    }
  },
})

// セッション統計更新
export const updateSessionStats = mutation({
  args: {
    userId: v.id('users'),
    documentId: v.id('documents'),
    operationCount: v.optional(v.number()),
    aiTaskCount: v.optional(v.number()),
  },
  handler: async (ctx, { userId, documentId, operationCount = 0, aiTaskCount = 0 }) => {
    const activeSession = await ctx.db
      .query('sessions')
      .withIndex('by_user', (q) => q.eq('userId', userId))
      .filter((q) => 
        q.and(
          q.eq(q.field('documentId'), documentId),
          q.eq(q.field('isActive'), true)
        )
      )
      .first()

    if (activeSession) {
      await ctx.db.patch(activeSession._id, {
        operationCount: activeSession.operationCount + operationCount,
        aiTaskCount: activeSession.aiTaskCount + aiTaskCount,
      })
    }
  },
})

// アクティブなセッション一覧取得
export const getActiveSessions = query({
  args: { documentId: v.id('documents') },
  handler: async (ctx, { documentId }) => {
    return await ctx.db
      .query('sessions')
      .withIndex('by_document', (q) => q.eq('documentId', documentId))
      .filter((q) => q.eq(q.field('isActive'), true))
      .collect()
  },
})