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
  const [aiProgress, setAiProgress] = useState(0)
  const [aiProgressMessage, setAiProgressMessage] = useState('')
  const [, setStreamingResult] = useState('')
  const [aiCommandInProgress, setAiCommandInProgress] = useState<string | null>(null)
  const [pendingAIResult, setPendingAIResult] = useState<{
    result: string
    originalText: string
    range: { from: number; to: number }
    command: string
  } | null>(null)
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

  // ストリーミング風プログレス表示のシミュレーション
  const simulateStreamingProgress = async (commandType: string) => {
    setAiProgress(0)
    setAiProgressMessage('AI処理を開始しています...')
    setStreamingResult('')
    
    const progressSteps = [
      { progress: 10, message: 'テキストを分析中...' },
      { progress: 25, message: 'コンテキストを理解中...' },
      { progress: 40, message: `${commandType}処理を実行中...` },
      { progress: 60, message: 'AI応答を生成中...' },
      { progress: 80, message: '結果を最適化中...' },
      { progress: 95, message: '最終調整中...' },
      { progress: 100, message: '完了' }
    ]
    
    for (const step of progressSteps) {
      await new Promise(resolve => setTimeout(resolve, 300 + Math.random() * 400))
      setAiProgress(step.progress)
      setAiProgressMessage(step.message)
      
      // 段階的に結果のプレビューを表示（シミュレーション）
      if (step.progress > 40 && step.progress < 100) {
        const dots = '.'.repeat(Math.floor((step.progress - 40) / 10))
        setStreamingResult(`処理中${dots}`)
      }
    }
  }

  // AI処理関数
  const processAI = async (params: {
    type: 'translate' | 'summarize' | 'expand' | 'improve' | 'code' | 'fix'
    selectedText: string
    context?: string
    provider?: 'openai' | 'anthropic'
  }) => {
    setIsAIProcessing(true)
    setAiCommandInProgress(params.type)
    
    try {
      // ストリーミング風プログレス表示を開始
      const progressPromise = simulateStreamingProgress(params.type)
      
      // 実際のAI処理
      const resultPromise = processAICommand(params)
      
      // 両方の処理を並行実行
      const [, result] = await Promise.all([progressPromise, resultPromise])
      
      return result
    } finally {
      setIsAIProcessing(false)
      setAiCommandInProgress(null)
      setAiProgress(0)
      setAiProgressMessage('')
      setStreamingResult('')
    }
  }

  // AI コマンドを実際のAPI呼び出し付きで作成
  const aiCommands = createAICommands(processAI)

  // 強化されたコンテキスト情報を生成
  const generateEnhancedContext = (from: number, to: number): string => {
    if (!editor || !document?.content) return ''
    
    const fullText = editor.getText()
    const selectedText = editor.state.doc.textBetween(from, to, ' ')
    
    // 前後文脈を取得（選択範囲の前後200文字ずつ）
    const beforeStart = Math.max(0, from - 200)
    const afterEnd = Math.min(fullText.length, to + 200)
    
    const beforeText = editor.state.doc.textBetween(beforeStart, from, ' ')
    const afterText = editor.state.doc.textBetween(to, afterEnd, ' ')
    
    // ドキュメントタイプの推定
    const documentType = estimateDocumentType(fullText)
    
    // 主要言語の検出
    const primaryLanguage = detectPrimaryLanguage(fullText)
    
    // 専門分野の推定
    const domain = estimateDomain(fullText)
    
    const contextInfo = {
      documentType,
      primaryLanguage,
      domain,
      documentTitle: document?.title || '',
      selectedText,
      beforeText: beforeText.slice(-100), // 直前100文字
      afterText: afterText.slice(0, 100),  // 直後100文字
      fullTextLength: fullText.length,
      selectionPosition: `${from}-${to}/${fullText.length}`,
    }
    
    return JSON.stringify(contextInfo, null, 2)
  }

  // ドキュメントタイプ推定
  const estimateDocumentType = (text: string): string => {
    if (text.includes('```') || text.includes('function') || text.includes('const ')) return 'code'
    if (text.includes('# ') || text.includes('## ')) return 'markdown'
    if (text.includes('・') || text.includes('1.') || text.includes('（')) return 'japanese-document'
    if (text.includes('- ') || text.includes('* ')) return 'list'
    return 'general'
  }

  // 主要言語検出
  const detectPrimaryLanguage = (text: string): string => {
    const japaneseChars = (text.match(/[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/g) || []).length
    const totalChars = text.length
    const japaneseRatio = japaneseChars / totalChars
    
    if (japaneseRatio > 0.3) return 'japanese'
    if (text.match(/[a-zA-Z]/g)?.length || 0 > totalChars * 0.5) return 'english'
    return 'mixed'
  }

  // 専門分野推定
  const estimateDomain = (text: string): string => {
    const techKeywords = ['API', 'React', 'TypeScript', 'function', 'const', 'interface']
    const businessKeywords = ['会議', '資料', '企画', 'プロジェクト', '提案']
    const academicKeywords = ['研究', '論文', '分析', '考察', '結論']
    
    const hasTech = techKeywords.some(keyword => text.includes(keyword))
    const hasBusiness = businessKeywords.some(keyword => text.includes(keyword))
    const hasAcademic = academicKeywords.some(keyword => text.includes(keyword))
    
    if (hasTech) return 'technology'
    if (hasBusiness) return 'business'
    if (hasAcademic) return 'academic'
    return 'general'
  }

  // Y.js対応のトランザクション実行
  const executeTransactionSafely = (callback: () => void) => {
    if (!ydoc || !editor) {
      callback()
      return
    }
    
    // Y.jsトランザクション内で変更を実行
    ydoc.transact(callback)
  }

  // AI結果の受け入れ
  const acceptAIResult = () => {
    if (!pendingAIResult || !editor) return
    
    const { result, range } = pendingAIResult
    
    executeTransactionSafely(() => {
      editor.chain().focus().insertContentAt(range, result).run()
    })
    
    setPendingAIResult(null)
  }

  // AI結果の拒否
  const rejectAIResult = () => {
    if (!pendingAIResult || !editor) return
    
    const { originalText, range } = pendingAIResult
    
    executeTransactionSafely(() => {
      editor.chain().focus().insertContentAt(range, originalText).run()
    })
    
    setPendingAIResult(null)
  }

  const handleAICommand = async (command: AICommand) => {
    const { from, to } = editor?.state.selection || { from: 0, to: 0 }
    const selectedText = editor?.state.doc.textBetween(from, to, ' ') || ''
    
    if (!selectedText.trim()) {
      // 選択テキストがない場合の処理
      editor?.chain().focus().insertContent('AIコマンドを使用するには、テキストを選択してください。').run()
      return
    }
    
    try {
      // 強化されたコンテキスト情報を生成
      const enhancedContext = generateEnhancedContext(from, to)
      
      // AIコマンドの実行（強化されたコンテキスト付き）
      const result = await command.action(selectedText, enhancedContext)
      
      // 結果が成功した場合
      if (result?.success && result?.content) {
        // Y.jsトランザクション内で一時的に結果をプレビュー表示
        executeTransactionSafely(() => {
          editor?.chain().focus().insertContentAt({ from, to }, result.content || '').run()
        })
        
        // 受け入れ/拒否のための状態を保存
        setPendingAIResult({
          result: result.content,
          originalText: selectedText,
          range: { from, to },
          command: command.name
        })
      } else {
        // エラーの場合は直接エラーメッセージを表示
        const errorMessage = `❌ ${command.name}でエラーが発生しました: ${result?.error || '処理に失敗しました'}`
        editor?.chain().focus().insertContent(errorMessage).run()
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
            <div className="flex items-center space-x-3 bg-blue-50 px-3 py-2 rounded-lg border border-blue-200">
              <div className="flex items-center space-x-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-blue-800">
                    {aiCommandInProgress ? `/${aiCommandInProgress}` : 'AI処理中'}
                  </span>
                  <span className="text-xs text-blue-600">
                    {aiProgressMessage}
                  </span>
                </div>
              </div>
              {aiProgress > 0 && (
                <div className="flex items-center space-x-2">
                  <div className="w-16 bg-blue-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${aiProgress}%` }}
                    ></div>
                  </div>
                  <span className="text-xs text-blue-600 font-mono">
                    {aiProgress}%
                  </span>
                </div>
              )}
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
      <div className="w-full flex-1 overflow-y-auto relative">
        <EditorContent 
          editor={editor} 
          className="editor-content"
        />
        
        {/* AI結果受け入れ/拒否UI */}
        {pendingAIResult && (
          <div className="absolute bottom-4 right-4 bg-white border border-gray-300 rounded-lg shadow-lg p-4 max-w-sm">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
                <span className="text-sm font-medium text-gray-700">
                  {pendingAIResult.command}の結果
                </span>
              </div>
              <button
                onClick={rejectAIResult}
                className="text-gray-400 hover:text-gray-600 text-lg leading-none"
                title="拒否"
              >
                ×
              </button>
            </div>
            
            <div className="text-xs text-gray-500 mb-3 border-l-2 border-blue-200 pl-2">
              <div className="mb-1">
                <span className="font-medium">元のテキスト:</span>
              </div>
              <div className="bg-red-50 p-2 rounded text-red-700 mb-2 max-h-20 overflow-y-auto">
                {pendingAIResult.originalText}
              </div>
              <div className="mb-1">
                <span className="font-medium">AI結果:</span>
              </div>
              <div className="bg-green-50 p-2 rounded text-green-700 max-h-20 overflow-y-auto">
                {pendingAIResult.result}
              </div>
            </div>
            
            <div className="flex space-x-2">
              <button
                onClick={acceptAIResult}
                className="flex-1 bg-green-500 hover:bg-green-600 text-white text-sm py-2 px-3 rounded-md font-medium transition-colors"
              >
                ✓ 承認
              </button>
              <button
                onClick={rejectAIResult}
                className="flex-1 bg-gray-500 hover:bg-gray-600 text-white text-sm py-2 px-3 rounded-md font-medium transition-colors"
              >
                ↶ 元に戻す
              </button>
            </div>
            
            <div className="mt-2 text-xs text-gray-400 text-center">
              Ctrl+Z でundo、Ctrl+Y でredo可能
            </div>
          </div>
        )}
      </div>
    </div>
  )
}