'use client'

import { useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { Id } from '@/convex/_generated/dataModel'
import Editor from '@/app/components/editor/Editor'
import Presence from '@/app/components/editor/Presence'
import { useParams } from 'next/navigation'
import { useState, useEffect } from 'react'

export default function WorkspacePage() {
  const params = useParams()
  const documentId = params.id as Id<'documents'>
  
  // TODO: 実際のユーザー認証システムと連携
  // ブラウザセッションごとに異なるユーザーIDを生成（リアルタイムテスト用）
  const [userId, setUserId] = useState<Id<'users'> | null>(null)
  
  useEffect(() => {
    // ローカルストレージから既存のユーザーIDを取得、なければ新規作成
    let sessionUserId = localStorage.getItem('workspace-user-id')
    
    // 確実に存在するテストユーザーIDリスト
    const validTestUserIds = [
      'k1736hzn08snv56mx15z7v5jh57hp1gd', // テストユーザー1（元のテストユーザー）
      'k170cwpf4ejkbnt1kp73vszyn97hq8s1', // テストユーザー2（実際に作成済み）
      'k17ej6fec0376pctpj0bep2w497hqkcq', // テストユーザー3（実際に作成済み）
    ]
    
    if (!sessionUserId || !validTestUserIds.includes(sessionUserId)) {
      // 新規生成またはinvalidなIDの場合
      sessionUserId = validTestUserIds[Math.floor(Math.random() * validTestUserIds.length)]
      localStorage.setItem('workspace-user-id', sessionUserId)
    }
    
    setUserId(sessionUserId as Id<'users'>)
  }, [])
  
  const document = useQuery(api.documents.getDocument, { id: documentId })

  if (!document || !userId) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-500">
            {!document ? 'ドキュメントを読み込み中...' : 'ユーザーセッションを初期化中...'}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-6 flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900">{document.title}</h1>
          <div className="flex items-center space-x-4">
            <Presence documentId={documentId} currentUserId={userId} />
            <button
              onClick={() => {
                localStorage.removeItem('workspace-user-id')
                window.location.reload()
              }}
              className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200"
              title="新しいユーザーIDでリロード"
            >
              新ユーザーでテスト
            </button>
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-lg overflow-hidden" style={{ height: 'calc(100vh - 200px)' }}>
          <Editor documentId={documentId} userId={userId} />
        </div>
      </div>
    </div>
  )
}