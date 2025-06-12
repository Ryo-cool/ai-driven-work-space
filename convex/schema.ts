import { defineSchema, defineTable } from 'convex/server'
import { v } from 'convex/values'

export default defineSchema({
  // ユーザー管理
  users: defineTable({
    name: v.string(),
    email: v.string(),
    avatar: v.optional(v.string()),
    color: v.string(), // プレゼンス表示用の色
    preferences: v.optional(v.object({
      theme: v.union(v.literal('light'), v.literal('dark')),
      aiAssistance: v.boolean(),
      notifications: v.boolean(),
    })),
    createdAt: v.number(),
    lastActive: v.number(),
  }).index('by_email', ['email']),

  // ワークスペース管理
  workspaces: defineTable({
    name: v.string(),
    description: v.optional(v.string()),
    ownerId: v.id('users'),
    members: v.array(v.object({
      userId: v.id('users'),
      role: v.union(v.literal('owner'), v.literal('admin'), v.literal('editor'), v.literal('viewer')),
      joinedAt: v.number(),
    })),
    settings: v.object({
      isPublic: v.boolean(),
      allowGuests: v.boolean(),
      aiEnabled: v.boolean(),
      maxCollaborators: v.number(),
    }),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index('by_owner', ['ownerId']),

  // ドキュメント管理（拡張版）
  documents: defineTable({
    title: v.string(),
    content: v.string(), // JSON形式のエディタ状態
    workspaceId: v.id('workspaces'),
    authorId: v.id('users'),
    collaborators: v.array(v.id('users')),
    version: v.number(), // バージョン管理
    status: v.union(
      v.literal('draft'),
      v.literal('published'),
      v.literal('archived')
    ),
    metadata: v.object({
      wordCount: v.number(),
      characterCount: v.number(),
      estimatedReadTime: v.number(),
      tags: v.array(v.string()),
    }),
    permissions: v.object({
      canEdit: v.array(v.id('users')),
      canComment: v.array(v.id('users')),
      canView: v.array(v.id('users')),
    }),
    createdAt: v.number(),
    updatedAt: v.number(),
    lastEditedBy: v.id('users'),
  })
    .index('by_workspace', ['workspaceId'])
    .index('by_author', ['authorId'])
    .index('by_status', ['status']),

  // Operational Transform操作（拡張版）
  operations: defineTable({
    documentId: v.id('documents'),
    userId: v.id('users'),
    type: v.union(
      v.literal('insert'),
      v.literal('delete'),
      v.literal('retain'),
      v.literal('format'), // フォーマット操作
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
    timestamp: v.number(),
    applied: v.boolean(), // 操作が適用されたかどうか
    conflictResolved: v.optional(v.boolean()),
  })
    .index('by_document', ['documentId'])
    .index('by_timestamp', ['timestamp']),

  // ユーザープレゼンス（拡張版）
  presence: defineTable({
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
    lastSeen: v.number(),
    isOnline: v.boolean(),
  })
    .index('by_document', ['documentId'])
    .index('by_user', ['userId']),

  // AI処理管理
  aiTasks: defineTable({
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
    input: v.object({
      selectedText: v.string(),
      context: v.optional(v.string()),
      position: v.number(),
      parameters: v.optional(v.any()),
    }),
    output: v.optional(v.object({
      result: v.string(),
      confidence: v.number(),
      suggestions: v.optional(v.array(v.string())),
    })),
    status: v.union(
      v.literal('pending'),
      v.literal('processing'),
      v.literal('completed'),
      v.literal('failed')
    ),
    progress: v.optional(v.number()), // 進行状況（0-100）
    progressMessage: v.optional(v.string()), // 進行状況メッセージ
    lastProgressUpdate: v.optional(v.number()), // 最後の進行状況更新時刻
    processingTime: v.optional(v.number()),
    errorMessage: v.optional(v.string()),
    retryCount: v.optional(v.number()), // リトライ回数
    createdAt: v.number(),
    completedAt: v.optional(v.number()),
  })
    .index('by_document', ['documentId'])
    .index('by_user', ['userId'])
    .index('by_status', ['status']),

  // コメントシステム
  comments: defineTable({
    documentId: v.id('documents'),
    authorId: v.id('users'),
    content: v.string(),
    position: v.object({
      start: v.number(),
      end: v.number(),
    }),
    thread: v.optional(v.id('comments')), // 返信の場合、親コメントのID
    resolved: v.boolean(),
    resolvedBy: v.optional(v.id('users')),
    resolvedAt: v.optional(v.number()),
    reactions: v.array(v.object({
      userId: v.id('users'),
      emoji: v.string(),
    })),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_document', ['documentId'])
    .index('by_thread', ['thread']),

  // バージョン履歴
  documentVersions: defineTable({
    documentId: v.id('documents'),
    version: v.number(),
    content: v.string(),
    summary: v.string(), // 変更内容の要約
    authorId: v.id('users'),
    changeType: v.union(
      v.literal('manual_save'),
      v.literal('auto_save'),
      v.literal('ai_edit'),
      v.literal('collaboration_merge')
    ),
    operations: v.array(v.id('operations')),
    createdAt: v.number(),
  })
    .index('by_document', ['documentId'])
    .index('by_version', ['documentId', 'version']),

  // セッション管理
  sessions: defineTable({
    userId: v.id('users'),
    documentId: v.id('documents'),
    startedAt: v.number(),
    endedAt: v.optional(v.number()),
    duration: v.optional(v.number()),
    operationCount: v.number(),
    aiTaskCount: v.number(),
    isActive: v.boolean(),
  })
    .index('by_user', ['userId'])
    .index('by_document', ['documentId'])
    .index('by_active', ['isActive']),

  // Y.js同期用更新データ
  yjsUpdates: defineTable({
    documentId: v.id('documents'),
    userId: v.id('users'),
    data: v.string(), // Base64エンコードされたY.js更新データ
    timestamp: v.number(),
    applied: v.boolean(), // 他のクライアントに適用済みかどうか
  })
    .index('by_document', ['documentId'])
    .index('by_timestamp', ['timestamp'])
    .index('by_document_timestamp', ['documentId', 'timestamp']),
})