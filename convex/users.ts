import { v } from 'convex/values'
import { mutation, query } from './_generated/server'
import { Doc, Id } from './_generated/dataModel'
import { api } from './_generated/api'

// ユーザー作成/取得
export const createOrGetUser = mutation({
  args: {
    email: v.string(),
    name: v.string(),
    avatar: v.optional(v.string()),
  },
  handler: async (ctx, { email, name, avatar }) => {
    // 既存ユーザーをチェック
    const existingUser = await ctx.db
      .query('users')
      .withIndex('by_email', (q) => q.eq('email', email))
      .first()

    if (existingUser) {
      // 最終アクティブ時刻を更新
      await ctx.db.patch(existingUser._id, {
        lastActive: Date.now(),
      })
      return existingUser._id
    }

    // 新規ユーザー作成
    const colors = ['#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899', '#f97316', '#84cc16']
    const randomColor = colors[Math.floor(Math.random() * colors.length)]
    
    const now = Date.now()
    const userId = await ctx.db.insert('users', {
      email,
      name,
      avatar,
      color: randomColor,
      preferences: {
        theme: 'light',
        aiAssistance: true,
        notifications: true,
      },
      createdAt: now,
      lastActive: now,
    })

    return userId
  },
})

// ユーザー情報取得
export const getUser = query({
  args: { id: v.id('users') },
  handler: async (ctx, { id }) => {
    return await ctx.db.get(id)
  },
})

// ユーザー設定更新
export const updateUserPreferences = mutation({
  args: {
    userId: v.id('users'),
    preferences: v.object({
      theme: v.union(v.literal('light'), v.literal('dark')),
      aiAssistance: v.boolean(),
      notifications: v.boolean(),
    }),
  },
  handler: async (ctx, { userId, preferences }) => {
    await ctx.db.patch(userId, {
      preferences,
      lastActive: Date.now(),
    })
  },
})

// ユーザーアクティビティ更新
export const updateUserActivity = mutation({
  args: { userId: v.id('users') },
  handler: async (ctx, { userId }) => {
    await ctx.db.patch(userId, {
      lastActive: Date.now(),
    })
  },
})

// ワークスペース作成
export const createWorkspace = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    ownerId: v.id('users'),
    settings: v.optional(v.object({
      isPublic: v.boolean(),
      allowGuests: v.boolean(),
      aiEnabled: v.boolean(),
      maxCollaborators: v.number(),
    })),
  },
  handler: async (ctx, { name, description, ownerId, settings }) => {
    const now = Date.now()
    
    const workspaceId = await ctx.db.insert('workspaces', {
      name,
      description,
      ownerId,
      members: [{
        userId: ownerId,
        role: 'owner',
        joinedAt: now,
      }],
      settings: settings || {
        isPublic: false,
        allowGuests: false,
        aiEnabled: true,
        maxCollaborators: 10,
      },
      createdAt: now,
      updatedAt: now,
    })

    return workspaceId
  },
})

// ワークスペース一覧取得（ユーザーが参加しているもの）
export const getUserWorkspaces = query({
  args: { userId: v.id('users') },
  handler: async (ctx, { userId }) => {
    const allWorkspaces = await ctx.db.query('workspaces').collect()
    
    return allWorkspaces.filter(workspace => 
      workspace.members.some(member => member.userId === userId)
    )
  },
})

// ワークスペース詳細取得
export const getWorkspace = query({
  args: { id: v.id('workspaces') },
  handler: async (ctx, { id }) => {
    return await ctx.db.get(id)
  },
})

// ワークスペースにメンバー追加
export const addWorkspaceMember = mutation({
  args: {
    workspaceId: v.id('workspaces'),
    userId: v.id('users'),
    role: v.union(v.literal('admin'), v.literal('editor'), v.literal('viewer')),
  },
  handler: async (ctx, { workspaceId, userId, role }) => {
    const workspace = await ctx.db.get(workspaceId)
    if (!workspace) {
      throw new Error('Workspace not found')
    }

    // 既存メンバーかチェック
    const existingMember = workspace.members.find(member => member.userId === userId)
    if (existingMember) {
      throw new Error('User is already a member')
    }

    const now = Date.now()
    const updatedMembers = [...workspace.members, {
      userId,
      role,
      joinedAt: now,
    }]

    await ctx.db.patch(workspaceId, {
      members: updatedMembers,
      updatedAt: now,
    })
  },
})

