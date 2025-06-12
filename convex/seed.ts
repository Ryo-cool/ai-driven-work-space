import { mutation } from './_generated/server'
import { v } from 'convex/values'

// 開発用のテストデータを作成
export const seedTestData = mutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now()
    
    // テストユーザーを作成
    const userId = await ctx.db.insert('users', {
      email: 'test@example.com',
      name: 'Test User',
      color: '#FF6B6B',
      preferences: {
        theme: 'light',
        aiAssistance: true,
        notifications: true,
      },
      createdAt: now,
      lastActive: now,
    })

    // テストワークスペースを作成
    const workspaceId = await ctx.db.insert('workspaces', {
      name: 'My Workspace',
      description: 'デフォルトワークスペース',
      ownerId: userId,
      members: [{
        userId: userId,
        role: 'owner',
        joinedAt: now,
      }],
      settings: {
        isPublic: false,
        allowGuests: true,
        aiEnabled: true,
        maxCollaborators: 50,
      },
      createdAt: now,
      updatedAt: now,
    })

    // サンプルドキュメントを作成
    const sampleDocId = await ctx.db.insert('documents', {
      title: 'はじめてのドキュメント',
      content: '<h1>AI ワークスペースへようこそ！</h1><p>このエディターでは以下のことができます：</p><ul><li>リアルタイム協調編集</li><li>AI アシスタント機能（<code>/</code> で呼び出し）</li><li>豊富なテキスト装飾</li></ul><p><strong>/</strong> を入力してAIコマンドを試してみてください！</p>',
      workspaceId,
      authorId: userId,
      collaborators: [userId],
      version: 1,
      status: 'published',
      metadata: {
        wordCount: 15,
        characterCount: 120,
        estimatedReadTime: 1,
        tags: ['サンプル', 'チュートリアル'],
      },
      permissions: {
        canEdit: [userId],
        canComment: [userId],
        canView: [userId],
      },
      createdAt: now,
      updatedAt: now,
      lastEditedBy: userId,
    })

    return {
      userId,
      workspaceId,
      sampleDocId,
      message: 'テストデータを作成しました！'
    }
  },
})

// 既存のテストデータを確認
export const getTestIds = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await ctx.db
      .query('users')
      .filter((q) => q.eq(q.field('email'), 'test@example.com'))
      .first()
    
    if (!user) return null

    const workspace = await ctx.db
      .query('workspaces')
      .filter((q) => q.eq(q.field('ownerId'), user._id))
      .first()

    return {
      userId: user._id,
      workspaceId: workspace?._id,
    }
  },
})