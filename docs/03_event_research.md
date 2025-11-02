# イベント処理の差分調査

## 概要
公式 Desktop GUI (packages/desktop) とこのプロジェクト (fm-opencode-tinyapp) のイベント処理方式の違いを調査した結果をまとめる。

---

## 1. メッセージ送信 (POST) の違い

### 公式 Desktop
- **クライアント**: `@opencode-ai/sdk` を使用
- **エンドポイント**: `/session/:id/prompt`
- **リクエストボディ**:
  ```json
  {
    "agent": "agent-name",
    "model": { "modelID": "...", "providerID": "..." },
    "parts": [
      { "type": "text", "text": "..." },
      { "type": "file", "mime": "...", "filename": "...", "url": "file://...", "source": {...} }
    ]
  }
  ```
- **特徴**:
  - ファイル添付をサポート (`@file` 検索/挿入)
  - ローカルプレースホルダーメッセージは作成しない
  - サーバーからのSSEイベントを待って状態を更新

### このプロジェクト
- **クライアント**: Wails の Go バックエンド経由で HTTP POST
- **エンドポイント**: 明示的には不明だが、`SendMessage` が呼ばれる
- **リクエストボディ**:
  ```typescript
  {
    "parts": [{ "type": "text", "text": "..." }],
    "model": { "providerID": "...", "modelID": "..." },
    "agent": "agent-name"
  }
  ```
- **特徴**:
  - ファイル添付機能なし (テキストのみ)
  - **ローカルでプレースホルダーのユーザーメッセージを即座に作成**
  - サーバーからのレスポンスでアシスタントメッセージを追加

**差分**:
- 公式はサーバー主導で状態を管理、このプロジェクトはクライアント側で楽観的UIを実装
- 公式はファイル添付をサポート、このプロジェクトはテキストのみ

---

## 2. イベント受信 (SSE) の違い

### 公式 Desktop
- **プロトコル**: Server-Sent Events (SSE)
- **接続方法**: 
  - `@opencode-ai/sdk` の `client.event.subscribe().sse` を使用
  - 生成されたSDKクライアントが `text/event-stream` を処理
  - `TextDecoderStream` でストリーミングをパース
- **イベント形式**:
  ```
  retry: 3000
  id: 01J7XYZABC0PQR
  event: message.part.updated
  data: {"type":"message.part.updated","properties":{"part":{...}}}
  ```
- **イベントタイプ**:
  - `session.updated`
  - `message.updated`
  - `message.part.updated`
- **イベントの流れ**:
  1. SDK が SSE ストリームを受信
  2. アプリレベルの Emitter に再ブロードキャスト (`for await (const e of events.stream) emitter.emit(e.type, e)`)
  3. Sync context がイベントをリッスンして store を更新

### このプロジェクト
- **プロトコル**: Server-Sent Events (SSE)
- **接続方法**:
  - Go の `net/http` で `/event` エンドポイントに接続
  - `bufio.Scanner` で行単位で読み取り
  - `data:` プレフィックスを検出して JSON をパース
- **イベント形式**:
  ```go
  type Event struct {
    SessionID string      `json:"sessionID"`
    MessageID string      `json:"messageID"`
    PartID    string      `json:"partID"`
    Data      interface{} `json:"data"`
  }
  ```
- **イベントの流れ**:
  1. Go の `StreamClient` が `/event` から SSE を受信
  2. Go のチャネル (`eventChan`) に Event を送信
  3. `app.go` の `startEventForwarding()` が Wails の `runtime.EventsEmit` でフロントエンドに転送
  4. React の `EventsOn('server-event')` でイベントをリッスン
  5. フロントエンドで直接 `messages` state を更新

**差分**:
- 公式は SolidJS + SDK + Sync context で3層構造
- このプロジェクトは Go (SSE受信) → Wails (イベント転送) → React (state更新) の3層だが、**中間レイヤーが異なる**
- 公式はイベントタイプで分岐 (`session.updated`, `message.updated`, `message.part.updated`)
- このプロジェクトは**単一のイベント形式** (`Event`) で、フロントエンドでメッセージ/パートを自前で管理

---

## 3. イベント→State マッピングの違い

### 公式 Desktop
- **State 管理**: Solid Signals (reactive stores)
  - `session[]`: セッション一覧
  - `message[sessionID]`: セッションごとのメッセージ配列
  - `part[messageID]`: メッセージごとのパート配列
