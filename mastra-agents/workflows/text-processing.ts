import { z } from 'zod'
import { 
  textProcessingSchema, 
  type TextProcessingInput,
  type AgentResponse 
} from '../agents/ai-assistant'
import { getAgent } from '../mastra.config'

// カスタムワークフロー型定義
interface WorkflowStep {
  id: string
  description: string
  execute: (input: any) => Promise<any>
}

interface WorkflowConfig {
  name: string
  description: string
  steps: WorkflowStep[]
  onError?: (error: any, stepId: string) => Promise<any>
  onSuccess?: (result: any) => Promise<any>
}

class Workflow {
  constructor(private config: WorkflowConfig) {}
  
  async run(input: any): Promise<any> {
    try {
      let data = input
      
      for (const step of this.config.steps) {
        try {
          const result = await step.execute(data)
          data = result.data || result
        } catch (error) {
          if (this.config.onError) {
            return await this.config.onError(error, step.id)
          }
          throw error
        }
      }
      
      if (this.config.onSuccess) {
        return await this.config.onSuccess(data)
      }
      
      return { success: true, data }
    } catch (error) {
      return { success: false, error }
    }
  }
}

// ワークフロー入力スキーマ
const workflowInputSchema = z.object({
  text: z.string(),
  operations: z.array(z.object({
    type: z.enum(['translate', 'summarize', 'expand', 'improve', 'transform_mindmap', 'transform_slides']),
    parameters: z.record(z.any()).optional(),
  })),
  context: z.string().optional(),
  language: z.string().optional().default('ja'),
})

type WorkflowInput = z.infer<typeof workflowInputSchema>

// ワークフロー結果スキーマ
const workflowResultSchema = z.object({
  results: z.array(z.object({
    operation: z.string(),
    result: z.string(),
    metadata: z.any().optional(),
    error: z.string().optional(),
  })),
  totalProcessingTime: z.number(),
  success: z.boolean(),
})

type WorkflowResult = z.infer<typeof workflowResultSchema>

