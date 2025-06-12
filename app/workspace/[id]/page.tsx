'use client'

import { useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { Id } from '@/convex/_generated/dataModel'
import Editor from '@/app/components/editor/Editor'
import Presence from '@/app/components/editor/Presence'
import { useParams } from 'next/navigation'

export default function WorkspacePage() {
  const params = useParams()
  const documentId = params.id as Id<'documents'>
  
  // TODO: 実際のユーザー認証システムと連携
  // 暫定的にテストユーザーIDを使用
  const userId = 'k173hg5x5xqwhp3gqcq1w67gzh6fepx1' as Id<'users'>
  
  const document = useQuery(api.documents.getDocument, { documentId })

  if (!document) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-500">載入文檔中...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-6 flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900">{document.title}</h1>
          <Presence documentId={documentId} currentUserId={userId} />
        </div>
        
        <div className="bg-white rounded-xl shadow-lg overflow-hidden" style={{ height: 'calc(100vh - 200px)' }}>
          <Editor documentId={documentId} userId={userId} />
        </div>
      </div>
    </div>
  )
}