- **イベントハンドリング**:
  - `Sync context` が専用で処理
  - イベントタイプごとに switch 文で分岐
  - `upsert` 操作でストアを更新 (ID で既存データを検索して更新または追加)
  - `sanitizePart()` でツールパートのパスをサニタイズ
- **例**:
  ```typescript
  sdk.event.listen((e) => {
    switch (e.details.type) {
      case 'session.updated':
        // session[] を upsert
      case 'message.updated':
        // message[sessionID] を upsert
      case 'message.part.updated':
        // part[messageID] を upsert
    }
  })
  ```

### このプロジェクト
- **State 管理**: React useState
  - `messages: MessageWithParts[]`: 単一配列でメッセージとパートを保持
- **イベントハンドリング**:
  - `ChatPanel.tsx` で直接処理
  - **イベントタイプの区別なし** (単一の `ServerEvent` 型)
  - メッセージID で検索 → パートID で検索 → 更新または追加
  - テキストパートの場合は**累積的に追加** (`existingPart.text += String(event.data?.text ?? '')`)
- **例**:
  ```typescript
  EventsOn('server-event', (event: ServerEvent) => {
    setMessages(prevMessages => {
      const existingMsgIndex = prevMessages.findIndex(m => m.info.id === event.messageID);
      if (existingMsgIndex !== -1) {
        // 既存メッセージを更新
        const partIndex = existingMessage.parts.findIndex(p => p.id === event.partID);
        if (partIndex !== -1) {
          // 既存パートを更新 (text を累積)
        } else {
          // 新規パートを追加
        }
      } else {
        // 新規メッセージを追加
      }
    });
  });
  ```

**差分**:
- 公式は**イベントタイプごとに専用の処理**を持ち、複数の store を管理
- このプロジェクトは**単一の messages 配列**で全てを管理し、イベントタイプの区別なし
- 公式は `upsert` で冪等性を保証、このプロジェクトは**テキストを累積**する独自ロジック

---

## 4. 進捗表示 (Progress) の違い

### 公式 Desktop
- **コンポーネント**: `MessageProgress.tsx`
- **表示内容**:
  - 完了したツール実行のリスト (アニメーション付き)
  - 最新の `reasoning` または `text` パートをライブプレビュー
  - "Thinking..." スピナー (未完了時)
- **パートタイプ**:
  - `reasoning`: 思考過程
  - `text`: テキスト出力
  - `tool`: ツール実行 (bash, read, edit, task など)
    - `state.status`: `pending | running | completed | error`
- **ツール別ステータス**:
  - `task` → "Delegating work..."
  - `read/list/grep/glob` → "Searching the codebase..."
  - `webfetch` → "Searching the web..."
  - `edit/write` → "Making edits..."
  - `bash` → "Running commands..."
  - `reasoning` → "Thinking..."
  - `text` → "Gathering thoughts..."
- **タスク委譲**:
  - `tool.task` の場合、`metadata.sessionId` から子セッションのパートを取得してマージ

### このプロジェクト
- **コンポーネント**: `ChatPanel.tsx` 内のインライン表示
- **表示内容**:
  - `isWaiting` フラグで "Thinking..." スピナーを表示
  - メッセージ送信後、サーバーからの最初のイベントを受信するまで待機状態
  - **仮のユーザーメッセージを即座に表示** (送信直後に何をリクエストしたかが分かる)
  - **進捗の詳細表示なし** (ツール実行やタスク委譲の状態は表示されない)
- **パートタイプ**:
  - `text`: テキスト内容の表示 (Markdown 対応)
  - `reasoning`: 思考過程の表示 ("💭 Thinking:" ラベル付き)
  - `tool`: ツール実行状態の表示 (ステータスアイコン付き)
  - `step-start`, `step-finish`: 内部パートとしてフィルタリングされ表示されない
  - `snapshot`, `patch`, `agent`, `retry`: メタデータパートとして表示されない

**差分**:
- 公式は**詳細な進捗タイムライン**を表示 (ツール実行、思考過程、タスク委譲)
- このプロジェクトは**シンプルな待機インジケータ + 主要パートタイプをサポート**
- 公式はパートタイプごとに異なる UI を提供、このプロジェクトも text, reasoning, tool をサポート

---

## 5. エラーハンドリングと再接続

### 公式 Desktop
- **SSE 再接続**:
  - `createSseClient` が指数バックオフを実装
  - `onSseError` コールバックで接続エラーをハンドリング
  - `retry` フィールドで再接続間隔を制御
