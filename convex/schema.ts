import { defineSchema, defineTable } from 'convex/server'
import { v } from 'convex/values'

export default defineSchema({
  documents: defineTable({
    title: v.string(),
    content: v.string(),
    authorId: v.string(),
    collaborators: v.array(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  }),

  operations: defineTable({
    documentId: v.id('documents'),
    userId: v.string(),
    type: v.union(
      v.literal('insert'),
      v.literal('delete'),
      v.literal('retain')
    ),
    position: v.number(),
    content: v.optional(v.string()),
    timestamp: v.number(),
  }),

  presence: defineTable({
    documentId: v.id('documents'),
    userId: v.string(),
    cursor: v.object({
      position: v.number(),
      selection: v.optional(
        v.object({
          start: v.number(),
          end: v.number(),
        })
      ),
    }),
    lastSeen: v.number(),
  }),
})