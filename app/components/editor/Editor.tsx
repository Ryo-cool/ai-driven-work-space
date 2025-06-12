'use client'

import { useEffect, useState, useRef } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import './editor.css'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import Collaboration from '@tiptap/extension-collaboration'
import CollaborationCursor from '@tiptap/extension-collaboration-cursor'
import Underline from '@tiptap/extension-underline'
import { useQuery, useMutation, useAction } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { Id } from '@/convex/_generated/dataModel'
import { AICommandExtension, createAICommandSuggestion } from './extensions/AICommandExtension'
import { createAICommands, AICommand } from './ai-commands'
import Toolbar from './Toolbar'
import { useConvexYjsProvider } from './providers/ConvexYjsProvider'

interface EditorProps {
  documentId: Id<'documents'>
  userId: Id<'users'>
}

// ユーザー色の生成
const getUserColor = (userId: string) => {
  const colors = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#F7DC6F', 
    '#BB8FCE', '#85C1F2', '#F8B400', '#52C41A'
  ]
  let hash = 0
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash)
  }
  return colors[Math.abs(hash) % colors.length]
}

export default function Editor({ documentId, userId }: EditorProps) {
  const [isConnected, setIsConnected] = useState(false)
  const [collaborationReady, setCollaborationReady] = useState(false)
  const [isAIProcessing, setIsAIProcessing] = useState(false)
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  
  const document = useQuery(api.documents.getDocument, { id: documentId })
  const updateContent = useMutation(api.documents.updateContent)
  const user = useQuery(api.users.getUserById, { userId })
  const processAICommand = useAction(api.ai.processAICommand)
  
  // Y.js統合
  const { ydoc, provider, connected } = useConvexYjsProvider(documentId, userId)

  useEffect(() => {
    setIsConnected(connected)
  }, [connected])

  // AI処理関数
  const processAI = async (params: {
    type: 'translate' | 'summarize' | 'expand' | 'improve' | 'code' | 'fix'
    selectedText: string
    context?: string
    provider?: 'openai' | 'anthropic'
  }) => {
    setIsAIProcessing(true)
    try {
      const result = await processAICommand(params)
      return result
    } finally {
      setIsAIProcessing(false)
    }
  }

  // AI コマンドを実際のAPI呼び出し付きで作成
  const aiCommands = createAICommands(processAI)

  const handleAICommand = async (command: AICommand) => {
    const { from, to } = editor?.state.selection || { from: 0, to: 0 }
    const selectedText = editor?.state.doc.textBetween(from, to, ' ') || ''
    
    if (!selectedText.trim()) {
      // 選択テキストがない場合の処理
      editor?.chain().focus().insertContent('AIコマンドを使用するには、テキストを選択してください。').run()
      return
    }
    
    try {
      // AIコマンドの実行（ローディング状態付き）
      const result = await command.action(selectedText, document?.content)
      
      // 結果をエディタに挿入
      if (selectedText) {
        editor?.chain().focus().insertContentAt({ from, to }, result).run()
      } else {
        editor?.chain().focus().insertContent(result).run()
      }
    } catch (error) {
      console.error('AI command failed:', error)
      // エラーメッセージをエディタに表示
      const errorMessage = `❌ AIコマンドでエラーが発生しました: ${error instanceof Error ? error.message : '不明なエラー'}`
      editor?.chain().focus().insertContent(errorMessage).run()
    }
  }

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        // Collaborationを使う場合、履歴機能は無効にする
        history: false,
        heading: {
          levels: [1, 2, 3],
        },
      }),
      Placeholder.configure({
        placeholder: '入力を開始するか "/" でAIアシスタントを呼び出してください...',
        showOnlyWhenEditable: true,
        showOnlyCurrent: true,
      }),
      Underline,
      // Y.js Collaboration - ydocが存在する場合のみ追加
      ...(ydoc ? [
        Collaboration.configure({
          document: ydoc,
          // フィールド名を明示的に指定してデフォルトの競合を避ける
          field: 'default',
        }),
        // カーソル同期 - providerとawarenessが存在する場合のみ
        ...(provider?.awareness ? [
          CollaborationCursor.configure({
            provider: provider,
            user: {
              name: user?.name || 'Unknown User',
              color: getUserColor(userId),
            },
          }),
        ] : []),
      ] : []),
      AICommandExtension.configure({
        suggestion: createAICommandSuggestion(aiCommands, handleAICommand),
      }),
    ],
    onUpdate: ({ editor }) => {
      // 入力停止後2秒で保存（デバウンス）
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
      
      saveTimeoutRef.current = setTimeout(() => {
        const content = editor.getHTML()
        if (content && content !== document?.content && content !== '<p></p>') {
          updateContent({
            documentId,
            content,
            userId,
          }).catch(console.error)
        }
      }, 2000)
    },
    onCreate: () => {
      setCollaborationReady(true)
    },
  }, [ydoc, provider, user])

  // 定期的にドキュメント内容をConvexに保存（バックアップ目的）
  useEffect(() => {
    if (!editor || !collaborationReady) return

    const saveInterval = setInterval(() => {
      const content = editor.getHTML()
      // 内容が実際に変更されており、空でない場合のみ保存
      if (content && content !== document?.content && content !== '<p></p>') {
        updateContent({
          documentId,
          content,
          userId,
        }).catch(console.error)
      }
    }, 10000) // 10秒ごとに保存（よりリアルタイムに）

    return () => clearInterval(saveInterval)
  }, [editor, collaborationReady, document?.content, documentId, userId, updateContent])

  // ページ離脱時の保存
  useEffect(() => {
    if (!editor || !collaborationReady) return

    const handleBeforeUnload = () => {
      const content = editor.getHTML()
      if (content && content !== document?.content && content !== '<p></p>') {
        updateContent({
          documentId,
          content,
          userId,
        }).catch(console.error)
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [editor, collaborationReady, document?.content, documentId, userId, updateContent])

  // 初期コンテンツの復元（Y.jsが空で、Convexに保存された内容がある場合）
  useEffect(() => {
    if (editor && document?.content && collaborationReady && ydoc) {
      // エディタの現在の内容をチェック
      const currentContent = editor.getHTML()
      const isEmpty = currentContent === '<p></p>' || currentContent === '' || 
                     currentContent.replace(/<[^>]*>/g, '').trim() === ''
      
      // エディタが空で、Convexに保存された内容がある場合に復元
      if (isEmpty && document.content && document.content !== '<p></p>') {
        editor.commands.setContent(document.content)
      }
    }
  }, [editor, document?.content, collaborationReady, ydoc])

  if (!document || !ydoc || !editor) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-pulse text-gray-500">読み込み中...</div>
      </div>
    )
  }

  return (
    <div className="w-full h-full bg-white rounded-lg shadow-sm flex flex-col">
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200">
        <Toolbar editor={editor} />
        <div className="flex items-center space-x-4">
          {isAIProcessing && (
            <div className="flex items-center space-x-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
              <span className="text-sm text-blue-600">AI処理中...</span>
            </div>
          )}
          <div className="flex items-center space-x-2">
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
            <span className="text-sm text-gray-500">
              {isConnected ? 'オンライン' : 'オフライン'}
            </span>
          </div>
        </div>
      </div>
      <div className="w-full flex-1 overflow-y-auto">
        <EditorContent 
          editor={editor} 
          className="editor-content"
        />
      </div>
    </div>
  )
}