import express from 'express'
import cors from 'cors'
import { agents } from '../mastra.config'
import { executeTextProcessingWorkflow } from '../workflows/text-processing'
import { z } from 'zod'

const app = express()
const PORT = process.env.PORT || 3001

// ミドルウェア
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
  credentials: true,
}))
app.use(express.json())

// ヘルスチェック
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
  })
})

// Mastraエージェント情報
app.get('/api/agents', (req, res) => {
  const agentList = Object.keys(agents).map(name => ({
    name,
    description: agents[name as keyof typeof agents].description,
  }))
  
  res.json({ agents: agentList })
})

// ワークフロー実行エンドポイント
const workflowRequestSchema = z.object({
  text: z.string(),
  operations: z.array(z.object({
    type: z.enum(['translate', 'summarize', 'expand', 'improve', 'transform_mindmap', 'transform_slides']),
    parameters: z.record(z.any()).optional(),
  })),
  context: z.string().optional(),
  language: z.string().optional(),
})

app.post('/api/workflows/text-processing', async (req, res) => {
  try {
    // リクエスト検証
    const input = workflowRequestSchema.parse(req.body)
    
    // 認証チェック（簡易版）
    const apiKey = req.headers.authorization?.replace('Bearer ', '')
    if (apiKey !== process.env.MASTRA_API_KEY && process.env.NODE_ENV === 'production') {
      return res.status(401).json({ error: 'Unauthorized' })
    }
    
    // ワークフロー実行
    const result = await executeTextProcessingWorkflow(input)
    
    res.json(result)
  } catch (error) {
    console.error('Workflow execution error:', error)
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: 'Invalid request', 
        details: error.errors 
      })
    }
    
    res.status(500).json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    })
  }
})

// 単一AI処理エンドポイント
app.post('/api/process', async (req, res) => {
  try {
    const { type, text, parameters } = req.body
    
    const agent = agents['ai-assistant']
    if (!agent) {
      return res.status(404).json({ error: 'Agent not found' })
    }
    
    const result = await agent.run({
      input: {
        text,
        type,
        parameters,
      },
    })
    
    res.json({
      success: true,
      result: result.output,
      metadata: result.metadata,
    })
  } catch (error) {
    console.error('Process error:', error)
    res.status(500).json({ 
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    })
  }
})

// メトリクス エンドポイント
app.get('/api/metrics', (req, res) => {
  // 簡易的なメトリクス収集
  res.json({
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    cpu: process.cpuUsage(),
    timestamp: new Date().toISOString(),
  })
})

// エラーハンドリング
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled error:', err)
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined,
  })
})

// サーバー起動
app.listen(PORT, () => {
  console.log(`🚀 Mastra server running at http://localhost:${PORT}`)
  console.log(`📝 Environment: ${process.env.NODE_ENV}`)
  console.log(`🤖 Available agents: ${Object.keys(agents).join(', ')}`)
})