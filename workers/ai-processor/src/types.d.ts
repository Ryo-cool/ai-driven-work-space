// Cloudflare Workers環境の型定義

declare module '@cloudflare/ai' {
  export class Ai {
    constructor(gateway: any)
    run(model: string, options: any): Promise<any>
  }
}

interface KVNamespace {
  get(key: string): Promise<string | null>
  put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>
  delete(key: string): Promise<void>
}

interface Env {
  AI: any
  AI_CACHE: KVNamespace
}

declare global {
  // Cloudflare Workers環境でのfetch
  function fetch(input: RequestInfo, init?: RequestInit): Promise<Response>
}