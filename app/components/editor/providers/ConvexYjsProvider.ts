import * as Y from 'yjs'
import { useMutation, useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { Id } from '@/convex/_generated/dataModel'
import { useEffect, useRef } from 'react'

export interface ConvexYjsProviderOptions {
  documentId: Id<'documents'>
  userId: Id<'users'>
  ydoc: Y.Doc
}

export class ConvexYjsProvider {
  private documentId: Id<'documents'>
  private userId: Id<'users'>
  private ydoc: Y.Doc
  private connected: boolean = false
  private synced: boolean = false
  private updateMutation: ((params: { documentId: Id<'documents'>; userId: Id<'users'>; update: string; timestamp: number }) => Promise<unknown>) | null = null
  private awareness: unknown = null

  constructor(options: ConvexYjsProviderOptions) {
    this.documentId = options.documentId
    this.userId = options.userId
    this.ydoc = options.ydoc
    
    // Y.jsドキュメントの変更を監視
    this.ydoc.on('update', this.handleYDocUpdate.bind(this))
    
    this.connected = true
  }

  private handleYDocUpdate = (update: Uint8Array, origin: unknown) => {
    // 自分の変更の場合はConvexに送信しない（無限ループ防止）
    if (origin === this) return
    
    // updateをConvexに送信
    this.sendUpdateToConvex(update)
  }

  private sendUpdateToConvex = async (update: Uint8Array) => {
    try {
      // Uint8ArrayをBase64文字列に変換してConvexに送信
      const updateString = btoa(String.fromCharCode(...update))
      
      if (this.updateMutation) {
        await this.updateMutation({
          documentId: this.documentId,
          userId: this.userId,
          update: updateString,
          timestamp: Date.now()
        })
      }
    } catch (error) {
      console.error('Failed to send update to Convex:', error)
    }
  }

  applyUpdateFromConvex = (updateString: string, origin?: unknown) => {
    try {
      // Base64文字列をUint8Arrayに変換
      const update = new Uint8Array(
        atob(updateString).split('').map(c => c.charCodeAt(0))
      )
      
      // Y.jsドキュメントに適用（originを設定して無限ループを防ぐ）
      Y.applyUpdate(this.ydoc, update, origin || this)
    } catch (error) {
      console.error('Failed to apply update from Convex:', error)
    }
  }

  setUpdateMutation = (mutation: (params: { documentId: Id<'documents'>; userId: Id<'users'>; update: string; timestamp: number }) => Promise<unknown>) => {
    this.updateMutation = mutation
  }

  connect = () => {
    this.connected = true
  }

  disconnect = () => {
    this.connected = false
    this.ydoc.off('update', this.handleYDocUpdate)
  }

  destroy = () => {
    this.disconnect()
  }

  get isConnected() {
    return this.connected
  }
}

// Reactフック版
export function useConvexYjsProvider(
  documentId: Id<'documents'>, 
  userId: Id<'users'>
) {
  const ydocRef = useRef<Y.Doc | null>(null)
  const providerRef = useRef<ConvexYjsProvider | null>(null)
  
  const sendUpdate = useMutation(api.collaboration.sendYjsUpdate)
  const updates = useQuery(api.collaboration.getYjsUpdates, { documentId })

  // Y.jsドキュメントの初期化
  useEffect(() => {
    if (!ydocRef.current) {
      ydocRef.current = new Y.Doc()
    }
    
    if (!providerRef.current) {
      providerRef.current = new ConvexYjsProvider({
        documentId,
        userId,
        ydoc: ydocRef.current
      })
      
      providerRef.current.setUpdateMutation(sendUpdate)
    }

    return () => {
      providerRef.current?.destroy()
      ydocRef.current?.destroy()
    }
  }, [documentId, userId, sendUpdate])

  // Convexからの更新を適用
  useEffect(() => {
    if (updates && providerRef.current) {
      updates.forEach(update => {
        providerRef.current?.applyUpdateFromConvex(update.data)
      })
    }
  }, [updates])

  return {
    ydoc: ydocRef.current,
    provider: providerRef.current,
    connected: providerRef.current?.isConnected || false
  }
}