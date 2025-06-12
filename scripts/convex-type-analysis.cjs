/**
 * Convex型構造分析ツール
 * Convexのmutation, query, actionの型パターンを調査
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🔍 Convex Type Analysis - 型構造詳細調査\n');

// =============================================================================
// 1. Convex パッケージ情報の収集
// =============================================================================

console.log('📋 1. Convex Package Information');
console.log('='.repeat(60));

try {
  // Convex パッケージ情報
  const convexPackage = require('convex/package.json');
  console.log('📦 Convex version:', convexPackage.version);
  console.log('📦 Main entry:', convexPackage.main);
  console.log('📦 Types entry:', convexPackage.types);
  console.log('📦 Exports:', Object.keys(convexPackage.exports || {}));
  
} catch (error) {
  console.log('❌ Convex package info failed:', error.message);
}

// =============================================================================
// 2. Convex 型定義ファイルの探索
// =============================================================================

console.log('\n\n📋 2. Convex Type Definition Files');
console.log('='.repeat(60));

try {
  // Convex型定義ファイルを検索
  console.log('🔍 Searching for Convex type definitions...');
  const convexTypes = execSync('find node_modules/convex -name "*.d.ts" | head -20', { 
    encoding: 'utf8', 
    cwd: process.cwd() 
  });
  console.log('📁 Found Convex type files:\n', convexTypes);
  
  // 主要な型定義ファイルの内容を確認
  const coreTypeFiles = [
    'node_modules/convex/dist/server.d.ts',
    'node_modules/convex/dist/values.d.ts', 
    'node_modules/convex/dist/browser.d.ts'
  ];
  
  for (const typeFile of coreTypeFiles) {
    const fullPath = path.resolve(process.cwd(), typeFile);
    if (fs.existsSync(fullPath)) {
      console.log(`\n🔍 Reading ${typeFile}...`);
      const content = fs.readFileSync(fullPath, 'utf8');
      
      // mutation, query, action の型定義を抽出
      const patterns = [
        { name: 'mutation', regex: /export.*mutation.*[\s\S]*?(?=export|$)/i },
        { name: 'query', regex: /export.*query.*[\s\S]*?(?=export|$)/i },
        { name: 'action', regex: /export.*action.*[\s\S]*?(?=export|$)/i },
        { name: 'v (validation)', regex: /export.*v.*[\s\S]*?(?=export|$)/i }
      ];
      
      patterns.forEach(({ name, regex }) => {
        const match = content.match(regex);
        if (match) {
          console.log(`✅ ${name} type definition found:`);
          console.log(match[0].substring(0, 300) + '...\n');
        }
      });
    } else {
      console.log(`❌ Type file not found: ${typeFile}`);
    }
  }
  
} catch (error) {
  console.log('❌ Convex type file search failed:', error.message);
}

// =============================================================================
// 3. 実際のConvex実装パターンの分析
// =============================================================================

console.log('\n\n📋 3. Existing Convex Implementation Analysis');
console.log('='.repeat(60));

try {
  // 実際のConvexファイルを解析
  const convexFiles = [
    'convex/documents.ts',
    'convex/ai.ts',
    'convex/schema.ts',
    'convex/users.ts'
  ];
  
  for (const file of convexFiles) {
    const fullPath = path.resolve(process.cwd(), file);
    if (fs.existsSync(fullPath)) {
      console.log(`\n🔍 Analyzing ${file}...`);
      const content = fs.readFileSync(fullPath, 'utf8');
      
      // mutation/query/action の実装パターンを抽出
      const implementations = content.match(/(mutation|query|action)\s*\(\s*{[\s\S]*?}\s*\)/g);
      
      if (implementations) {
        console.log(`📝 Found ${implementations.length} implementations:`);
        implementations.forEach((impl, index) => {
          console.log(`\n${index + 1}. ${impl.substring(0, 150)}...`);
          
          // パターン分析
          if (impl.includes('args:')) {
            console.log('   ✅ Uses args validation');
          }
          if (impl.includes('handler:')) {
            console.log('   ✅ Uses handler function');
          }
          if (impl.includes('ctx.db')) {
            console.log('   ✅ Uses database context');
          }
          if (impl.includes('v.')) {
            console.log('   ✅ Uses validation schema');
          }
        });
      }
    }
  }
} catch (error) {
  console.log('❌ Convex implementation analysis failed:', error.message);
}

// =============================================================================
// 4. Convex バリデーション型パターンの分析
// =============================================================================

console.log('\n\n📋 4. Convex Validation Patterns');
console.log('='.repeat(60));

// v (validation) の使用パターンを抽出
try {
  const schemaPath = path.resolve(process.cwd(), 'convex/schema.ts');
  if (fs.existsSync(schemaPath)) {
    const schemaContent = fs.readFileSync(schemaPath, 'utf8');
    console.log('🔍 Schema validation patterns:');
    
    // defineTable パターンを抽出
    const tablePatterns = schemaContent.match(/defineTable\s*\(\s*{[\s\S]*?}\s*\)/g);
    if (tablePatterns) {
      console.log(`📊 Found ${tablePatterns.length} table definitions:`);
      tablePatterns.forEach((pattern, index) => {
        console.log(`\n${index + 1}. ${pattern.substring(0, 200)}...`);
      });
    }
    
    // フィールド型パターンを抽出
    const fieldTypes = schemaContent.match(/v\.\w+\([^)]*\)/g);
    if (fieldTypes) {
      const uniqueTypes = [...new Set(fieldTypes)];
      console.log('\n📝 Validation types used:');
      uniqueTypes.forEach(type => console.log(`   - ${type}`));
    }
  }
} catch (error) {
  console.log('❌ Schema analysis failed:', error.message);
}

// =============================================================================
// 5. Convex ベストプラクティス生成
// =============================================================================

console.log('\n\n📋 5. Convex Best Practices');
console.log('='.repeat(60));

const convexBestPractices = {
  '✅ Mutation Pattern': `
export const createDocument = mutation({
  args: {
    title: v.string(),
    content: v.string(),
    userId: v.id('users'),
    metadata: v.optional(v.object({
      tags: v.array(v.string()),
      priority: v.union(v.literal('high'), v.literal('medium'), v.literal('low'))
    }))
  },
  handler: async (ctx, args) => {
    // ✅ 型安全なargs使用
    const { title, content, userId, metadata } = args;
    
    // ✅ データベース操作
    const documentId = await ctx.db.insert('documents', {
      title,
      content,
      userId,
      metadata,
      createdAt: Date.now(),
    });
    
    return documentId;
  },
});`,

  '✅ Query Pattern': `
export const getDocument = query({
  args: { id: v.id('documents') },
  handler: async (ctx, args) => {
    // ✅ 型安全なクエリ
    const document = await ctx.db.get(args.id);
    if (!document) {
      throw new Error('Document not found');
    }
    return document;
  },
});`,

  '✅ Action Pattern': `
export const processWithAI = action({
  args: {
    documentId: v.id('documents'),
    taskType: v.union(
      v.literal('translate'),
      v.literal('summarize'),
      v.literal('improve')
    ),
    parameters: v.optional(v.any())
  },
  handler: async (ctx, args) => {
    // ✅ 外部API呼び出し
    const result = await callExternalAI(args.taskType, args.parameters);
    
    // ✅ mutationの呼び出し
    await ctx.runMutation(api.documents.updateDocument, {
      id: args.documentId,
      content: result
    });
    
    return result;
  },
});`,

  '🛡️ Type-Safe Schema': `
// schema.ts
export default defineSchema({
  documents: defineTable({
    title: v.string(),
    content: v.string(),
    userId: v.id('users'),
    metadata: v.optional(v.object({
      tags: v.array(v.string()),
      createdAt: v.number(),
      updatedAt: v.number(),
    })),
  }).index('by_user', ['userId']).index('by_title', ['title']),
  
  users: defineTable({
    email: v.string(),
    name: v.string(),
    preferences: v.optional(v.object({
      theme: v.union(v.literal('light'), v.literal('dark')),
      notifications: v.boolean(),
    })),
  }).index('by_email', ['email']),
});`,

  '🔧 Error Handling': `
export const safeQuery = query({
  args: { id: v.id('documents') },
  handler: async (ctx, args) => {
    try {
      const doc = await ctx.db.get(args.id);
      if (!doc) {
        return { success: false, error: 'Document not found' };
      }
      return { success: true, data: doc };
    } catch (error) {
      console.error('Query failed:', error);
      return { success: false, error: 'Internal error' };
    }
  },
});`
};

for (const [title, code] of Object.entries(convexBestPractices)) {
  console.log(`\n${title}:`);
  console.log(code);
}

// =============================================================================
// 6. Convex 型エラー対策ガイド
// =============================================================================

console.log('\n\n📋 6. Convex Type Error Prevention');
console.log('='.repeat(60));

const convexTroubleshooting = [
  '1. 🔧 Schema Changes: スキーマ変更時は npx convex dev --reset でリセット',
  '2. 📝 Args Validation: 必ず v.* バリデーションを使用',
  '3. 🆔 ID Types: v.id("tableName") でテーブル参照を明確化',
  '4. 🔄 Generated Types: _generated/ ファイルの自動更新を確認',
  '5. 📊 Index Usage: クエリ性能のためにindex()を適切に設定',
  '6. 🛡️ Null Checks: データベースから取得した値は常にnullチェック',
  '7. 🔀 Union Types: v.union() で列挙型を型安全に実装',
  '8. 📋 Optional Fields: v.optional() で省略可能フィールドを明確化'
];

convexTroubleshooting.forEach(step => console.log(step));

// =============================================================================
// 7. 統合パターン (Convex + Mastra)
// =============================================================================

console.log('\n\n📋 7. Integration Patterns (Convex + Mastra)');
console.log('='.repeat(60));

const integrationPattern = `
// ✅ Convex Action から Mastra Tool を呼び出すパターン
export const processDocumentWithAI = action({
  args: {
    documentId: v.id('documents'),
    operation: v.union(
      v.literal('translate'),
      v.literal('summarize'),
      v.literal('improve')
    ),
    parameters: v.object({
      targetLanguage: v.optional(v.string()),
      maxLength: v.optional(v.number()),
    })
  },
  handler: async (ctx, args) => {
    // 1. Convexからドキュメント取得
    const document = await ctx.runQuery(api.documents.get, { 
      id: args.documentId 
    });
    
    if (!document) {
      throw new Error('Document not found');
    }
    
    // 2. Mastra Tool実行 (Worker or direct call)
    const toolResult = await callMastraTool({
      operation: args.operation,
      text: document.content,
      parameters: args.parameters
    });
    
    // 3. 結果をConvexに保存
    await ctx.runMutation(api.documents.update, {
      id: args.documentId,
      content: toolResult.result,
      metadata: {
        ...document.metadata,
        lastProcessed: Date.now(),
        aiOperation: args.operation
      }
    });
    
    return {
      success: true,
      result: toolResult.result
    };
  },
});

// ヘルパー関数 (型安全)
async function callMastraTool(params: {
  operation: 'translate' | 'summarize' | 'improve',
  text: string,
  parameters: Record<string, any>
}): Promise<{ result: string }> {
  // Mastra tool execution logic
  return { result: 'AI processed content' };
}
`;

console.log('🔗 Integration example:');
console.log(integrationPattern);

console.log('\n\n✅ Convex type analysis complete!');
console.log('🎯 Key insights:');
console.log('   - Convex: args で型安全な引数、handler で処理実装');
console.log('   - Mastra: context.context で入力データアクセス'); 
console.log('   - 統合: Convex Action から Mastra Tool を呼び出す設計が最適');