import { v } from 'convex/values'
import { mutation, query } from './_generated/server'
import { Doc, Id } from './_generated/dataModel'

// コメント作成
export const createComment = mutation({
  args: {
    documentId: v.id('documents'),
    authorId: v.id('users'),
    content: v.string(),
    position: v.object({
      start: v.number(),
      end: v.number(),
    }),
    thread: v.optional(v.id('comments')), // 返信の場合
  },
  handler: async (ctx, { documentId, authorId, content, position, thread }) => {
    const now = Date.now()
    
    const commentId = await ctx.db.insert('comments', {
      documentId,
      authorId,
      content,
      position,
      thread,
      resolved: false,
      reactions: [],
      createdAt: now,
      updatedAt: now,
    })

    return commentId
  },
})

// ドキュメントのコメント一覧取得
export const getComments = query({
  args: { 
    documentId: v.id('documents'),
    includeResolved: v.optional(v.boolean()),
  },
  handler: async (ctx, { documentId, includeResolved = false }) => {
    let query = ctx.db
      .query('comments')
      .withIndex('by_document', (q) => q.eq('documentId', documentId))

    if (!includeResolved) {
      query = query.filter((q) => q.eq(q.field('resolved'), false))
    }

    return await query
      .order('asc')
      .collect()
  },
})

// スレッド内のコメント取得
export const getCommentThread = query({
  args: { threadId: v.id('comments') },
  handler: async (ctx, { threadId }) => {
    const parentComment = await ctx.db.get(threadId)
    const replies = await ctx.db
      .query('comments')
      .withIndex('by_thread', (q) => q.eq('thread', threadId))
      .order('asc')
      .collect()

    return {
      parent: parentComment,
      replies,
    }
  },
})

// コメント編集
export const updateComment = mutation({
  args: {
    commentId: v.id('comments'),
    content: v.string(),
  },
  handler: async (ctx, { commentId, content }) => {
    await ctx.db.patch(commentId, {
      content,
      updatedAt: Date.now(),
    })
  },
})

// コメント削除
export const deleteComment = mutation({
  args: { commentId: v.id('comments') },
  handler: async (ctx, { commentId }) => {
    // 子コメント（返信）も削除
    const replies = await ctx.db
      .query('comments')
      .withIndex('by_thread', (q) => q.eq('thread', commentId))
      .collect()

    // 返信を先に削除
    for (const reply of replies) {
      await ctx.db.delete(reply._id)
    }

    // 親コメントを削除
    await ctx.db.delete(commentId)
  },
})

// コメント解決
export const resolveComment = mutation({
  args: {
    commentId: v.id('comments'),
    resolvedBy: v.id('users'),
  },
  handler: async (ctx, { commentId, resolvedBy }) => {
    const now = Date.now()
    
    await ctx.db.patch(commentId, {
      resolved: true,
      resolvedBy,
      resolvedAt: now,
      updatedAt: now,
    })
  },
})

// コメント解決解除
export const unresolveComment = mutation({
  args: { commentId: v.id('comments') },
  handler: async (ctx, { commentId }) => {
    await ctx.db.patch(commentId, {
      resolved: false,
      resolvedBy: undefined,
      resolvedAt: undefined,
      updatedAt: Date.now(),
    })
  },
})

// リアクション追加
export const addReaction = mutation({
  args: {
    commentId: v.id('comments'),
    userId: v.id('users'),
    emoji: v.string(),
  },
  handler: async (ctx, { commentId, userId, emoji }) => {
    const comment = await ctx.db.get(commentId)
    if (!comment) {
      throw new Error('Comment not found')
    }

    // 既存のリアクションをチェック
    const existingReaction = comment.reactions.find(
      reaction => reaction.userId === userId && reaction.emoji === emoji
    )

    if (existingReaction) {
      // 既に同じリアクションがある場合は削除
      const updatedReactions = comment.reactions.filter(
        reaction => !(reaction.userId === userId && reaction.emoji === emoji)
      )
      await ctx.db.patch(commentId, {
        reactions: updatedReactions,
        updatedAt: Date.now(),
      })
    } else {
      // 新しいリアクションを追加
      const updatedReactions = [...comment.reactions, { userId, emoji }]
      await ctx.db.patch(commentId, {
        reactions: updatedReactions,
        updatedAt: Date.now(),
      })
    }
  },
})

// リアクション削除
export const removeReaction = mutation({
  args: {
    commentId: v.id('comments'),
    userId: v.id('users'),
    emoji: v.string(),
  },
  handler: async (ctx, { commentId, userId, emoji }) => {
    const comment = await ctx.db.get(commentId)
    if (!comment) {
      throw new Error('Comment not found')
    }

    const updatedReactions = comment.reactions.filter(
      reaction => !(reaction.userId === userId && reaction.emoji === emoji)
    )

    await ctx.db.patch(commentId, {
      reactions: updatedReactions,
      updatedAt: Date.now(),
    })
  },
})

// 位置範囲内のコメント取得
export const getCommentsInRange = query({
  args: {
    documentId: v.id('documents'),
    startPosition: v.number(),
    endPosition: v.number(),
  },
  handler: async (ctx, { documentId, startPosition, endPosition }) => {
    const allComments = await ctx.db
      .query('comments')
      .withIndex('by_document', (q) => q.eq('documentId', documentId))
      .filter((q) => q.eq(q.field('resolved'), false))
      .collect()

    // 指定範囲と重複するコメントをフィルタ
    return allComments.filter(comment => {
      const commentStart = comment.position.start
      const commentEnd = comment.position.end
      
      // 範囲の重複チェック
      return !(commentEnd < startPosition || commentStart > endPosition)
    })
  },
})

// コメント統計取得
export const getCommentStats = query({
  args: { 
    documentId: v.id('documents'),
    timeRange: v.optional(v.number()), // ミリ秒
  },
  handler: async (ctx, { documentId, timeRange }) => {
    const since = timeRange ? Date.now() - timeRange : 0
    
    const comments = await ctx.db
      .query('comments')
      .withIndex('by_document', (q) => q.eq('documentId', documentId))
      .filter((q) => q.gt(q.field('createdAt'), since))
      .collect()

    const stats = {
      total: comments.length,
      resolved: comments.filter(c => c.resolved).length,
      unresolved: comments.filter(c => !c.resolved).length,
      threads: comments.filter(c => !c.thread).length, // 親コメントの数
      replies: comments.filter(c => c.thread).length,
      totalReactions: comments.reduce((sum, c) => sum + c.reactions.length, 0),
      activeCommenters: new Set(comments.map(c => c.authorId)).size,
    }

    return stats
  },
})

// ユーザーのコメント履歴
export const getUserComments = query({
  args: {
    userId: v.id('users'),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { userId, limit = 20 }) => {
    // まずすべてのコメントを取得してから、作成者でフィルタリング
    const allComments = await ctx.db.query('comments').collect()
    const userComments = allComments
      .filter(comment => comment.authorId === userId)
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, limit)

    return userComments
  },
})