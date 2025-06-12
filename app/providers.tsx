'use client'

import { ConvexProvider, ConvexReactClient } from 'convex/react'
import { ReactNode } from 'react'

// CI環境での安全なフォールバック
const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL || 'https://dummy-convex-url.convex.cloud'
const convex = new ConvexReactClient(convexUrl)

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ConvexProvider client={convex}>
      {children}
    </ConvexProvider>
  )
}