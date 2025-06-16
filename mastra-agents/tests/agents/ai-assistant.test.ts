import { describe, it, expect, jest, beforeEach } from '@jest/globals'
import {
  aiAssistant,
  textProcessingSchema,
  contextAnalysisSchema,
  agentResponseSchema,
  executeAgent,
  type TextProcessingInput,
} from '../../agents/ai-assistant'
import { createMockAgent, resetAllMocks } from '../setup'

describe('AI Assistant Agent', () => {
  beforeEach(() => {
    resetAllMocks()
  })

  describe('Schema Validation', () => {
    it('should validate text processing input schema', () => {
      const validInput = {
        text: 'Hello world',
        type: 'translate',
        language: 'ja',
      }
      
      const result = textProcessingSchema.safeParse(validInput)
      expect(result.success).toBe(true)
    })

    it('should reject invalid text processing input', () => {
      const invalidInput = {
        text: '', // Empty text
        type: 'invalid-type',
      }
      
      const result = textProcessingSchema.safeParse(invalidInput)
      expect(result.success).toBe(false)
    })

    it('should validate context analysis schema', () => {
      const validContext = {
        text: 'Technical documentation',
        documentType: 'technical',
        language: 'en',
      }
      
      const result = contextAnalysisSchema.safeParse(validContext)
      expect(result.success).toBe(true)
    })

    it('should validate agent response schema', () => {
      const validResponse = {
        result: 'Processed text',
        metadata: {
          processedTokens: 100,
          processingTime: 500,
          confidence: 0.95,
        },
      }
      
      const result = agentResponseSchema.safeParse(validResponse)
      expect(result.success).toBe(true)
    })
  })

  describe('Agent Configuration', () => {
    it('should have correct agent properties', () => {
      expect(aiAssistant.name).toBe('ai-assistant')
      expect(aiAssistant.description).toBeTruthy()
      expect(aiAssistant.instructions).toBeTruthy()
      expect(aiAssistant.capabilities).toBeDefined()
    })

    it('should support multiple languages', () => {
      const supportedLanguages = aiAssistant.capabilities.languages
      expect(supportedLanguages).toContain('ja')
      expect(supportedLanguages).toContain('en')
      expect(supportedLanguages.length).toBeGreaterThan(5)
    })

    it('should have token limits defined', () => {
      expect(aiAssistant.capabilities.maxTokens).toBe(4096)
    })
  })

  describe('Agent Execution', () => {
    it('should execute translation task successfully', async () => {
      const mockAgent = createMockAgent('ai-assistant')
      mockAgent.run.mockResolvedValue({
        output: 'こんにちは世界',
        usage: { totalTokens: 50 },
      })

      const input: TextProcessingInput = {
        text: 'Hello world',
        type: 'translate',
        language: 'ja',
      }

      const result = await executeAgent(input, mockAgent as any)
      
      expect(result.result).toBe('こんにちは世界')
      expect(result.metadata?.processedTokens).toBe(50)
      expect(result.metadata?.confidence).toBeGreaterThan(0)
      expect(result.error).toBeUndefined()
    })

    it('should handle summarization task', async () => {
      const mockAgent = createMockAgent('ai-assistant')
      const longText = 'This is a very long text that needs to be summarized. '.repeat(10)
      
      mockAgent.run.mockResolvedValue({
        output: 'Summary: Long repetitive text',
        usage: { totalTokens: 150 },
      })

      const input: TextProcessingInput = {
        text: longText,
        type: 'summarize',
        maxLength: 50,
      }

      const result = await executeAgent(input, mockAgent as any)
      
      expect(result.result).toContain('Summary')
      expect(result.metadata?.suggestions).toBeDefined()
      expect(result.metadata?.suggestions).toContain('Verify key points are captured')
    })

    it('should handle code generation task', async () => {
      const mockAgent = createMockAgent('ai-assistant')
      mockAgent.run.mockResolvedValue({
        output: 'function hello() { return "Hello"; }',
        usage: { totalTokens: 75 },
      })

      const input: TextProcessingInput = {
        text: 'Create a function that returns hello',
        type: 'code',
      }

      const result = await executeAgent(input, mockAgent as any)
      
      expect(result.result).toContain('function')
      expect(result.metadata?.suggestions).toContain('Add error handling')
      expect(result.metadata?.suggestions).toContain('Include unit tests')
    })

    it('should handle errors gracefully', async () => {
      const mockAgent = createMockAgent('ai-assistant')
      mockAgent.run.mockRejectedValue(new Error('API error'))

      const input: TextProcessingInput = {
        text: 'Test text',
        type: 'translate',
        language: 'ja',
      }

      const result = await executeAgent(input, mockAgent as any)
      
      expect(result.result).toBe('')
      expect(result.error).toBe('API error')
    })
  })

  describe('Context Analysis', () => {
    it('should detect Japanese language', () => {
      const { detectLanguage } = jest.requireActual('../../agents/ai-assistant') as any
      const japaneseText = 'こんにちは世界'
      expect(detectLanguage(japaneseText)).toBe('ja')
    })

    it('should detect technical document type', () => {
      const { inferDocumentType } = jest.requireActual('../../agents/ai-assistant') as any
      const technicalText = 'function calculateSum() { const result = a + b; return result; }'
      expect(inferDocumentType(technicalText)).toBe('technical')
    })

    it('should detect web development domain', () => {
      const { inferDomain } = jest.requireActual('../../agents/ai-assistant') as any
      const webDevText = 'React components with TypeScript and Next.js'
      expect(inferDomain(webDevText)).toBe('web-development')
    })

    it('should calculate text complexity', () => {
      const { calculateTextComplexity } = jest.requireActual('../../agents/ai-assistant') as any
      const simpleText = 'This is simple.'
      const complexText = 'The implementation of quantum computational algorithms necessitates comprehensive understanding of superposition principles.'
      
      const simpleComplexity = calculateTextComplexity(simpleText)
      const highComplexity = calculateTextComplexity(complexText)
      
      expect(simpleComplexity).toBeLessThan(highComplexity)
      expect(simpleComplexity).toBeGreaterThanOrEqual(0)
      expect(highComplexity).toBeLessThanOrEqual(1)
    })

    it('should extract keywords from text', () => {
      const { extractKeywords } = jest.requireActual('../../agents/ai-assistant') as any
      const text = 'Machine learning algorithms process data efficiently. Machine learning is powerful.'
      const keywords = extractKeywords(text)
      
      expect(keywords).toContain('machine')
      expect(keywords).toContain('learning')
      expect(keywords.length).toBeLessThanOrEqual(5)
    })
  })
})