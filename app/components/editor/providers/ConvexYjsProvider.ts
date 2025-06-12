import * as Y from 'yjs'
import { Awareness } from 'y-protocols/awareness'
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
  public awareness: Awareness
  private appliedUpdates: Set<string> = new Set() // 適用済み更新を追跡

  constructor(options: ConvexYjsProviderOptions) {
    this.documentId = options.documentId
    this.userId = options.userId
    this.ydoc = options.ydoc
    
    // Awarenessの初期化
    this.awareness = new Awareness(this.ydoc)
    
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

  applyUpdateFromConvex = (updateString: string, updateId: string, origin?: unknown) => {
    // 既に適用済みの更新はスキップ
    if (this.appliedUpdates.has(updateId)) {
      return
    }
    
    try {
      // Base64文字列をUint8Arrayに変換
      const update = new Uint8Array(
        atob(updateString).split('').map(c => c.charCodeAt(0))
      )
      
      // Y.jsドキュメントに適用（originを設定して無限ループを防ぐ）
      Y.applyUpdate(this.ydoc, update, origin || this)
      
      // 適用済みとしてマーク
      this.appliedUpdates.add(updateId)
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
    this.awareness.destroy()
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
  const lastProcessedTimestampRef = useRef<number | null>(null)
  const isInitializedRef = useRef<boolean>(false)
  
  const sendUpdate = useMutation(api.collaboration.sendYjsUpdate)
  
  // 初期化時に最新タイムスタンプを取得（一度だけ）
  const latestTimestamp = useQuery(
    api.collaboration.getLatestYjsTimestamp, 
    !isInitializedRef.current ? { documentId } : 'skip'
  )
  
  // 初期化後のリアルタイム更新を取得
  const updates = useQuery(
    api.collaboration.getYjsUpdates, 
    lastProcessedTimestampRef.current !== null 
      ? { documentId, since: lastProcessedTimestampRef.current }
      : 'skip'
  )

  // 確実にY.jsドキュメントを初期化（一度だけ）
  if (!ydocRef.current) {
    ydocRef.current = new Y.Doc()
    // デバッグ用: ドキュメントIDを設定
    ydocRef.current.clientID = Math.floor(Math.random() * 2147483647)
  }

  // 初期化処理（現在時刻以降の更新のみを処理）
  useEffect(() => {
    if (latestTimestamp !== undefined && !isInitializedRef.current) {
      // 現在時刻を基準として、これ以降の更新のみを処理
      const now = Date.now()
      lastProcessedTimestampRef.current = now
      isInitializedRef.current = true
    }
  }, [latestTimestamp])

  // Y.jsプロバイダーの初期化
  useEffect(() => {
    if (!providerRef.current && ydocRef.current && isInitializedRef.current) {
      providerRef.current = new ConvexYjsProvider({
        documentId,
        userId,
        ydoc: ydocRef.current
      })
      
      providerRef.current.setUpdateMutation(sendUpdate)
    }

    return () => {
      if (providerRef.current) {
        providerRef.current.destroy()
        providerRef.current = null
      }
    }
  }, [documentId, userId, sendUpdate, isInitializedRef.current])

  // Convexからの更新を適用（初期化後のリアルタイム更新のみ）
  useEffect(() => {
    if (updates && updates.length > 0 && providerRef.current && isInitializedRef.current) {
      // 自分以外のユーザーからの更新のみを適用
      const otherUsersUpdates = updates.filter((update: any) => update.userId !== userId)
      
      otherUsersUpdates.forEach((update: any) => {
        if (providerRef.current) {
          providerRef.current.applyUpdateFromConvex(update.data, update._id)
        }
      })
      
      // 最新のタイムスタンプを更新
      if (updates.length > 0) {
        const latestUpdateTimestamp = Math.max(...updates.map((u: any) => u.timestamp))
        lastProcessedTimestampRef.current = latestUpdateTimestamp
      }
    }
  }, [updates, isInitializedRef.current])

  return {
    ydoc: ydocRef.current,
    provider: providerRef.current,
    connected: providerRef.current?.isConnected || false
  }
}