import { z } from 'zod'

// カスタムツール型定義
interface CustomTool {
  id: string
  description: string
  inputSchema: z.ZodSchema<any>
  outputSchema: z.ZodSchema<any>
  execute: (input: any) => Promise<any>
}

// 翻訳ツールの実装
export const translateTool: CustomTool = {
  id: 'translate-text',
  description: 'Translate text to a target language with cultural awareness',
  inputSchema: z.object({
    text: z.string().describe('The text to translate'),
    targetLanguage: z.string().describe('Target language code (e.g., ja, en, es)'),
    sourceLanguage: z.string().optional().describe('Source language code (auto-detected if not provided)'),
    preserveFormatting: z.boolean().optional().describe('Preserve original formatting'),
    culturalContext: z.string().optional().describe('Additional cultural context'),
  }),
  outputSchema: z.object({
    translatedText: z.string(),
    confidence: z.number(),
    detectedSourceLanguage: z.string().optional(),
    culturalNotes: z.array(z.string()).optional(),
  }),
  execute: async ({ text, targetLanguage, sourceLanguage, preserveFormatting, culturalContext }) => {
    try {
      // 言語検証
      const supportedLanguages = ['ja', 'en', 'es', 'fr', 'de', 'zh', 'ko']
      if (!supportedLanguages.includes(targetLanguage)) {
        throw new Error(`Unsupported target language: ${targetLanguage}`)
      }
      
      // 実際の翻訳処理（AIプロバイダー呼び出し）
      const prompt = `
        Translate the following text from ${sourceLanguage || 'auto-detect'} to ${targetLanguage}.
        ${preserveFormatting ? 'Preserve the original formatting.' : ''}
        ${culturalContext ? `Cultural context: ${culturalContext}` : ''}
        
        Text to translate:
        ${text}
        
        Provide a natural, culturally appropriate translation.
      `
      
      // TODO: 実際のAI呼び出し実装
      // const result = await callAIProvider(prompt)
      
      return {
        translatedText: `[Translated to ${targetLanguage}]: ${text}`,
        confidence: 0.95,
        detectedSourceLanguage: sourceLanguage || 'en',
        culturalNotes: culturalContext ? ['Cultural adaptation applied'] : undefined,
      }
    } catch (error) {
      throw new Error(`Translation failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  },
}

// テキスト要約ツールの実装
export const summarizeTool: CustomTool = {
  id: 'summarize-text',
  description: 'Create a concise summary of the given text',
  inputSchema: z.object({
    text: z.string().describe('The text to summarize'),
    maxLength: z.number().optional().describe('Maximum length of summary in words'),
    style: z.enum(['brief', 'detailed', 'bullet-points']).optional().default('brief'),
    focusAreas: z.array(z.string()).optional().describe('Specific areas to focus on'),
  }),
  outputSchema: z.object({
    summary: z.string(),
    keyPoints: z.array(z.string()),
    wordCount: z.number(),
    readingTime: z.number().describe('Estimated reading time in minutes'),
  }),
  execute: async ({ text, maxLength, style, focusAreas }) => {
    try {
      // テキスト長の検証
      if (text.length < 50) {
        throw new Error('Text is too short to summarize')
      }
      
      const prompt = `
        Summarize the following text in ${style} style.
        ${maxLength ? `Maximum length: ${maxLength} words.` : ''}
        ${focusAreas ? `Focus on: ${focusAreas.join(', ')}` : ''}
        
        Text to summarize:
        ${text}
        
        Provide a clear, informative summary that captures the main points.
      `
      
      // TODO: 実際のAI呼び出し実装
      const summary = `Summary: ${text.substring(0, 100)}...`
      const keyPoints = ['Key point 1', 'Key point 2', 'Key point 3']
      
      return {
        summary,
        keyPoints,
        wordCount: summary.split(' ').length,
        readingTime: Math.ceil(summary.split(' ').length / 200),
      }
    } catch (error) {
      throw new Error(`Summarization failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  },
}

// Mermaidダイアグラム生成ツールの実装
export const generateMermaidTool: CustomTool = {
  id: 'generate-mermaid',
  description: 'Convert text to Mermaid diagram format',
  inputSchema: z.object({
    text: z.string().describe('The text to convert'),
    diagramType: z.enum(['mindmap', 'flowchart', 'sequence', 'gantt', 'class', 'er']).optional().default('mindmap'),
    theme: z.enum(['default', 'dark', 'forest', 'neutral']).optional().default('default'),
    direction: z.enum(['TB', 'BT', 'LR', 'RL']).optional().describe('Flow direction for flowcharts'),
  }),
  outputSchema: z.object({
    mermaidCode: z.string(),
    diagramType: z.string(),
    preview: z.string().optional(),
    complexity: z.number().describe('Diagram complexity score (0-1)'),
  }),
  execute: async ({ text, diagramType, theme, direction }) => {
    try {
      let mermaidCode = ''
      
      switch (diagramType) {
        case 'mindmap':
          mermaidCode = generateMindmap(text)
          break
        case 'flowchart':
          mermaidCode = generateFlowchart(text, direction || 'TB')
          break
        case 'sequence':
          mermaidCode = generateSequenceDiagram(text)
          break
        case 'gantt':
          mermaidCode = generateGanttChart(text)
          break
        case 'class':
          mermaidCode = generateClassDiagram(text)
          break
        case 'er':
          mermaidCode = generateERDiagram(text)
          break
      }
      
      return {
        mermaidCode,
        diagramType,
        preview: `Preview of ${diagramType} diagram`,
        complexity: calculateDiagramComplexity(mermaidCode),
      }
    } catch (error) {
      throw new Error(`Mermaid generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  },
}

// スライド生成ツールの実装
export const generateSlidesTool: CustomTool = {
  id: 'generate-slides',
  description: 'Convert text content into slide format',
  inputSchema: z.object({
    text: z.string().describe('The text to convert to slides'),
    slidesCount: z.number().optional().describe('Number of slides to generate (auto if not specified)'),
    format: z.enum(['markdown', 'reveal', 'pptx', 'google-slides']).optional().default('markdown'),
    theme: z.string().optional().describe('Slide theme name'),
    includeNotes: z.boolean().optional().default(true),
  }),
  outputSchema: z.object({
    slides: z.array(z.object({
      id: z.string(),
      title: z.string(),
      content: z.string(),
      notes: z.string().optional(),
      layout: z.enum(['title', 'content', 'two-column', 'image', 'quote']),
      media: z.array(z.object({
        type: z.enum(['image', 'video', 'chart']),
        url: z.string(),
        caption: z.string().optional(),
      })).optional(),
    })),
    format: z.string(),
    totalSlides: z.number(),
    estimatedDuration: z.number().describe('Estimated presentation duration in minutes'),
  }),
  execute: async ({ text, slidesCount, format, theme, includeNotes }) => {
    try {
      // テキストを分析してスライド構造を決定
      const sections = analyzeTextStructure(text)
      const targetSlideCount = slidesCount || Math.max(3, Math.min(sections.length, 10))
      
      const slides = sections.slice(0, targetSlideCount).map((section, index) => ({
        id: `slide-${index + 1}`,
        title: section.title || `Slide ${index + 1}`,
        content: section.content,
        notes: includeNotes ? generateSpeakerNotes(section.content) : undefined,
        layout: determineSlideLayout(section.content) as any,
        media: extractMediaSuggestions(section.content),
      }))
      
      return {
        slides,
        format,
        totalSlides: slides.length,
        estimatedDuration: slides.length * 2, // 平均2分/スライド
      }
    } catch (error) {
      throw new Error(`Slide generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  },
}

// ヘルパー関数
function generateMindmap(text: string): string {
  const lines = text.split('\n').filter(line => line.trim())
  let mermaid = 'mindmap\n  root((Central Topic))\n'
  
  lines.forEach((line, index) => {
    const indent = '    '.repeat(Math.min(index + 1, 3))
    mermaid += `${indent}${line.trim()}\n`
  })
  
  return mermaid
}

function generateFlowchart(text: string, direction: string): string {
  const lines = text.split('\n').filter(line => line.trim())
  let mermaid = `flowchart ${direction}\n`
  
  lines.forEach((line, index) => {
    if (index === 0) {
      mermaid += `    Start[${line}]\n`
    } else if (index === lines.length - 1) {
      mermaid += `    End[${line}]\n`
      mermaid += `    Step${index - 1} --> End\n`
    } else {
      mermaid += `    Step${index}[${line}]\n`
      if (index === 1) {
        mermaid += `    Start --> Step${index}\n`
      } else {
        mermaid += `    Step${index - 1} --> Step${index}\n`
      }
    }
  })
  
  return mermaid
}

function generateSequenceDiagram(text: string): string {
  return `sequenceDiagram
    participant User
    participant System
    User->>System: ${text.split('\n')[0] || 'Request'}
    System-->>User: Response`
}

function generateGanttChart(text: string): string {
  return `gantt
    title Project Timeline
    dateFormat YYYY-MM-DD
    section Planning
    Task 1 :a1, 2024-01-01, 30d
    Task 2 :after a1, 20d`
}

function generateClassDiagram(text: string): string {
  return `classDiagram
    class Example {
        +String name
        +void method()
    }`
}

function generateERDiagram(text: string): string {
  return `erDiagram
    ENTITY ||--o{ ATTRIBUTE : has`
}

function calculateDiagramComplexity(mermaidCode: string): number {
  const lines = mermaidCode.split('\n').length
  const nodes = (mermaidCode.match(/\[.*?\]/g) || []).length
  const connections = (mermaidCode.match(/-->/g) || []).length
  
  return Math.min((lines * 0.1 + nodes * 0.2 + connections * 0.3) / 10, 1)
}

function analyzeTextStructure(text: string): Array<{ title?: string; content: string }> {
  const paragraphs = text.split('\n\n').filter(p => p.trim())
  return paragraphs.map(p => {
    const lines = p.split('\n')
    if (lines.length > 1) {
      return { title: lines[0], content: lines.slice(1).join('\n') }
    }
    return { content: p }
  })
}

function generateSpeakerNotes(content: string): string {
  const wordCount = content.split(' ').length
  const duration = Math.ceil(wordCount / 150) // 150 words per minute
  return `Speaking time: ~${duration} minute(s). Key points to emphasize...`
}

function determineSlideLayout(content: string): string {
  if (content.length < 50) return 'title'
  if (content.includes('```')) return 'content'
  if (content.includes('|')) return 'two-column'
  if (content.match(/!\[.*?\]\(.*?\)/)) return 'image'
  if (content.startsWith('"') || content.startsWith('"')) return 'quote'
  return 'content'
}

function extractMediaSuggestions(content: string): any[] {
  const suggestions = []
  if (content.match(/chart|graph|data/i)) {
    suggestions.push({ type: 'chart', url: 'placeholder-chart', caption: 'Suggested chart' })
  }
  if (content.match(/image|photo|picture/i)) {
    suggestions.push({ type: 'image', url: 'placeholder-image', caption: 'Suggested image' })
  }
  return suggestions
}

// エクスポート
export const textProcessingTools = [
  translateTool,
  summarizeTool,
  generateMermaidTool,
  generateSlidesTool,
]