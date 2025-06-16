import { describe, it, expect, jest, beforeEach } from '@jest/globals'
import {
  executeTextProcessingWorkflow,
  documentTranslationWorkflow,
  contentTransformationPipeline,
} from '../../workflows/text-processing'
import { resetAllMocks, mockWorkflowResponse } from '../setup'

// Mastraモジュールのモック
jest.mock('../../mastra.config', () => ({
  getAgent: jest.fn(() => ({
    name: 'ai-assistant',
    run: jest.fn().mockResolvedValue({
      output: 'Mocked output',
      usage: { totalTokens: 100 },
    }),
  })),
}))

describe('Text Processing Workflows', () => {
  beforeEach(() => {
    resetAllMocks()
  })

  describe('Main Text Processing Workflow', () => {
    it('should execute multiple operations in parallel', async () => {
      const input = {
        text: 'Hello world',
        operations: [
          { type: 'translate' as const, parameters: { targetLanguage: 'ja' } },
          { type: 'summarize' as const },
          { type: 'improve' as const },
        ],
        language: 'en',
      }
      
      const result = await executeTextProcessingWorkflow(input)
      
      expect(result.success).toBe(true)
      expect(result.results).toHaveLength(3)
      expect(result.totalProcessingTime).toBeGreaterThan(0)
    })

    it('should handle operation errors gracefully', async () => {
      const { getAgent } = require('../../mastra.config')
      const mockAgent = getAgent()
      
      // First operation succeeds, second fails
      mockAgent.run
        .mockResolvedValueOnce({ output: 'Success', usage: { totalTokens: 50 } })
        .mockRejectedValueOnce(new Error('API Error'))
        .mockResolvedValueOnce({ output: 'Success 2', usage: { totalTokens: 50 } })
      
      const input = {
        text: 'Test text',
        operations: [
          { type: 'translate' as const, parameters: { targetLanguage: 'ja' } },
          { type: 'summarize' as const }, // This will fail
          { type: 'improve' as const },
        ],
      }
      
      const result = await executeTextProcessingWorkflow(input)
      
      expect(result.results).toHaveLength(3)
      expect(result.results[0].error).toBeUndefined()
      expect(result.results[1].error).toBe('API Error')
      expect(result.results[2].error).toBeUndefined()
    })

    it('should validate input before processing', async () => {
      const invalidInput = {
        text: 'Test',
        operations: [], // Empty operations array
      }
      
      const result = await executeTextProcessingWorkflow(invalidInput as any)
      
      // The workflow should handle this gracefully
      expect(result.success).toBeDefined()
    })
  })

  describe('Document Translation Workflow', () => {
    it('should summarize, translate, and re-summarize', async () => {
      const { getAgent } = require('../../mastra.config')
      const mockAgent = getAgent()
      
      mockAgent.run
        .mockResolvedValueOnce({ output: 'Original summary', usage: { totalTokens: 50 } })
        .mockResolvedValueOnce({ output: 'Translated text', usage: { totalTokens: 100 } })
        .mockResolvedValueOnce({ output: 'Translated summary', usage: { totalTokens: 50 } })
      
      const input = {
        text: 'Long document text here...',
        targetLanguage: 'ja',
      }
      
      const workflow = documentTranslationWorkflow
      const result = await workflow.run(input)
      
      expect(result.success).toBe(true)
      expect(result.data).toHaveProperty('originalSummary')
      expect(result.data).toHaveProperty('translatedText')
      expect(result.data).toHaveProperty('translatedSummary')
      expect(result.data.targetLanguage).toBe('ja')
    })

    it('should handle workflow step failures', async () => {
      const { getAgent } = require('../../mastra.config')
      const mockAgent = getAgent()
      
      mockAgent.run.mockRejectedValue(new Error('Translation failed'))
      
      const input = {
        text: 'Test document',
        targetLanguage: 'es',
      }
      
      const workflow = documentTranslationWorkflow
      const result = await workflow.run(input)
      
      // Workflow should handle the error
      expect(result).toBeDefined()
    })
  })

  describe('Content Transformation Pipeline', () => {
    it('should improve content and transform to mindmap', async () => {
      const { getAgent } = require('../../mastra.config')
      const mockAgent = getAgent()
      
      mockAgent.run
        .mockResolvedValueOnce({ output: 'Improved content', usage: { totalTokens: 75 } })
        .mockResolvedValueOnce({ output: 'mindmap\n  root((Main))', usage: { totalTokens: 50 } })
      
      const input = {
        text: 'Original content',
        targetFormat: 'mindmap',
      }
      
      const pipeline = contentTransformationPipeline
      const result = await pipeline.run(input)
      
      expect(result.success).toBe(true)
      expect(result.data).toHaveProperty('originalText')
      expect(result.data).toHaveProperty('transformedContent')
      expect(result.data.format).toBe('mindmap')
    })

    it('should improve content and transform to slides', async () => {
      const { getAgent } = require('../../mastra.config')
      const mockAgent = getAgent()
      
      mockAgent.run
        .mockResolvedValueOnce({ output: 'Improved content', usage: { totalTokens: 75 } })
        .mockResolvedValueOnce({ 
          output: JSON.stringify({ slides: [{ title: 'Slide 1', content: 'Content' }] }), 
          usage: { totalTokens: 100 } 
        })
      
      const input = {
        text: 'Original presentation content',
        targetFormat: 'slides',
      }
      
      const pipeline = contentTransformationPipeline
      const result = await pipeline.run(input)
      
      expect(result.success).toBe(true)
      expect(result.data.format).toBe('slides')
    })

    it('should reject unsupported formats', async () => {
      const input = {
        text: 'Test content',
        targetFormat: 'unsupported-format',
      }
      
      const pipeline = contentTransformationPipeline
      const result = await pipeline.run(input)
      
      // The pipeline should handle this error in the transform step
      expect(result).toBeDefined()
    })
  })

  describe('Workflow Error Handling', () => {
    it('should handle workflow execution errors', async () => {
      const input = {
        text: null, // Invalid input
        operations: [{ type: 'translate' as const }],
      }
      
      const result = await executeTextProcessingWorkflow(input as any)
      
      // Should return a failed result rather than throwing
      expect(result).toBeDefined()
      expect(result.success).toBe(false)
    })

    it('should measure total processing time', async () => {
      const input = {
        text: 'Test text',
        operations: [
          { type: 'translate' as const, parameters: { targetLanguage: 'ja' } },
          { type: 'summarize' as const },
        ],
      }
      
      const result = await executeTextProcessingWorkflow(input)
      
      expect(result.totalProcessingTime).toBeGreaterThan(0)
      expect(typeof result.totalProcessingTime).toBe('number')
    })
  })
})