// ワークスペースメンバー権限更新
export const updateMemberRole = mutation({
  args: {
    workspaceId: v.id('workspaces'),
    userId: v.id('users'),
    role: v.union(v.literal('admin'), v.literal('editor'), v.literal('viewer')),
  },
  handler: async (ctx, { workspaceId, userId, role }) => {
    const workspace = await ctx.db.get(workspaceId)
    if (!workspace) {
      throw new Error('Workspace not found')
    }

    const updatedMembers = workspace.members.map(member =>
      member.userId === userId ? { ...member, role } : member
    )

    await ctx.db.patch(workspaceId, {
      members: updatedMembers,
      updatedAt: Date.now(),
    })
  },
})

// ワークスペースからメンバー削除
export const removeMemberFromWorkspace = mutation({
  args: {
    workspaceId: v.id('workspaces'),
    userId: v.id('users'),
  },
  handler: async (ctx, { workspaceId, userId }) => {
    const workspace = await ctx.db.get(workspaceId)
    if (!workspace) {
      throw new Error('Workspace not found')
    }

    // オーナーは削除できない
    const memberToRemove = workspace.members.find(member => member.userId === userId)
    if (memberToRemove?.role === 'owner') {
      throw new Error('Cannot remove workspace owner')
    }

    const updatedMembers = workspace.members.filter(member => member.userId !== userId)

    await ctx.db.patch(workspaceId, {
      members: updatedMembers,
      updatedAt: Date.now(),
    })
  },
})

// ワークスペース設定更新
export const updateWorkspaceSettings = mutation({
  args: {
    workspaceId: v.id('workspaces'),
    settings: v.object({
      isPublic: v.boolean(),
      allowGuests: v.boolean(),
      aiEnabled: v.boolean(),
      maxCollaborators: v.number(),
    }),
  },
  handler: async (ctx, { workspaceId, settings }) => {
    await ctx.db.patch(workspaceId, {
      settings,
      updatedAt: Date.now(),
    })
  },
})

// ワークスペース削除
export const deleteWorkspace = mutation({
  args: { workspaceId: v.id('workspaces') },
  handler: async (ctx, { workspaceId }) => {
    // ワークスペース内のドキュメント一覧取得
    const documents = await ctx.db
      .query('documents')
      .withIndex('by_workspace', (q) => q.eq('workspaceId', workspaceId))
      .collect()

    // 各ドキュメントを削除（関連データも含む）
    for (const document of documents) {
      await ctx.runMutation(api.documents.deleteDocument, { id: document._id })
    }

    // ワークスペース本体を削除
    await ctx.db.delete(workspaceId)
  },
})

// アクティブユーザー取得（最近アクティブなユーザー）
export const getActiveUsers = query({
  args: { 
    workspaceId: v.optional(v.id('workspaces')),
    timeRange: v.optional(v.number()), // ミリ秒
  },
  handler: async (ctx, { workspaceId, timeRange = 24 * 60 * 60 * 1000 }) => {
    const since = Date.now() - timeRange
    
    if (workspaceId) {
      const workspace = await ctx.db.get(workspaceId)
      if (!workspace) return []
      
      const memberIds = workspace.members.map(m => m.userId)
      const users = await Promise.all(
        memberIds.map(id => ctx.db.get(id))
      )
      
      return users
        .filter(user => user && user.lastActive > since)
        .filter(Boolean)
    }
    
    // すべてのアクティブユーザー
    const allUsers = await ctx.db.query('users').collect()
    return allUsers.filter(user => user.lastActive > since)
  },
})

// ユーザー情報取得
export const getUserById = query({
  args: { userId: v.id('users') },
  handler: async (ctx, { userId }) => {
    return await ctx.db.get(userId)
  },
})