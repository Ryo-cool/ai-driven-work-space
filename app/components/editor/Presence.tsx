'use client'

import { useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { Id } from '@/convex/_generated/dataModel'
import { useEffect, useState } from 'react'

interface PresenceProps {
  documentId: Id<'documents'>
  currentUserId: Id<'users'>
}

interface UserPresence {
  userId: Id<'users'>
  userName: string
  userAvatar?: string
  cursorPosition: number
  selectionStart?: number
  selectionEnd?: number
  color: string
}

const PRESENCE_COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#F7DC6F', 
  '#BB8FCE', '#85C1F2', '#F8B400', '#52C41A'
]

export default function Presence({ documentId, currentUserId }: PresenceProps) {
  const presenceData = useQuery(api.collaboration.getPresence, { documentId })
  const [activeUsers, setActiveUsers] = useState<UserPresence[]>([])

  useEffect(() => {
    if (presenceData) {
      const users = presenceData
        .filter(p => p.userId !== currentUserId && p.isOnline && p.activity !== 'idle')
        .map((presence, index) => ({
          userId: presence.userId,
          userName: presence.userId, // TODO: Get actual user name
          cursorPosition: presence.cursor.position,
          selectionStart: presence.cursor.selection?.start,
          selectionEnd: presence.cursor.selection?.end,
          color: PRESENCE_COLORS[index % PRESENCE_COLORS.length]
        }))
      setActiveUsers(users)
    }
  }, [presenceData, currentUserId])

  return (
    <div className="absolute top-4 right-4 flex items-center space-x-2">
      <div className="flex -space-x-2">
        {activeUsers.map((user) => (
          <div
            key={user.userId}
            className="relative group"
          >
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-white font-medium text-sm shadow-lg transition-transform hover:scale-110"
              style={{ backgroundColor: user.color }}
              title={user.userName}
            >
              {user.userName.charAt(0).toUpperCase()}
            </div>
            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
              {user.userName}
            </div>
          </div>
        ))}
      </div>
      {activeUsers.length > 0 && (
        <span className="text-sm text-gray-500 ml-2">
          {activeUsers.length}人が編集中
        </span>
      )}
    </div>
  )
}

export function CursorOverlay({ 
  users, 
  editorRef 
}: { 
  users: UserPresence[]
  editorRef: React.RefObject<HTMLDivElement> 
}) {
  const [cursors, setCursors] = useState<{ [key: string]: { x: number; y: number } }>({})

  useEffect(() => {
    if (!editorRef.current) return

    const updateCursorPositions = () => {
      const newCursors: { [key: string]: { x: number; y: number } } = {}
      
      users.forEach(user => {
        // TODO: Convert cursor position to x,y coordinates
        // This requires integration with the editor's position calculation
        newCursors[user.userId] = { x: 0, y: 0 }
      })
      
      setCursors(newCursors)
    }

    updateCursorPositions()
    const interval = setInterval(updateCursorPositions, 100)
    
    return () => clearInterval(interval)
  }, [users, editorRef])

  return (
    <div className="pointer-events-none absolute inset-0">
      {users.map(user => {
        const position = cursors[user.userId]
        if (!position) return null

        return (
          <div
            key={user.userId}
            className="absolute transition-all duration-100"
            style={{
              left: `${position.x}px`,
              top: `${position.y}px`,
            }}
          >
            <div
              className="w-0.5 h-5"
              style={{ backgroundColor: user.color }}
            />
            <div
              className="absolute -top-6 left-0 px-1.5 py-0.5 text-xs text-white rounded shadow-sm whitespace-nowrap"
              style={{ backgroundColor: user.color }}
            >
              {user.userName}
            </div>
          </div>
        )
      })}
    </div>
  )
}