# Universal Agent Architect (UAA)

**目的・プロジェクト構造・AIサービスに合わせて、エージェント構成・スキル・設定を提案・生成する、ローカル優先のオープンな設計基盤。**

> **開発状況：v0.1試作段階。** 現在動作するのは「安全なファイル一覧と限定的なマニフェスト解析（明示時はPython/TypeScriptのローカルAST構造解析） → ルールベースの構成案 → 検証済み範囲のCodex/Claude Code/Gemini CLIファイルを別フォルダへ生成」です。Claude CodeとGemini CLIは形式レベルのみ検証済みで、ランタイムの読み込み・権限・MCP動作は未検証です。AI、クラウドサービスへの送信は行いません。

## 開発用の起動

要件：Node.js 22以降、npm。ローカルPCに展開して以下を実行します。

```bash
npm install
npm run check
node scripts/cli.mjs analyze ./examples/sample-python
node scripts/cli.mjs analyze ./examples/sample-python codex baseline --ast
node scripts/cli.mjs analyze ./examples/sample-python codex baseline --config
node scripts/cli.mjs analyze ./examples/sample-python codex baseline --mcp-config
node scripts/cli.mjs generate ./examples/sample-python codex baseline --dry-run
node scripts/cli.mjs generate ./examples/sample-python codex
node scripts/cli.mjs generate ./examples/sample-python claude-code baseline --dry-run
node scripts/cli.mjs generate ./examples/sample-python gemini-cli baseline --dry-run
node scripts/cli.mjs apply ./examples/sample-python --staging=generated/sample-python --confirm
# rollback-idはapplyのJSON結果から取得する
node scripts/cli.mjs rollback ./examples/sample-python --staging=generated/sample-python --rollback-id=<id> --confirm
npm run mcp -- --project=./examples/sample-python
npm run serve
```

CLIの4番目の引数で`baseline`（標準）または`strict`（強化）のセキュリティプロファイルを選べます。

```bash
node scripts/cli.mjs analyze ./examples/sample-python codex strict
```

ブラウザ試作版：`http://127.0.0.1:4173/`。`npm run serve`はローカルHTTPの表示用であり、MCPサーバではありません。

`generate` は既存プロジェクトを書き換えず、`generated/<folder>/` に新しい設定ファイルを出力します。同一出力先が存在すると失敗します。`generated/` 内のファイルを確認してから、ご自身で適用してください。

## 採用する設計原則

- **Local-first:** coreにファイル・ネットワーク・AI依存を置かない。解析と構成提案はPC内で完了。
- **Rules first:** テンプレートと検証済み規則から生成し、外部AIは将来的な明示的オプション。
- **Canonical blueprint:** 中間設計形式からAIサービス別アダプターで生成する。
- **Fail-closed:** 未実装・未検証のAI機能を捏造して出力しない。
- **Minimal agents:** 単一エージェントを基本とし、並列性・独立性・権限分離が必要な場合だけ追加。
- **Safe changes:** 生成先を隔離し、検証と差分表示を経て適用する。

## 主な資料

- [製品仕様](docs/PRODUCT_SPEC.md)
- [構成とモジュール設計](docs/ARCHITECTURE.md)
- [ロードマップ](docs/ROADMAP.md)
- [セキュリティ設計](docs/SECURITY.md)
- [開発ワークフロー](docs/DEVELOPMENT_WORKFLOW.md)
- [エージェント開発標準](docs/AGENT_DEVELOPMENT_STANDARD.md)
- [対応サービスと公式情報](docs/COMPATIBILITY.md)
- [Codexに渡す開発開始プロンプト](docs/CODEX_START_PROMPT.md)
- [開発タスク](docs/BACKLOG.md)
- [将来のMCP入出力仕様](docs/MCP_CONTRACT.md)

### Codex用の開発設定

Codexはリポジトリ直下の `AGENTS.md` を読み込みます。反復作業は `.agents/skills/` に、必要時の専門レビューは `.codex/agents/` に定義しています。モデル名は固定していません。

## GitHubへ登録

最初は**private（非公開）リポジトリ**を推奨。GitHub CLI（コマンドラインツール）にログインした上で：

```bash
git init -b main
git add .
git commit -m "chore: initialize offline-first agent architect"
gh repo create universal-agent-architect --private --source=. --remote=origin --push
```

または `bash scripts/publish-to-github.sh` で同等の操作を行えます。**どちらもネットワークに送信するため、利用者が明示的に実行する操作です。** この配布ファイルからGitHubリポジトリはまだ作成されません。

## スコープ外（現時点）

プロジェクトの任意コードの実行、外部MCPサーバの自動起動、AIモデルの自動ダウンロード、完全な静的構文解析、AIによる自然言語要件の自動理解、複数サービスのネイティブ設定生成、ゼロ保持を保証するクラウドAI接続。

ライセンスは公開方針を決定してから追加します（現時点では未選択）。