- **エラー表示**:
  - アシスタントメッセージの `error` フィールドで表示
  - パートの `state.status === 'error'` でツール実行エラーを表示

### このプロジェクト
- **SSE 再接続**:
  - `stream.go` の `startEventStream()` が無限ループで再接続を試行
  - 接続エラー時は 5 秒待機して再接続
- **エラー表示**:
  - `SendMessage` の失敗時に `error` state を設定
  - プレースホルダーメッセージを削除

**差分**:
- 公式は SDK レベルでの洗練された再接続ロジック
- このプロジェクトはシンプルなリトライループ
- エラー表示の粒度が異なる (公式はパート単位、このプロジェクトはメッセージ単位)

---

## 6. 主要な差分まとめ

| 項目 | 公式 Desktop | このプロジェクト |
|------|--------------|------------------|
| **フレームワーク** | SolidJS | React + Wails |
| **SDK** | @opencode-ai/sdk | 自前の HTTP クライアント (Go) |
| **イベント受信** | SDK の SSE クライアント | Go の bufio.Scanner + Wails EventsEmit |
| **イベントタイプ** | `session.updated`, `message.updated`, `message.part.updated` | 単一の `Event` 型 |
| **State 管理** | 3つの reactive store (session, message, part) | 単一の messages 配列 (React useState) |
| **イベント処理** | Sync context で集中管理 | ChatPanel で直接処理 |
| **テキスト更新** | パート単位で upsert | 累積的に追加 (`text +=`) |
| **進捗表示** | 詳細なツール実行タイムライン | シンプルな待機インジケータ |
| **パートタイプ** | reasoning, text, tool (bash, read, edit, task, etc.) | text, reasoning, tool (内部パートはフィルタリング) |
| **ファイル添付** | サポート (file:// URL) | 未サポート |
| **タスク委譲** | 子セッションのパートをマージ | 未実装 |
| **エラーハンドリング** | パート単位のエラー表示 | メッセージ単位のエラー表示 |
| **再接続** | 指数バックオフ | 5秒固定リトライ |

---

## 7. 改善案

このプロジェクトを公式に近づけるための改善案:

### 実装済みの改善:

1. **イベントタイプの導入** ✅
   - `message.part.updated`, `message.updated`, `session.updated` を分岐処理
   - 新規メッセージは `message.updated` で作成、`part.updated` では作成しない
   - ユーザーメッセージは `SendMessage` 後の `GetMessages` で取得

2. **パートタイプの拡張** ✅
   - `text`: Markdown レンダリング対応
   - `reasoning`: "💭 Thinking:" ラベル付きで表示
   - `tool`: ステータスアイコン (✓/⚙️/❌) 付きで表示
   - `step-start`, `step-finish`: 内部パートとしてフィルタリング
   - `snapshot`, `patch`, `agent`, `retry`: メタデータパートとして非表示

3. **ユーザーメッセージの即座表示** ✅
   - 送信直後に仮のユーザーメッセージを表示
   - `GetMessages` で実際のメッセージを取得したら置き換え
   - ロールの不一致問題を解決

4. **空メッセージのフィルタリング** ✅
   - 表示可能なパートがないメッセージはスキップ
   - reasoning パートのみのメッセージも正しく表示

5. **メッセージ完了時の同期** ✅
   - `message.updated` で `time.completed` が設定されたら `GetMessages` で最終状態を同期
   - 最後のメッセージが表示されない問題を解決

### 今後の改善案:

1. **進捗表示の充実**:
   - `MessageProgress` コンポーネントの追加
   - ツール実行のタイムライン表示
   - 思考過程のライブプレビュー

4. **State 管理の改善**:
   - Context API や状態管理ライブラリの導入 (Redux, Zustand など)
   - イベント処理を ChatPanel から分離

5. **ファイル添付機能**:
   - ファイルピッカーの追加
   - `file://` URL のサポート

6. **再接続ロジックの改善**:
   - 指数バックオフの実装
   - 接続状態のUI表示

---

## 8. 参考資料

- 公式仕様書: `E:\programming\AI_generative\tmp\opencode\packages\desktop\webui_spec.md`
- このプロジェクトのコード:
  - Go バックエンド: `app.go`, `internal/api/stream.go`, `internal/models/event.go`
  - React フロントエンド: `frontend/src/App.tsx`, `frontend/src/components/Chat/ChatPanel.tsx`
