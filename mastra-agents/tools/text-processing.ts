// Mastra tools temporarily disabled for CI compatibility
// TODO: Re-enable when dependency issues are resolved

import { z } from 'zod'

// Placeholder tool definitions for type compatibility
export const translateTool = {
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
}

// テキスト要約ツール
export const summarizeTool = {
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
}

// Mermaidダイアグラム生成ツール
export const generateMermaidTool = {
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
}

// スライド生成ツール
export const generateSlidesTool = {
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
}

// エクスポート
export const textProcessingTools = [
  translateTool,
  summarizeTool,
  generateMermaidTool,
  generateSlidesTool,
]