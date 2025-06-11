import { v } from 'convex/values'
import { mutation, query, internalMutation } from './_generated/server'
import { Doc, Id } from './_generated/dataModel'

// ドキュメント取得
export const getDocument = query({
  args: { id: v.id('documents') },
  handler: async (ctx, { id }) => {
    return await ctx.db.get(id)
  },
})

// ワークスペース内のドキュメント一覧取得
export const getDocumentsByWorkspace = query({
  args: { workspaceId: v.id('workspaces') },
  handler: async (ctx, { workspaceId }) => {
    return await ctx.db
      .query('documents')
      .withIndex('by_workspace', (q) => q.eq('workspaceId', workspaceId))
      .order('desc')
      .collect()
  },
})

// ドキュメント作成
export const createDocument = mutation({
  args: {
    title: v.string(),
    workspaceId: v.id('workspaces'),
    authorId: v.id('users'),
    content: v.optional(v.string()),
  },
  handler: async (ctx, { title, workspaceId, authorId, content = '' }) => {
    const now = Date.now()
    
    const documentId = await ctx.db.insert('documents', {
      title,
      content,
      workspaceId,
      authorId,
      collaborators: [authorId],
      version: 1,
      status: 'draft',
      metadata: {
        wordCount: 0,
        characterCount: content.length,
        estimatedReadTime: 0,
        tags: [],
      },
      permissions: {
        canEdit: [authorId],
        canComment: [authorId],
        canView: [authorId],
      },
      createdAt: now,
      updatedAt: now,
      lastEditedBy: authorId,
    })

    // 初期バージョンを保存
    await ctx.db.insert('documentVersions', {
      documentId,
      version: 1,
      content,
      summary: 'Document created',
      authorId,
      changeType: 'manual_save',
      operations: [],
      createdAt: now,
    })

    return documentId
  },
})

// ドキュメント更新
export const updateDocument = mutation({
  args: {
    id: v.id('documents'),
    userId: v.id('users'),
    content: v.string(),
    summary: v.optional(v.string()),
  },
  handler: async (ctx, { id, userId, content, summary = 'Auto save' }) => {
    const document = await ctx.db.get(id)
    if (!document) {
      throw new Error('Document not found')
    }

    const now = Date.now()
    const newVersion = document.version + 1

    // ドキュメントを更新
    await ctx.db.patch(id, {
      content,
      version: newVersion,
      updatedAt: now,
      lastEditedBy: userId,
      metadata: {
        ...document.metadata,
        characterCount: content.length,
        wordCount: content.split(/\s+/).filter(Boolean).length,
        estimatedReadTime: Math.ceil(content.split(/\s+/).filter(Boolean).length / 200),
      },
    })

    // バージョン履歴を保存
    await ctx.db.insert('documentVersions', {
      documentId: id,
      version: newVersion,
      content,
      summary,
      authorId: userId,
      changeType: 'auto_save',
      operations: [],
      createdAt: now,
    })

    return { version: newVersion }
  },
})

// コラボレーター追加
export const addCollaborator = mutation({
  args: {
    documentId: v.id('documents'),
    userId: v.id('users'),
    permission: v.union(v.literal('edit'), v.literal('comment'), v.literal('view')),
  },
  handler: async (ctx, { documentId, userId, permission }) => {
    const document = await ctx.db.get(documentId)
    if (!document) {
      throw new Error('Document not found')
    }

    // コラボレーターリストに追加
    const collaborators = [...new Set([...document.collaborators, userId])]
    
    // 権限を更新
    const permissions = { ...document.permissions }
    switch (permission) {
      case 'edit':
        permissions.canEdit = [...new Set([...permissions.canEdit, userId])]
        permissions.canComment = [...new Set([...permissions.canComment, userId])]
        permissions.canView = [...new Set([...permissions.canView, userId])]
        break
      case 'comment':
        permissions.canComment = [...new Set([...permissions.canComment, userId])]
        permissions.canView = [...new Set([...permissions.canView, userId])]
        break
      case 'view':
        permissions.canView = [...new Set([...permissions.canView, userId])]
        break
    }

    await ctx.db.patch(documentId, {
      collaborators,
      permissions,
      updatedAt: Date.now(),
    })
  },
})

// ドキュメント削除
export const deleteDocument = mutation({
  args: { id: v.id('documents') },
  handler: async (ctx, { id }) => {
    // 関連データも削除
    const operations = await ctx.db
      .query('operations')
      .withIndex('by_document', (q) => q.eq('documentId', id))
      .collect()
    
    const presence = await ctx.db
      .query('presence')
      .withIndex('by_document', (q) => q.eq('documentId', id))
      .collect()
    
    const comments = await ctx.db
      .query('comments')
      .withIndex('by_document', (q) => q.eq('documentId', id))
      .collect()
    
    const versions = await ctx.db
      .query('documentVersions')
      .withIndex('by_document', (q) => q.eq('documentId', id))
      .collect()

    // すべての関連データを削除
    await Promise.all([
      ...operations.map(op => ctx.db.delete(op._id)),
      ...presence.map(p => ctx.db.delete(p._id)),
      ...comments.map(c => ctx.db.delete(c._id)),
      ...versions.map(v => ctx.db.delete(v._id)),
    ])

    // ドキュメント本体を削除
    await ctx.db.delete(id)
  },
})

// ドキュメントバージョン履歴取得
export const getDocumentVersions = query({
  args: { documentId: v.id('documents') },
  handler: async (ctx, { documentId }) => {
    return await ctx.db
      .query('documentVersions')
      .withIndex('by_document', (q) => q.eq('documentId', documentId))
      .order('desc')
      .take(20) // 最新20バージョンまで
  },
})

// 特定バージョンの内容取得
export const getDocumentVersion = query({
  args: { 
    documentId: v.id('documents'),
    version: v.number(),
  },
  handler: async (ctx, { documentId, version }) => {
    const versionDoc = await ctx.db
      .query('documentVersions')
      .withIndex('by_version', (q) => 
        q.eq('documentId', documentId).eq('version', version)
      )
      .first()
    
    return versionDoc
  },
})