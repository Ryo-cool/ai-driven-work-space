import { 
  Languages, 
  FileText, 
  Sparkles, 
  Code, 
  CheckCircle,
  MessageSquare
} from 'lucide-react'

export interface AICommand {
  id: string
  name: string
  description: string
  icon: typeof Languages
  action: (selectedText: string, context?: string) => Promise<string>
  type: 'translate' | 'summarize' | 'expand' | 'improve' | 'code' | 'fix'
}

// AI処理関数を受け取るファクトリー関数
type ProcessAIFunction = (params: {
  type: 'translate' | 'summarize' | 'expand' | 'improve' | 'code' | 'fix'
  selectedText: string
  context?: string
  provider?: 'openai' | 'anthropic'
}) => Promise<{ success: boolean; content?: string; error?: string }>

export function createAICommands(processAI: ProcessAIFunction): AICommand[] {
  return [
    {
      id: 'translate',
      name: '翻訳',
      description: '選択したテキストを他の言語に翻訳',
      icon: Languages,
      type: 'translate',
      action: async (text, context) => {
        try {
          const result = await processAI({
            type: 'translate',
            selectedText: text,
            context,
            provider: 'openai'
          })
          
          if (result.success) {
            return result.content || ''
          } else {
            throw new Error(result.error || '翻訳に失敗しました')
          }
        } catch (error) {
          console.error('Translation failed:', error)
          throw new Error('翻訳に失敗しました。後でもう一度お試しください。')
        }
      }
    },
    {
      id: 'summarize',
      name: '要約',
      description: '選択したコンテンツの簡潔な要約を生成',
      icon: FileText,
      type: 'summarize',
      action: async (text, context) => {
        try {
          const result = await processAI({
            type: 'summarize',
            selectedText: text,
            context,
            provider: 'openai'
          })
          
          if (result.success) {
            return result.content || ''
          } else {
            throw new Error(result.error || '要約に失敗しました')
          }
        } catch (error) {
          console.error('Summarization failed:', error)
          throw new Error('要約に失敗しました。後でもう一度お試しください。')
        }
      }
    },
    {
      id: 'expand',
      name: '拡張',
      description: '選択したコンテンツにより詳細な情報を追加',
      icon: Sparkles,
      type: 'expand',
      action: async (text, context) => {
        try {
          const result = await processAI({
            type: 'expand',
            selectedText: text,
            context,
            provider: 'openai'
          })
          
          if (result.success) {
            return result.content || ''
          } else {
            throw new Error(result.error || '拡張に失敗しました')
          }
        } catch (error) {
          console.error('Expansion failed:', error)
          throw new Error('拡張に失敗しました。後でもう一度お試しください。')
        }
      }
    },
    {
      id: 'improve',
      name: '改善',
      description: 'テキストの明瞭性と流暢性を改善',
      icon: MessageSquare,
      type: 'improve',
      action: async (text, context) => {
        try {
          const result = await processAI({
            type: 'improve',
            selectedText: text,
            context,
            provider: 'openai'
          })
          
          if (result.success) {
            return result.content || ''
          } else {
            throw new Error(result.error || '改善に失敗しました')
          }
        } catch (error) {
          console.error('Improvement failed:', error)
          throw new Error('改善に失敗しました。後でもう一度お試しください。')
        }
      }
    },
    {
      id: 'code',
      name: 'コード生成',
      description: '説明に基づいてコードを生成',
      icon: Code,
      type: 'code',
      action: async (text, context) => {
        try {
          const result = await processAI({
            type: 'code',
            selectedText: text,
            context,
            provider: 'openai'
          })
          
          if (result.success) {
            return result.content || ''
          } else {
            throw new Error(result.error || 'コード生成に失敗しました')
          }
        } catch (error) {
          console.error('Code generation failed:', error)
          throw new Error('コード生成に失敗しました。後でもう一度お試しください。')
        }
      }
    },
    {
      id: 'fix',
      name: '修正',
      description: 'スペルと文法エラーを修正',
      icon: CheckCircle,
      type: 'fix',
      action: async (text, context) => {
        try {
          const result = await processAI({
            type: 'fix',
            selectedText: text,
            context,
            provider: 'openai'
          })
          
          if (result.success) {
            return result.content || ''
          } else {
            throw new Error(result.error || '修正に失敗しました')
          }
        } catch (error) {
          console.error('Fix failed:', error)
          throw new Error('修正に失敗しました。後でもう一度お試しください。')
        }
      }
    }
  ]
}

export function searchCommands(commands: AICommand[], query: string): AICommand[] {
  const lowerQuery = query.toLowerCase()
  return commands.filter(command => 
    command.name.toLowerCase().includes(lowerQuery) ||
    command.description.toLowerCase().includes(lowerQuery) ||
    command.id.toLowerCase().includes(lowerQuery)
  )
}

// 後方互換性のため、デフォルトのプレースホルダー版も保持
export const AI_COMMANDS: AICommand[] = createAICommands(() => Promise.resolve({
  success: true,
  content: 'AI機能を有効にするには、API キーを設定してください。'
}))