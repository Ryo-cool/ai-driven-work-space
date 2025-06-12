import { createTool } from '@mastra/core'
import { z } from 'zod'

// テキスト翻訳ツール
export const translateTool = createTool({
  id: 'translate-text',
  description: 'Translate text to a target language',
  inputSchema: z.object({
    text: z.string().describe('The text to translate'),
    targetLanguage: z.string().describe('Target language code (e.g., ja, en, es)'),
    sourceLanguage: z.string().optional().describe('Source language code'),
  }),
  outputSchema: z.object({
    translatedText: z.string(),
    confidence: z.number(),
  }),
  execute: async (context) => {
    const { text, targetLanguage, sourceLanguage } = context.context
    // ここで実際の翻訳処理を実装
    // 現在はプレースホルダー
    return {
      translatedText: `[${targetLanguage}] ${text}`,
      confidence: 0.9,
    }
  },
})

// テキスト要約ツール
export const summarizeTool = createTool({
  id: 'summarize-text',
  description: 'Create a concise summary of the given text',
  inputSchema: z.object({
    text: z.string().describe('The text to summarize'),
    maxLength: z.number().optional().describe('Maximum length of summary'),
    style: z.enum(['brief', 'detailed', 'bullet-points']).optional(),
  }),
  outputSchema: z.object({
    summary: z.string(),
    keyPoints: z.array(z.string()),
  }),
  execute: async (context) => {
    const { text, maxLength, style = 'brief' } = context.context
    // 要約処理の実装
    return {
      summary: `Summary of: ${text.substring(0, 50)}...`,
      keyPoints: ['Key point 1', 'Key point 2'],
    }
  },
})

// Mermaidダイアグラム生成ツール
export const generateMermaidTool = createTool({
  id: 'generate-mermaid',
  description: 'Convert text to Mermaid diagram format',
  inputSchema: z.object({
    text: z.string().describe('The text to convert'),
    diagramType: z.enum(['mindmap', 'flowchart', 'sequence', 'gantt']).optional(),
  }),
  outputSchema: z.object({
    mermaidCode: z.string(),
    diagramType: z.string(),
  }),
  execute: async (context) => {
    const { text, diagramType = 'mindmap' } = context.context
    // Mermaidダイアグラム生成の実装
    const lines = text.split('\n').filter((line: string) => line.trim())
    
    if (diagramType === 'mindmap') {
      let mermaidCode = 'graph TD\n'
      const mainTopic = lines[0] || 'Main Topic'
      mermaidCode += `    A[${mainTopic}]\n`
      
      lines.slice(1, 5).forEach((line: string, index: number) => {
        const nodeId = String.fromCharCode(66 + index) // B, C, D, E
        mermaidCode += `    A --> ${nodeId}[${line}]\n`
      })
      
      return {
        mermaidCode,
        diagramType: 'mindmap',
      }
    }
    
    // 他のダイアグラムタイプのプレースホルダー
    return {
      mermaidCode: `graph TD\n    A[${text.substring(0, 30)}...]`,
      diagramType,
    }
  },
})

// スライド生成ツール
export const generateSlidesTool = createTool({
  id: 'generate-slides',
  description: 'Convert text content into slide format',
  inputSchema: z.object({
    text: z.string().describe('The text to convert to slides'),
    slidesCount: z.number().optional().describe('Number of slides to generate'),
    format: z.enum(['markdown', 'reveal', 'pptx']).optional(),
  }),
  outputSchema: z.object({
    slides: z.array(z.object({
      title: z.string(),
      content: z.string(),
      notes: z.string().optional(),
    })),
    format: z.string(),
  }),
  execute: async (context) => {
    const { text, slidesCount = 3, format = 'markdown' } = context.context
    const sections = text.split('\n\n').filter((s: string) => s.trim())
    const slides = []
    
    // タイトルスライド
    slides.push({
      title: sections[0]?.split('\n')[0] || 'Presentation',
      content: sections[0] || '',
      notes: 'Introduction slide',
    })
    
    // コンテンツスライド
    for (let i = 1; i < Math.min(sections.length, slidesCount); i++) {
      slides.push({
        title: `Slide ${i + 1}`,
        content: sections[i],
        notes: '',
      })
    }
    
    // まとめスライド
    slides.push({
      title: 'Summary',
      content: 'Key takeaways from this presentation',
      notes: 'Conclusion',
    })
    
    return { slides, format }
  },
})

// エクスポート
export const textProcessingTools = [
  translateTool,
  summarizeTool,
  generateMermaidTool,
  generateSlidesTool,
]