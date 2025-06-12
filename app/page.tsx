'use client'

import { useState, useEffect } from 'react'
import { useMutation, useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { Id } from '@/convex/_generated/dataModel'
import Link from 'next/link'
import { Plus, FileText, Users, Clock } from 'lucide-react'

export default function HomePage() {
  const [isCreating, setIsCreating] = useState(false)
  const [testIds, setTestIds] = useState<{userId: Id<'users'>, workspaceId: Id<'workspaces'>} | null>(null)
  
  const seedTestData = useMutation(api.seed.seedTestData)
  const getTestIds = useMutation(api.seed.getTestIds)
  
  const createDocument = useMutation(api.documents.createDocument)
  const documents = useQuery(
    api.documents.listDocuments, 
    testIds ? { workspaceId: testIds.workspaceId, limit: 10 } : 'skip'
  )

  // 初期化時にテストデータを確認・作成
  useEffect(() => {
    const initializeData = async () => {
      try {
        const existingIds = await getTestIds()
        if (existingIds) {
          setTestIds(existingIds)
        } else {
          const result = await seedTestData()
          setTestIds({
            userId: result.userId,
            workspaceId: result.workspaceId
          })
        }
      } catch (error) {
        console.error('Failed to initialize test data:', error)
      }
    }
    
    initializeData()
  }, [seedTestData, getTestIds])

  const handleCreateDocument = async () => {
    if (!testIds) return
    
    setIsCreating(true)
    try {
      const newDoc = await createDocument({
        title: '無題のドキュメント',
        content: '',
        authorId: testIds.userId,
        workspaceId: testIds.workspaceId,
      })
      
      // 新しいドキュメントページへリダイレクト
      window.location.href = `/workspace/${newDoc}`
    } catch (error) {
      console.error('Failed to create document:', error)
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            AI駆動コラボレーションワークスペース
          </h1>
          <p className="text-lg text-gray-600">
            AIアシスタントを使ってリアルタイムで協力し、創造性を無限に広げよう
          </p>
        </div>

        <div className="mb-8">
          <button
            onClick={handleCreateDocument}
            disabled={isCreating || !testIds}
            className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg shadow-lg hover:bg-blue-700 transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus className="mr-2" size={20} />
            {isCreating ? '作成中...' : !testIds ? '初期化中...' : '新しいドキュメント'}
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {documents?.map((doc) => (
            <Link
              key={doc._id}
              href={`/workspace/${doc._id}`}
              className="block p-6 bg-white rounded-xl shadow-sm hover:shadow-lg transition-all transform hover:-translate-y-1"
            >
              <div className="flex items-start justify-between mb-4">
                <FileText className="text-blue-600" size={24} />
                <div className="flex items-center space-x-2 text-sm text-gray-500">
                  <Users size={16} />
                  <span>{doc.collaborators?.length || 0}</span>
                </div>
              </div>
              
              <h3 className="text-lg font-semibold text-gray-900 mb-2 truncate">
                {doc.title}
              </h3>
              
              <div className="flex items-center text-sm text-gray-500">
                <Clock size={14} className="mr-1" />
                <span>
                  {new Date(doc.updatedAt).toLocaleDateString('ja-JP')}
                </span>
              </div>
            </Link>
          ))}
        </div>

        {(!documents || documents.length === 0) && (
          <div className="text-center py-12">
            <FileText className="mx-auto text-gray-300 mb-4" size={64} />
            <p className="text-gray-500 text-lg">
              まだドキュメントがありません。上のボタンをクリックして最初のドキュメントを作成しましょう！
            </p>
          </div>
        )}
      </div>
    </div>
  )
}