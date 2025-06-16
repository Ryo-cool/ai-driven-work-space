# 開発ガイド

## 🎯 Issue #8 実装ガイド（次セッション用）

### Mastra開発環境整備の実装方針

#### 1. 現在のMastra状態確認
- ✅ `mastra-agents/` ディレクトリ存在
- ✅ 基本依存関係インストール済み (`@mastra/core`, `@ai-sdk/openai`, `zod`)
- ❌ プレースホルダー実装（実際の機能なし）
- ❌ テスト環境未構築
- ❌ 本格的なエージェント・ツール未実装

#### 2. 実装タスク（Issue #8詳細）
**Mastraエージェント設定**:
- [ ] `mastra-agents/agents/` でAIエージェント定義
- [ ] カスタムAIツールの作成（`mastra-agents/tools/`）
- [ ] マルチステップワークフローの実装（`mastra-agents/workflows/`）
- [ ] エージェント間の連携とデータ共有

**開発・テスト環境**:
- [ ] Mastraプレイグラウンドの設定（`mastra dev`）
- [ ] AI処理のユニットテスト作成
- [ ] パフォーマンステストの実装
- [ ] 異なるAIプロバイダーでの動作検証

**エラーハンドリング**:
- [ ] APIレート制限の処理
- [ ] ネットワークエラーのリトライ機能
- [ ] AI応答エラーの適切な処理
- [ ] プロバイダー間のフォールバック機能（OpenAI → Anthropic）

**モニタリングと最適化**:
- [ ] AI処理の応答時間測定
- [ ] エラー発生率の追跡
- [ ] AI処理コストの監視
- [ ] パフォーマンス最適化の提案

#### 3. 技術要件
- **Mastra Framework**: TypeScript AI エージェントフレームワーク
- **Testing**: Jest, AI処理のモックテスト
- **Monitoring**: ログ収集、メトリクス測定
- **Deployment**: Cloudflare Workers準備

#### 4. 実装ファイル予定
- `mastra-agents/package.json` - Mastra設定強化
- `mastra-agents/agents/` - 実際のAIエージェント定義
- `mastra-agents/tools/` - 実機能カスタムAIツール
- `mastra-agents/workflows/` - ワークフロー定義（新規）
- `mastra-agents/tests/` - テストファイル（新規）
- `mastra-agents/mastra.config.ts` - Mastra設定ファイル（新規）

#### 5. Convex統合方針
```typescript
// 既存のconvex/ai.tsを拡張してMastra統合
export const executeMastraWorkflow = action({
  args: { workflowType: v.string(), input: v.any() },
  handler: async (ctx, args) => {
    // Mastraエージェント呼び出し
    // フォールバック処理
    // 結果の検証・保存
  }
})
```

### 前セッションの重要な実装完了状況
- ✅ **Issue #7完全完了**: インラインAIコマンド6種類実装済み
- ✅ **コンテキスト認識**: 文書種別・言語・専門分野自動判定
- ✅ **ストリーミングUI**: プログレス表示・結果プレビュー機能
- ✅ **Y.js統合**: リアルタイムコラボレーション対応
- ✅ **型安全性**: TypeScript完全対応、ビルド成功

### 現在のプロジェクト状態
- **ブランチ**: `feature/mastra-development-environment` (新規作成)
- **ベース**: 最新main (Issue #7マージ済み)
- **残Issue**: #8 Mastra環境整備（実装中）
- **CI/CD**: 完全動作、型エラー0個

## Phase 3候補機能（将来実装予定）

1. **コンテンツ自動変換** - テキスト→図表・スライド変換
2. **コード実行環境** - JavaScript実行+AI解析
3. **パフォーマンス最適化** - ストリーミング・エッジ最適化