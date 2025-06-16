import { describe, it, expect, jest, beforeEach } from '@jest/globals'
import {
  translateTool,
  summarizeTool,
  generateMermaidTool,
  generateSlidesTool,
  textProcessingTools,
} from '../../tools/text-processing'
import { resetAllMocks } from '../setup'

describe('Text Processing Tools', () => {
  beforeEach(() => {
    resetAllMocks()
  })

  describe('Translate Tool', () => {
    it('should have correct configuration', () => {
      expect(translateTool.id).toBe('translate-text')
      expect(translateTool.description).toContain('Translate text')
    })

    it('should validate input schema', () => {
      const validInput = {
        text: 'Hello world',
        targetLanguage: 'ja',
      }
      
      const schema = translateTool.inputSchema
      const result = schema.safeParse(validInput)
      expect(result.success).toBe(true)
    })

    it('should execute translation successfully', async () => {
      const input = {
        text: 'Hello world',
        targetLanguage: 'ja',
        preserveFormatting: true,
      }
      
      const result = await translateTool.execute(input)
      
      expect(result.translatedText).toContain('[Translated to ja]')
      expect(result.confidence).toBeGreaterThan(0.9)
      expect(result.detectedSourceLanguage).toBeDefined()
    })

    it('should reject unsupported languages', async () => {
      const input = {
        text: 'Hello world',
        targetLanguage: 'xyz', // Invalid language
      }
      
      await expect(translateTool.execute(input)).rejects.toThrow('Unsupported target language')
    })

    it('should handle cultural context', async () => {
      const input = {
        text: 'Good morning',
        targetLanguage: 'ja',
        culturalContext: 'Business formal greeting',
      }
      
      const result = await translateTool.execute(input)
      
      expect(result.culturalNotes).toBeDefined()
      expect(result.culturalNotes).toContain('Cultural adaptation applied')
    })
  })

  describe('Summarize Tool', () => {
    it('should have correct configuration', () => {
      expect(summarizeTool.id).toBe('summarize-text')
      expect(summarizeTool.description).toContain('Create a concise summary')
    })

    it('should execute summarization successfully', async () => {
      const longText = 'This is a long text that needs summarization. '.repeat(10)
      const input = {
        text: longText,
        maxLength: 50,
        style: 'brief' as const,
      }
      
      const result = await summarizeTool.execute(input)
      
      expect(result.summary).toBeTruthy()
      expect(result.keyPoints).toBeInstanceOf(Array)
      expect(result.keyPoints.length).toBeGreaterThan(0)
      expect(result.wordCount).toBeGreaterThan(0)
      expect(result.readingTime).toBeGreaterThan(0)
    })

    it('should reject text that is too short', async () => {
      const input = {
        text: 'Short',
        style: 'brief' as const,
      }
      
      await expect(summarizeTool.execute(input)).rejects.toThrow('Text is too short to summarize')
    })

    it('should handle different summarization styles', async () => {
      const text = 'This is a test text for summarization. '.repeat(5)
      
      for (const style of ['brief', 'detailed', 'bullet-points'] as const) {
        const input = { text, style }
        const result = await summarizeTool.execute(input)
        expect(result.summary).toBeTruthy()
      }
    })
  })

  describe('Generate Mermaid Tool', () => {
    it('should have correct configuration', () => {
      expect(generateMermaidTool.id).toBe('generate-mermaid')
      expect(generateMermaidTool.description).toContain('Convert text to Mermaid')
    })

    it('should generate mindmap diagram', async () => {
      const input = {
        text: 'Main Topic\nSubtopic 1\nSubtopic 2',
        diagramType: 'mindmap' as const,
      }
      
      const result = await generateMermaidTool.execute(input)
      
      expect(result.mermaidCode).toContain('mindmap')
      expect(result.diagramType).toBe('mindmap')
      expect(result.complexity).toBeGreaterThanOrEqual(0)
      expect(result.complexity).toBeLessThanOrEqual(1)
    })

    it('should generate flowchart with direction', async () => {
      const input = {
        text: 'Start\nProcess\nEnd',
        diagramType: 'flowchart' as const,
        direction: 'LR' as const,
      }
      
      const result = await generateMermaidTool.execute(input)
      
      expect(result.mermaidCode).toContain('flowchart LR')
      expect(result.mermaidCode).toContain('Start')
      expect(result.mermaidCode).toContain('End')
    })

    it('should support multiple diagram types', async () => {
      const diagramTypes = ['mindmap', 'flowchart', 'sequence', 'gantt', 'class', 'er'] as const
      
      for (const diagramType of diagramTypes) {
        const input = {
          text: 'Test content',
          diagramType,
        }
        
        const result = await generateMermaidTool.execute(input)
        expect(result.mermaidCode).toBeTruthy()
        expect(result.diagramType).toBe(diagramType)
      }
    })
  })

  describe('Generate Slides Tool', () => {
    it('should have correct configuration', () => {
      expect(generateSlidesTool.id).toBe('generate-slides')
      expect(generateSlidesTool.description).toContain('Convert text content into slide')
    })

    it('should generate slides successfully', async () => {
      const input = {
        text: 'Slide 1: Introduction\n\nThis is the introduction.\n\nSlide 2: Main Content\n\nThis is the main content.',
        slidesCount: 2,
        format: 'markdown' as const,
      }
      
      const result = await generateSlidesTool.execute(input)
      
      expect(result.slides).toBeInstanceOf(Array)
      expect(result.slides.length).toBe(2)
      expect(result.format).toBe('markdown')
      expect(result.totalSlides).toBe(2)
      expect(result.estimatedDuration).toBeGreaterThan(0)
    })

    it('should include speaker notes when requested', async () => {
      const input = {
        text: 'Test slide content',
        includeNotes: true,
      }
      
      const result = await generateSlidesTool.execute(input)
      
      expect(result.slides[0].notes).toBeDefined()
      expect(result.slides[0].notes).toContain('Speaking time')
    })

    it('should determine slide layout automatically', async () => {
      const input = {
        text: 'Title Slide\n\nMain content with code:\n```javascript\nconst x = 1;\n```',
      }
      
      const result = await generateSlidesTool.execute(input)
      
      const layouts = result.slides.map(s => s.layout)
      expect(layouts).toContain('content')
    })

    it('should suggest media when appropriate', async () => {
      const input = {
        text: 'Data Analysis Results\n\nThe chart shows increasing trends.',
      }
      
      const result = await generateSlidesTool.execute(input)
      
      const hasMediaSuggestions = result.slides.some(s => s.media && s.media.length > 0)
      expect(hasMediaSuggestions).toBe(true)
    })
  })

  describe('Tool Collection', () => {
    it('should export all tools in collection', () => {
      expect(textProcessingTools).toBeInstanceOf(Array)
      expect(textProcessingTools).toContain(translateTool)
      expect(textProcessingTools).toContain(summarizeTool)
      expect(textProcessingTools).toContain(generateMermaidTool)
      expect(textProcessingTools).toContain(generateSlidesTool)
      expect(textProcessingTools.length).toBe(4)
    })
  })
})