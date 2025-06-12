import { action } from './_generated/server'
import { v } from 'convex/values'

// OpenAI API呼び出し
export const callOpenAI = action({
  args: {
    prompt: v.string(),
    systemPrompt: v.optional(v.string()),
    model: v.optional(v.string()),
    maxTokens: v.optional(v.number()),
  },
  handler: async (ctx, { prompt, systemPrompt, model = 'gpt-4', maxTokens = 1000 }) => {
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      throw new Error('OpenAI API key not configured')
    }

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          messages: [
            ...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []),
            { role: 'user', content: prompt }
          ],
          max_tokens: maxTokens,
          temperature: 0.7,
        }),
      })

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status}`)
      }

      const data = await response.json()
      return {
        success: true,
        content: data.choices[0]?.message?.content || '',
        usage: data.usage,
      }
    } catch (error) {
      console.error('OpenAI API call failed:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  },
})

// Anthropic API呼び出し
export const callAnthropic = action({
  args: {
    prompt: v.string(),
    systemPrompt: v.optional(v.string()),
    model: v.optional(v.string()),
    maxTokens: v.optional(v.number()),
  },
  handler: async (ctx, { prompt, systemPrompt, model = 'claude-3-sonnet-20240229', maxTokens = 1000 }) => {
    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      throw new Error('Anthropic API key not configured')
    }

    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': apiKey,
          'Content-Type': 'application/json',
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model,
          max_tokens: maxTokens,
          system: systemPrompt || '',
          messages: [
            { role: 'user', content: prompt }
          ],
        }),
      })

      if (!response.ok) {
        throw new Error(`Anthropic API error: ${response.status}`)
      }

      const data = await response.json()
      return {
        success: true,
        content: data.content[0]?.text || '',
        usage: data.usage,
      }
    } catch (error) {
      console.error('Anthropic API call failed:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  },
})

// AI処理のメイン関数
export const processAICommand = action({
  args: {
    type: v.union(
      v.literal('translate'),
      v.literal('summarize'), 
      v.literal('expand'),
      v.literal('improve'),
      v.literal('code'),
      v.literal('fix')
    ),
    selectedText: v.string(),
    context: v.optional(v.string()),
    provider: v.optional(v.union(v.literal('openai'), v.literal('anthropic'))),
  },
  handler: async (ctx, { type, selectedText, context, provider = 'openai' }) => {
    // プロンプトの生成
    const prompts = {
      translate: {
        system: 'あなたは多言語翻訳の専門家です。与えられたテキストを自然で正確な日本語に翻訳してください。',
        user: `以下のテキストを日本語に翻訳してください：\n\n${selectedText}`
      },
      summarize: {
        system: 'あなたは要約の専門家です。与えられたテキストの要点を簡潔にまとめてください。',
        user: `以下のテキストを簡潔に要約してください：\n\n${selectedText}`
      },
      expand: {
        system: 'あなたは文章拡張の専門家です。与えられたテキストにより詳細な情報や説明を追加してください。',
        user: `以下のテキストをより詳細に拡張してください：\n\n${selectedText}${context ? `\n\nコンテキスト：${context}` : ''}`
      },
      improve: {
        system: 'あなたは文章改善の専門家です。与えられたテキストをより読みやすく、わかりやすく改善してください。',
        user: `以下のテキストを改善してください：\n\n${selectedText}`
      },
      code: {
        system: 'あなたはプログラミングの専門家です。与えられた要求に基づいてコードを生成してください。',
        user: `以下の要求に基づいてコードを生成してください：\n\n${selectedText}`
      },
      fix: {
        system: 'あなたは文法とスペルチェックの専門家です。与えられたテキストの文法エラーやスペルミスを修正してください。',
        user: `以下のテキストの文法エラーやスペルミスを修正してください：\n\n${selectedText}`
      }
    }

    const prompt = prompts[type]
    
    // AI API呼び出し
    const result = provider === 'anthropic' 
      ? await ctx.runAction(callAnthropic, {
          prompt: prompt.user,
          systemPrompt: prompt.system,
          maxTokens: 2000,
        })
      : await ctx.runAction(callOpenAI, {
          prompt: prompt.user,
          systemPrompt: prompt.system,
          maxTokens: 2000,
        })

    return result
  },
})