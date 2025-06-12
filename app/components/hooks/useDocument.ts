'use client'

import { useQuery, useMutation } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { Id } from '@/convex/_generated/dataModel'
import { useCallback, useEffect } from 'react'

export function useDocument(documentId: Id<'documents'>, userId: Id<'users'>) {
  // Document queries and mutations
  const document = useQuery(api.documents.getDocument, { documentId })
  const updateContent = useMutation(api.documents.updateContent)
  const updateTitle = useMutation(api.documents.updateTitle)
  
  // Collaboration queries and mutations
  const updatePresence = useMutation(api.collaboration.updatePresence)
  const sendOperation = useMutation(api.collaboration.sendOperation)
  
  // Update user presence
  const updateUserPresence = useCallback(async (
    cursorPosition: number,
    selectionStart?: number,
    selectionEnd?: number
  ) => {
    try {
      await updatePresence({
        documentId,
        userId,
        cursorPosition,
        selectionStart,
        selectionEnd,
        isActive: true
      })
    } catch (error) {
      console.error('Failed to update presence:', error)
    }
  }, [documentId, userId, updatePresence])

  // Send operation for real-time collaboration
  const sendCollaborationOperation = useCallback(async (
    type: 'insert' | 'delete' | 'retain',
    position: number,
    content?: string,
    length?: number
  ) => {
    try {
      await sendOperation({
        documentId,
        userId,
        type,
        position,
        content,
        length
      })
    } catch (error) {
      console.error('Failed to send operation:', error)
    }
  }, [documentId, userId, sendOperation])

  // Update document content
  const updateDocumentContent = useCallback(async (content: string) => {
    try {
      await updateContent({
        documentId,
        content,
        userId
      })
    } catch (error) {
      console.error('Failed to update content:', error)
    }
  }, [documentId, userId, updateContent])

  // Update document title
  const updateDocumentTitle = useCallback(async (title: string) => {
    try {
      await updateTitle({
        documentId,
        title,
        userId
      })
    } catch (error) {
      console.error('Failed to update title:', error)
    }
  }, [documentId, userId, updateTitle])

  // Clean up presence on unmount
  useEffect(() => {
    return () => {
      updatePresence({
        documentId,
        userId,
        cursorPosition: 0,
        isActive: false
      }).catch(console.error)
    }
  }, [documentId, userId, updatePresence])

  return {
    document,
    updateDocumentContent,
    updateDocumentTitle,
    updateUserPresence,
    sendCollaborationOperation
  }
}