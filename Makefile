# AI駆動コラボレーションワークスペース Makefile
# 開発効率を向上させるための一般的なタスクを自動化

.PHONY: help install dev build start clean lint typecheck test format setup ci-check deps-check convex-dev

# デフォルトターゲット - ヘルプを表示
help:
	@echo "🚀 AI駆動コラボレーションワークスペース - 開発コマンド"
	@echo ""
	@echo "📋 利用可能なコマンド:"
	@echo "  make install     - 依存関係をインストール"
	@echo "  make setup       - プロジェクトの初期セットアップ"
	@echo "  make dev         - 開発サーバーを起動 (Next.js + Convex)"
	@echo "  make convex-dev  - Convexのみ開発モードで起動"
	@echo "  make build       - プロダクションビルド"
	@echo "  make start       - プロダクションサーバー起動"
	@echo "  make lint        - ESLintでコード品質チェック"
	@echo "  make typecheck   - TypeScriptの型チェック"
	@echo "  make format      - コードフォーマット"
	@echo "  make ci-check    - CI環境での全チェック実行"
	@echo "  make clean       - ビルドファイルとキャッシュをクリア"
	@echo "  make deps-check  - 依存関係の脆弱性チェック"
	@echo ""

# 依存関係のインストール
install:
	@echo "📦 依存関係をインストール中..."
	npm install
	@echo "✅ 依存関係のインストール完了"

# プロジェクト初期セットアップ
setup: install
	@echo "🔧 プロジェクトのセットアップ中..."
	@if [ ! -f ".env.local" ]; then \
		echo "⚠️  .env.localファイルが見つかりません"; \
		echo "📝 環境変数の設定を確認してください"; \
	fi
	@echo "✅ セットアップ完了"

# 開発サーバー起動 (Next.js + Convex同時起動)
dev:
	@echo "🚀 開発サーバーを起動中..."
	@echo "   Next.js: http://localhost:3000"
	@echo "   Convex: 別ターミナルで 'make convex-dev' を実行してください"
	npm run dev

# Convex開発サーバーのみ起動
convex-dev:
	@echo "🗄️ Convex開発サーバーを起動中..."
	npm run convex

# プロダクションビルド
build:
	@echo "🏗️ プロダクションビルド中..."
	npm run build
	@echo "✅ ビルド完了"

# プロダクションサーバー起動
start:
	@echo "🌐 プロダクションサーバーを起動中..."
	npm run start

# ESLintでコード品質チェック
lint:
	@echo "🔍 ESLintでコード品質をチェック中..."
	npm run lint
	@echo "✅ Lintチェック完了"

# TypeScript型チェック
typecheck:
	@echo "🔍 TypeScriptの型チェック中..."
	npx tsc --noEmit
	@echo "✅ 型チェック完了"

# コードフォーマット (Prettierがあれば)
format:
	@echo "🎨 コードフォーマット中..."
	@if command -v prettier >/dev/null 2>&1; then \
		npx prettier --write "**/*.{js,jsx,ts,tsx,json,md}"; \
	else \
		echo "ℹ️  Prettierが見つかりません。ESLint --fixを実行します"; \
		npm run lint -- --fix; \
	fi
	@echo "✅ フォーマット完了"

# CI環境での全チェック実行
ci-check: install typecheck lint build
	@echo "🎯 CI環境でのチェック完了"
	@echo "✅ 全てのチェックが正常に完了しました"

# 依存関係の脆弱性チェック
deps-check:
	@echo "🔒 依存関係の脆弱性チェック中..."
	npm audit
	@echo "✅ 脆弱性チェック完了"

# ビルドファイルとキャッシュをクリア
clean:
	@echo "🧹 ビルドファイルとキャッシュをクリア中..."
	rm -rf .next
	rm -rf node_modules/.cache
	@if [ -d "dist" ]; then rm -rf dist; fi
	@echo "✅ クリア完了"

# 完全クリーンアップ (node_modulesも削除)
deep-clean: clean
	@echo "🧹 完全クリーンアップ中..."
	rm -rf node_modules
	rm -rf package-lock.json
	@echo "✅ 完全クリーンアップ完了"
	@echo "📦 再セットアップには 'make setup' を実行してください"

# 開発用クイックスタート
quick-start: setup
	@echo "⚡ クイックスタート"
	@echo "🔧 必要に応じて .env.local を設定してください"
	@echo "🚀 'make dev' で開発サーバーを起動できます"
	@echo "🗄️ 別ターミナルで 'make convex-dev' でConvexを起動してください"