// テキスト処理ワークフロー定義
const textProcessingWorkflow = new Workflow({
  name: 'text-processing-workflow',
  description: 'Multi-step text processing workflow with AI agents',
  
  // ワークフローステップ定義
  steps: [
    // Step 1: 入力検証
    {
      id: 'validate-input',
      description: 'Validate and prepare input data',
      execute: async (input: WorkflowInput) => {
        try {
          const validated = workflowInputSchema.parse(input)
          return {
            success: true,
            data: validated,
          }
        } catch (error) {
          return {
            success: false,
            error: `Input validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          }
        }
      },
    },
    
    // Step 2: 並列処理実行
    {
      id: 'process-operations',
      description: 'Execute text operations in parallel',
      execute: async (input: WorkflowInput) => {
        const agent = getAgent('ai-assistant')
        const results: any[] = []
        const startTime = Date.now()
        
        // 並列処理のためのPromise配列
        const promises = input.operations.map(async (operation) => {
          try {
            const processingInput: TextProcessingInput = {
              text: input.text,
              type: operation.type as any,
              context: input.context,
              parameters: operation.parameters,
              language: input.language,
            }
            
            const result = await agent.run({
              input: processingInput,
            })
            
            return {
              operation: operation.type,
              result: result.output || '',
              metadata: result.metadata,
            }
          } catch (error) {
            return {
              operation: operation.type,
              result: '',
              error: error instanceof Error ? error.message : 'Processing failed',
            }
          }
        })
        
        // 全ての操作を並列実行
        const processedResults = await Promise.all(promises)
        
        return {
          success: true,
          data: {
            results: processedResults,
            totalProcessingTime: Date.now() - startTime,
          },
        }
      },
    },
    
    // Step 3: 結果の統合と後処理
    {
      id: 'consolidate-results',
      description: 'Consolidate and format final results',
      execute: async (data: any) => {
        const { results, totalProcessingTime } = data
        
        // エラーチェック
        const hasErrors = results.some((r: any) => r.error)
        
        // 結果の整形
        const formattedResults = results.map((r: any) => ({
          ...r,
          metadata: r.metadata || {},
        }))
        
        return {
          success: !hasErrors,
          data: {
            results: formattedResults,
            totalProcessingTime,
            success: !hasErrors,
          },
        }
      },
    },
  ],
  
  // エラーハンドリング
  onError: async (error, stepId) => {
    console.error(`Workflow error at step ${stepId}:`, error)
    return {
      success: false,
      error: `Workflow failed at step ${stepId}: ${error.message}`,
    }
  },
  
  // 成功時のコールバック
  onSuccess: async (result) => {
    console.log('Workflow completed successfully:', {
      operationCount: result.results.length,
      totalTime: result.totalProcessingTime,
    })
    return result
  },
})

// 特殊なワークフロー: ドキュメント翻訳と要約
export const documentTranslationWorkflow = new Workflow({
  name: 'document-translation-workflow',
  description: 'Translate document and create summary in target language',
  
  steps: [
    // Step 1: 原文の要約作成
    {
      id: 'summarize-original',
      description: 'Create summary of original text',
      execute: async (input: { text: string; targetLanguage: string }) => {
        const agent = getAgent('ai-assistant')
        
        const summaryResult = await agent.run({
          input: {
            text: input.text,
            type: 'summarize',
            parameters: { style: 'detailed' },
          },
        })
        
        return {
          success: true,
          data: {
            originalSummary: summaryResult.output,
            originalText: input.text,
            targetLanguage: input.targetLanguage,
          },
        }
      },
    },
    
    // Step 2: 全文翻訳
    {
      id: 'translate-full',
      description: 'Translate full text',
      execute: async (data: any) => {
        const agent = getAgent('ai-assistant')
        
        const translationResult = await agent.run({
          input: {
            text: data.originalText,
            type: 'translate',
            parameters: {
              targetLanguage: data.targetLanguage,
              preserveFormatting: true,
            },
          },
        })
        
        return {
          success: true,
          data: {
            ...data,
            translatedText: translationResult.output,
          },
        }
      },
    },
    
    // Step 3: 翻訳文の要約作成
    {
      id: 'summarize-translation',
      description: 'Create summary of translated text',
      execute: async (data: any) => {
        const agent = getAgent('ai-assistant')
        
        const summaryResult = await agent.run({
          input: {
            text: data.translatedText,
            type: 'summarize',
            parameters: { 
              style: 'detailed',
              language: data.targetLanguage,
            },
          },
        })
        
        return {
          success: true,
          data: {
            originalSummary: data.originalSummary,
            translatedText: data.translatedText,
            translatedSummary: summaryResult.output,
            targetLanguage: data.targetLanguage,
          },
        }
      },
    },
  ],
})

// コンテンツ変換パイプライン
export const contentTransformationPipeline = new Workflow({
  name: 'content-transformation-pipeline',
  description: 'Transform content through multiple formats',
  
  steps: [
    // Step 1: コンテンツ改善
    {
      id: 'improve-content',
      description: 'Improve and clarify content',
      execute: async (input: { text: string; targetFormat: string }) => {
        const agent = getAgent('ai-assistant')
        
        const improvedResult = await agent.run({
          input: {
            text: input.text,
            type: 'improve',
          },
        })
        
        return {
          success: true,
          data: {
            improvedText: improvedResult.output,
            targetFormat: input.targetFormat,
          },
        }
      },
    },
    
    // Step 2: フォーマット変換
    {
      id: 'transform-format',
      description: 'Transform to target format',
      execute: async (data: any) => {
        const agent = getAgent('ai-assistant')
        
        let transformType: string
        switch (data.targetFormat) {
          case 'mindmap':
            transformType = 'transform_mindmap'
            break
          case 'slides':
            transformType = 'transform_slides'
            break
          default:
            throw new Error(`Unsupported format: ${data.targetFormat}`)
        }
        
        const transformResult = await agent.run({
          input: {
            text: data.improvedText,
            type: transformType as any,
          },
        })
        
        return {
          success: true,
          data: {
            originalText: data.improvedText,
            transformedContent: transformResult.output,
            format: data.targetFormat,
          },
        }
      },
    },
  ],
})

// ワークフロー実行ヘルパー
export async function executeTextProcessingWorkflow(
  input: WorkflowInput
): Promise<WorkflowResult> {
  try {
    const result = await textProcessingWorkflow.run(input)
    return result.data as WorkflowResult
  } catch (error) {
    console.error('Workflow execution error:', error)
    return {
      results: [],
      totalProcessingTime: 0,
      success: false,
    }
  }
}

// デフォルトエクスポート
export default textProcessingWorkflow