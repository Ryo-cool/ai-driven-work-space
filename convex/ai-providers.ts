import { AI_CONFIG, AIResponse, AIPrompt } from './config'

// OpenAI API呼び出し（統一版）
export async function callOpenAIAPI(prompt: AIPrompt): Promise<AIResponse> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    return {
      success: false,
      error: 'OpenAI API key not configured'
    }
  }

  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), AI_CONFIG.API_TIMEOUT_MS)

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: AI_CONFIG.OPENAI_MODEL,
        messages: [
          ...(prompt.system ? [{ role: 'system', content: prompt.system }] : []),
          { role: 'user', content: prompt.user }
        ],
        max_tokens: prompt.maxTokens || AI_CONFIG.DEFAULT_MAX_TOKENS,
        temperature: prompt.temperature || AI_CONFIG.DEFAULT_TEMPERATURE,
      }),
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      return {
        success: false,
        error: `OpenAI API error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`
      }
    }

    const data = await response.json()
    return {
      success: true,
      content: data.choices[0]?.message?.content || '',
      usage: data.usage,
    }
  } catch (error) {
    if (error.name === 'AbortError') {
      return {
        success: false,
        error: 'OpenAI API request timeout'
      }
    }
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown OpenAI API error'
    }
  }
}

// Anthropic API呼び出し（統一版）
export async function callAnthropicAPI(prompt: AIPrompt): Promise<AIResponse> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return {
      success: false,
      error: 'Anthropic API key not configured'
    }
  }

  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), AI_CONFIG.API_TIMEOUT_MS)

    const messages = [
      { role: 'user', content: prompt.user }
    ]

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01',
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: AI_CONFIG.ANTHROPIC_MODEL,
        messages,
        max_tokens: prompt.maxTokens || AI_CONFIG.DEFAULT_MAX_TOKENS,
        temperature: prompt.temperature || AI_CONFIG.DEFAULT_TEMPERATURE,
        ...(prompt.system ? { system: prompt.system } : {}),
      }),
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      return {
        success: false,
        error: `Anthropic API error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`
      }
    }

    const data = await response.json()
    return {
      success: true,
      content: data.content[0]?.text || '',
      usage: data.usage ? {
        prompt_tokens: data.usage.input_tokens,
        completion_tokens: data.usage.output_tokens,
        total_tokens: data.usage.input_tokens + data.usage.output_tokens,
      } : undefined,
    }
  } catch (error) {
    if (error.name === 'AbortError') {
      return {
        success: false,
        error: 'Anthropic API request timeout'
      }
    }
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown Anthropic API error'
    }
  }
}

// AI処理のフォールバック機能付き呼び出し
export async function callAIWithFallback(
  prompt: AIPrompt,
  preferredProvider: 'openai' | 'anthropic' = 'openai'
): Promise<AIResponse> {
  // 最初のプロバイダーを試行
  const primaryResult = preferredProvider === 'openai' 
    ? await callOpenAIAPI(prompt)
    : await callAnthropicAPI(prompt)

  if (primaryResult.success) {
    return primaryResult
  }

  // フォールバック先を試行
  console.warn(`Primary AI provider (${preferredProvider}) failed, falling back to alternative`)
  const fallbackResult = preferredProvider === 'openai'
    ? await callAnthropicAPI(prompt)
    : await callOpenAIAPI(prompt)

  if (!fallbackResult.success) {
    return {
      success: false,
      error: `Both AI providers failed. Primary: ${primaryResult.error}, Fallback: ${fallbackResult.error}`
    }
  }

  return fallbackResult
}