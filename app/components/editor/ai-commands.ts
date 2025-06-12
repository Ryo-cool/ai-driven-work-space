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
}

export const AI_COMMANDS: AICommand[] = [
  {
    id: 'translate',
    name: '翻譯',
    description: '將選中文字翻譯成其他語言',
    icon: Languages,
    action: async (text) => {
      // TODO: 實際 API 調用
      return `Translated: ${text}`
    }
  },
  {
    id: 'summarize',
    name: '摘要',
    description: '生成選中內容的簡潔摘要',
    icon: FileText,
    action: async (text) => {
      // TODO: 實際 API 調用
      return `Summary: ${text.substring(0, 50)}...`
    }
  },
  {
    id: 'expand',
    name: '擴展',
    description: '為選中內容添加更多細節',
    icon: Sparkles,
    action: async (text) => {
      // TODO: 實際 API 調用
      return `${text}\n\n[Expanded content here...]`
    }
  },
  {
    id: 'improve',
    name: '改進',
    description: '改善文字的清晰度和流暢性',
    icon: MessageSquare,
    action: async (text) => {
      // TODO: 實際 API 調用
      return `Improved: ${text}`
    }
  },
  {
    id: 'code',
    name: '程式碼',
    description: '根據描述生成程式碼',
    icon: Code,
    action: async (text) => {
      // TODO: 實際 API 調用
      return `\`\`\`javascript\n// Generated code for: ${text}\nconsole.log('Hello World');\n\`\`\``
    }
  },
  {
    id: 'fix',
    name: '修正',
    description: '修正拼寫和語法錯誤',
    icon: CheckCircle,
    action: async (text) => {
      // TODO: 實際 API 調用
      return `Fixed: ${text}`
    }
  }
]

export function searchCommands(query: string): AICommand[] {
  const lowerQuery = query.toLowerCase()
  return AI_COMMANDS.filter(command => 
    command.name.toLowerCase().includes(lowerQuery) ||
    command.description.toLowerCase().includes(lowerQuery) ||
    command.id.toLowerCase().includes(lowerQuery)
  )
}