# OpenCode Server — API チートシート（コンパクト）

Base URL: `http://<hostname>:<port>`
OpenAPI spec: `GET /doc`

---
## 型定義 (抜粋)
- **Session**: `{ id, projectID, title, time: { created, updated } }`
- **Message**: `UserMessage | AssistantMessage`
- **UserMessage**: `{ id, sessionID, role: "user", time: { created } }`
- **AssistantMessage**: `{ id, sessionID, role: "assistant", time: { created, completed? }, modelID, providerID }`
- **Part**: `TextPart | ToolPart | FilePart | ...`
- **TextPart**: `{ id, type: "text", text }`
- **Event**: `{ type: string, properties: object }` (例: `type: "message.part.updated"`, `properties: { part: Part }`)

---

## App
- GET  /app  
  - 説明: アプリ情報取得  
  - レスポンス: `App` (型定義は `doc.json` 参照)
- POST /app/init  
  - 説明: アプリ初期化  
  - レスポンス: `boolean`

---

## Config
- GET  /config  
  - 説明: 設定取得  
  - レスポンス: `Config` (`{ theme?, model?, keybinds?, ... }`)
- GET  /config/providers  
  - 説明: プロバイダ一覧とデフォルトモデル  
  - レスポンス: `{ providers: Provider[], default: { [id]: model } }`
    - `Provider`: `{ id, name, models: { [id]: Model } }`
    - `Model`: `{ id, name, limit: { context, output } }`

---

## Sessions
- GET    /session  
  - 説明: セッション一覧  
  - レスポンス: `Session[]`
- GET    /session/:id  
  - 説明: セッション取得  
  - レスポンス: `Session`
- GET    /session/:id/children  
  - 説明: 子セッション一覧  
  - レスポンス: `Session[]`
- POST   /session  
  - 説明: セッション作成  
  - Body: `{ parentID?: string, title?: string }`  
  - レスポンス: `Session`
- DELETE /session/:id  
  - 説明: セッション削除
- PATCH  /session/:id  
  - 説明: セッション更新（プロパティ）  
  - Body: `{ title?: string }`  
  - レスポンス: `Session`
- POST   /session/:id/init  
  - 説明: アプリ解析して `AGENTS.md` 作成  
  - Body: `{ messageID, providerID, modelID }`
- POST   /session/:id/abort  
  - 説明: 実行中セッションを中止
- POST   /session/:id/share  
  - 説明: セッション共有  
  - レスポンス: `Session`
- DELETE /session/:id/share  
  - 説明: 共有解除  
  - レスポンス: `Session`
- POST   /session/:id/summarize  
  - 説明: セッション要約作成
- GET    /session/:id/message  
  - 説明: セッション内メッセージ一覧  
  - レスポンス: `[{ info: Message, parts: Part[] }]`
- GET    /session/:id/message/:messageID  
  - 説明: メッセージ詳細取得  
  - レスポンス: `{ info: Message, parts: Part[] }`
- POST   /session/:id/message  
  - 説明: チャットメッセージ送信  
  - Body (`ChatInput`): `{ parts: PartInput[], model?: { providerID, modelID }, ... }`
    - `PartInput`: `{ type: "text", text } | { type: "file", ... }`
  - レスポンス: `{ info: AssistantMessage, parts: Part[] }`
- POST   /session/:id/shell  
  - 説明: シェルコマンド実行  
  - Body (`CommandInput`): `{ agent, command }`
  - レスポンス: `AssistantMessage`
- POST   /session/:id/revert  
  - 説明: メッセージを元に戻す（revert）  
  - Body: `{ messageID, partID? }`
- POST   /session/:id/unrevert  
  - 説明: revert したものを復元
- POST   /session/:id/permissions/:permissionID  
  - 説明: パーミッション要求に応答  
  - Body: `{ response: "once" | "always" | "reject" }`

---

## Files
- GET  /find?pattern=<pat>  
  - 説明: ファイル内テキスト検索  
  - レスポンス: `[{ path: {text}, lines: {text}, line_number, ... }]`
- GET  /find/file?query=<q>  
  - 説明: ファイル名検索  
  - レスポンス: `string[]`（ファイルパス）
- GET  /find/symbol?query=<q>  
  - 説明: ワークスペースシンボル検索  
  - レスポンス: `Symbol[]`
    - `Symbol`: `{ name, kind, location: { uri, range } }`
- GET  /file/content?path=<path>
  - 説明: ファイル読み取り
  - レスポンス: `FileContent` (`{ content, diff?, patch? }`)
- GET  /file/status  
  - 説明: 追跡ファイルのステータス取得  
  - レスポンス: `File[]`
    - `File`: `{ path, added, removed, status }`

---

## Logging
- POST /log  
  - 説明: ログ書き込み  
  - Body: `{ service, level, message, extra? }`  
  - レスポンス: `boolean`

---

## Agents
- GET /agent  
  - 説明: 利用可能エージェント一覧  
  - レスポンス: `Agent[]`
    - `Agent`: `{ name, description, mode, model, ... }`

---

## TUI (TUI をサーバ経由で操作)
- POST /tui/append-prompt      — Append text to prompt (Body: `{ text }`) → `boolean`
- POST /tui/open-help          — Open help dialog → `boolean`
- POST /tui/open-sessions      — Open session selector → `boolean`
- POST /tui/open-themes        — Open theme selector → `boolean`
- POST /tui/open-models        — Open model selector → `boolean`
- POST /tui/submit-prompt      — Submit current prompt → `boolean`
- POST /tui/clear-prompt       — Clear prompt → `boolean`
- POST /tui/execute-command    — Execute command. Body: `{ command }` → `boolean`
- POST /tui/show-toast         — Show toast. Body: `{ title?, message, variant }` → `boolean`
- GET  /tui/control/next       — Wait for next control request → Control request object
- POST /tui/control/response   — Respond to control request. Body: `{ body }` → `boolean`

---

## Auth
- PUT /auth/:id  
  - 説明: 認証情報設定
  - Body: `ApiAuth | OAuth | ...`
    - `ApiAuth`: `{ type: "api", key }`
  - レスポンス: `boolean`

---

## Events
- GET /event  
  - 説明: Server-Sent Events ストリーム  
  - レスポンス (ストリーム): `Event` オブジェクトが流れてくる
    - `Event`: `{ type: string, properties: object }`
    - イベント例:
      - `server.connected`
      - `message.updated`, `properties: { info: Message }`
      - `message.part.updated`, `properties: { part: Part }`
      - `session.updated`, `properties: { info: Session }`

---

## Docs
- GET /doc  
  - 説明: OpenAPI 3.1 仕様(json)

---

メモ:
- これは `doc.json` を元にしたコンパクトなサマリです。完全な型定義は OpenAPI spec (`/doc`) を参照してください。
- クエリパラメータは URL に明示。パスパラメータは `:id` 等で示す。
