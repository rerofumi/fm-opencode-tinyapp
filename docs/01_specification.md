# OpenCode GUI アプリケーション仕様書

## 1. 概要

### 1.1 アプリケーション概要
- **名称**: OpenCode GUI Client
- **目的**: OpenCode Server を API 経由で操作するデスクトップ GUI アプリケーション
- **技術スタック**: Wails v3 (Go + React + TypeScript)
- **対象プラットフォーム**: Windows, macOS, Linux

### 1.2 アーキテクチャ概要
```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   React UI      │◄──►│   Wails App      │◄──►│  OpenCode API   │
│   (Frontend)    │    │   (Backend)      │    │   (Server)      │
│                 │    │                  │    │                 │
│ - チャットUI     │    │ - APIクライアント │    │ - REST API      │
│ - セッション管理 │    │ - ストリーム処理   │    │ - SSE           │
│ - 設定画面       │    │ - 状態管理       │    │                 │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

## 2. 機能要件

### 2.1 コア機能

#### 2.1.1 チャット機能
- **メッセージ入力**
  - マルチラインテキスト入力対応
  - ショートカットキー: `Ctrl+Enter` で送信、`Enter` で改行
  - リアルタイム文字数表示
  - 入力履歴機能（↑↓キーでナビゲーション）
  - 送信メッセージの即時表示

- **メッセージ表示**
  - リアルタイムストリーミング表示
  - マークダウンレンダリング対応 (`react-markdown` 使用)
  - コードシンタックスハイライト
  - タイムスタンプ表示
  - メッセージ状態（送信中、完了、エラー）
  - 新規メッセージ受信時の自動スクロール
  - スクロールアップ時に最下部へのスクロールボタン表示

#### 2.1.2 セッション管理
- **セッション一覧**
  - 現在アクティブなセッションの表示
  - セッション切り替えドロップダウン
  - セッション作成日時、最終更新日時表示

- **セッション操作**
  - 新規セッション作成 (`New Session` ボタン)
  - セッションタイトル編集
  - セッション削除（確認ダイアログ付き）
  - セッションのエクスポート/インポート

#### 2.1.3 モデル管理
- **モデル選択**
  - ヘッダーにモデル選択用ドロップダウンを配置
  - 利用可能なモデルの一覧表示
  - プロバイダーごとのグループ化
  - デフォルトモデルの設定
  - モデル切り替え時の即時反映
  - ステータスバーに現在使用中のモデルを表示

### 2.2 設定機能

#### 2.2.1 接続設定
- OpenCode Server の接続先設定
- ホスト名、ポート番号設定
- 接続テスト機能
- SSL/TLS 対応

#### 2.2.2 UI設定
- テーマ切り替え（ライト/ダーク）
- フォントサイズ調整
- エディタ設定（タブサイズ、ソフトラップ等）

## 3. 技術仕様

### 3.1 Wails アプリケーション構造

```
fm-opencode-tinyapp/
├── app.go                    # Wails メインアプリケーション
├── wails.json               # Wails 設定ファイル
├── main.go                  # アプリケーションエントリーポイント
├── embed.go                 # フロントエンド埋め込み
├── internal/                # Go バックエンド
│   ├── api/                 # OpenCode API クライアント
│   │   ├── client.go        # APIクライアント実装
│   │   ├── types.go         # APIレスポンス型定義
│   │   └── stream.go        # SSEストリーム処理
│   ├── models/              # データモデル
│   │   ├── session.go       # セッションモデル
│   │   ├── message.go       # メッセージモデル
│   │   └── config.go        # 設定モデル
│   └── services/            # ビジネスロジック
│       ├── session.go       # セッションサービス
│       ├── message.go       # メッセージサービス
│       └── config.go        # 設定サービス
└── frontend/                # React フロントエンド
    ├── src/
    │   ├── components/      # React コンポーネント
    │   │   ├── Chat/        # チャット関連
    │   │   ├── Session/     # セッション管理
    │   │   ├── Settings/    # 設定画面
    │   │   └── Common/      # 共通コンポーネント
    │   ├── hooks/           # カスタムフック
    │   ├── services/        # APIサービス
    │   ├── types/           # TypeScript型定義
    │   ├── utils/           # ユーティリティ
    │   └── App.tsx          # メインアプリケーション
    ├── package.json
    └── wailsjs/             # Wails 生成ファイル
```

### 3.2 API インターフェース仕様

#### 3.2.1 Wails バックエンド API

```go
// app.go
type App struct {
    ctx            context.Context
    configService  *config.Service
    apiClient      *api.Client
    streamClient   *api.StreamClient
    sessionService *services.SessionService
    messageService *services.MessageService
    eventChan      <-chan *models.Event
    logger         *logrus.Logger
}

// === 設定関連 ===
func (a *App) GetConfig() (*models.Config, error)
func (a *App) UpdateConfig(config *models.Config) error
func (a *App) UpdateServerURL(url string) error
func (a *App) UpdateProvider(provider, model string) error
func (a *App) GetProviders() (*models.ProvidersResponse, error)
func (a *App) TestConnection() error

// === アプリ情報関連 ===
func (a *App) GetAppInfo() (*models.AppInfo, error)
func (a *App) InitApp() (bool, error)

// === セッション関連 ===
func (a *App) GetSessions() ([]models.Session, error)
func (a *App) GetSession(id string) (*models.Session, error)
func (a *App) CreateSession(title string) (*models.Session, error)
func (a *App) UpdateSession(id string, title string) (*models.Session, error)
func (a *App) DeleteSession(id string) error
func (a *App) GetSessionChildren(id string) ([]models.Session, error)
func (a *App) ShareSession(id string) (*models.Session, error)
func (a *App) UnshareSession(id string) (*models.Session, error)
func (a *App) SummarizeSession(id string) error
func (a *App) AbortSession(id string) error
func (a *App) InitSession(id string, messageID, providerID, modelID string) error

// === メッセージ関連 ===
func (a *App) GetMessages(sessionID string) ([]models.MessageWithParts, error)
func (a *App) GetMessage(sessionID string, messageID string) (*models.MessageWithParts, error)
func (a *App) SendMessage(sessionID string, req *models.ChatInput) (*models.Message, error)
func (a *App) ExecuteCommand(sessionID string, req *models.CommandInput) (*models.Message, error)
func (a *App) RevertMessage(sessionID string, messageID string) error
func (a *App) UnrevertMessage(sessionID string) error

// === ファイル操作関連 ===
func (a *App) FindInFiles(pattern string) ([]models.SearchResult, error)
func (a *App) FindFiles(query string) ([]string, error)
func (a *App) FindSymbols(query string) ([]models.Symbol, error)
func (a *App) ReadFile(path string) (*models.FileContent, error)
func (a *App) GetFileStatus() ([]models.File, error)

// === その他 ===
func (a *App) GetAgents() ([]models.Agent, error)
func (a *App) WriteLog(entry *models.LogEntry) (bool, error)
func (a *App) SetAuth(id string, auth interface{}) (bool, error)

// === ストリーミング ===
// イベントストリームはStreamClientが内部管理
```

#### 3.2.2 OpenCode API マッピング

| 機能 | Wailsメソッド | OpenCode API | 実装状況 |
|------|---------------|--------------|----------|
| アプリ情報取得 | `GetAppInfo()` | `GET /app` | ✅ |
| アプリ初期化 | `InitApp()` | `POST /app/init` | ✅ |
| 設定取得 | `GetConfig()` | `GET /config` | ✅ |
| 設定更新 | `UpdateConfig()` | `PUT /config` | ❓ |
| プロバイダ一覧 | `GetProviders()` | `GET /config/providers` | ✅ |
| 接続テスト | `TestConnection()` | - | ✅ |
| セッション一覧 | `GetSessions()` | `GET /session` | ✅ |
| セッション取得 | `GetSession()` | `GET /session/:id` | ✅ |
| セッション作成 | `CreateSession()` | `POST /session` | ✅ |
| セッション更新 | `UpdateSession()` | `PATCH /session/:id` | ✅ |
| セッション削除 | `DeleteSession()` | `DELETE /session/:id` | ✅ |
| セッション子一覧 | `GetSessionChildren()` | `GET /session/:id/children` | ✅ |
| セッション共有 | `ShareSession()` | `POST /session/:id/share` | ✅ |
| セッション非共有 | `UnshareSession()` | `DELETE /session/:id/share` | ✅ |
| セッション要約 | `SummarizeSession()` | `POST /session/:id/summarize` | ✅ |
| セッション中断 | `AbortSession()` | `POST /session/:id/abort` | ✅ |
| セッション初期化 | `InitSession()` | `POST /session/:id/init` | ✅ |
| メッセージ一覧 | `GetMessages()` | `GET /session/:id/message` | ✅ |
| メッセージ取得 | `GetMessage()` | `GET /session/:id/message/:id` | ✅ |
| メッセージ送信 | `SendMessage()` | `POST /session/:id/message` | ✅ |
| メッセージ復元 | `RevertMessage()` | `POST /session/:id/revert` | ✅ |
| メッセージ復元取消 | `UnrevertMessage()` | `POST /session/:id/unrevert` | ✅ |
| ファイル読み込み | `ReadFile()` | `GET /file` | ✅ |
| ファイル状態取得 | `GetFileStatus()` | `GET /file/status` | ✅ |
| ファイル検索 | `FindFiles()` | `GET /find/file` | ✅ |
| ファイル内検索 | `FindInFiles()` | `GET /find` | ✅ |
| シンボル検索 | `FindSymbols()` | `GET /find/symbol` | ✅ |
| エージェント一覧 | `GetAgents()` | `GET /agent` | ✅ |
| コマンド実行 | `ExecuteCommand()` | `POST /session/:id/shell` | ✅ |
| 認証設定 | `SetAuth()` | `PUT /auth/:id` | ✅ |
| ログ書き込み | `WriteLog()` | `POST /log` | ✅ |
| イベント購読 | `StreamClient.SubscribeEvents()` | `GET /event` | ✅ |

### 3.3 データモデル

*注: 以下のデータモデルは `doc.json` (OpenAPI仕様) に基づく主要なフィールドの抜粋です。完全な定義は `doc.json` を参照してください。*

#### 3.3.1 セッションモデル (`Session`)
```go
type Session struct {
    ID        string    `json:"id"`
    ProjectID string    `json:"projectID"`
    Title     string    `json:"title"`
    ParentID  *string   `json:"parentID,omitempty"`
    Time      struct {
        Created int64 `json:"created"`
        Updated int64 `json:"updated"`
    } `json:"time"`
    Share     *struct {
        URL string `json:"url"`
    } `json:"share,omitempty"`
}
```

#### 3.3.2 メッセージモデル (`Message`, `Part`)
```go
// Messageは "user" と "assistant" の2種類に大別される
type Message interface {
    // 共通フィールド
    GetID() string
    GetSessionID() string
    GetRole() string
}

type UserMessage struct {
    ID        string `json:"id"`
    SessionID string `json:"sessionID"`
    Role      string `json:"role"` // "user"
    Time      struct {
        Created int64 `json:"created"`
    } `json:"time"`
}

type AssistantMessage struct {
    ID         string `json:"id"`
    SessionID  string `json:"sessionID"`
    Role       string `json:"role"` // "assistant"
    ModelID    string `json:"modelID"`
    ProviderID string `json:"providerID"`
    Time       struct {
        Created   int64 `json:"created"`
        Completed int64 `json:"completed,omitempty"`
    } `json:"time"`
    // ... その他 cost, tokens などのメタデータ
}

// MessageWithParts はAPIレスポンスで使われる構造
type MessageWithParts struct {
    Info  Message `json:"info"`
    Parts []Part  `json:"parts"`
}

// Partはメッセージの構成要素
type Part interface {
    GetType() string
}

type TextPart struct {
    ID   string `json:"id"`
    Type string `json:"type"` // "text"
    Text string `json:"text"`
}

type ToolPart struct {
    ID    string `json:"id"`
    Type  string `json:"type"` // "tool"
    Tool  string `json:"tool"`
    State string `json:"state"` // "running", "completed", "error"
}

// ... その他 FilePart, ReasoningPart など多数
```

#### 3.3.3 設定モデル (`Config`)
*注: ここで示す `Config` は `GET /config` で取得されるサーバー設定です。GUIアプリケーションのローカル設定（`ServerURL`など）は別途管理されます。*
```go
type Config struct {
    Theme      string                `json:"theme,omitempty"`
    Model      string                `json:"model,omitempty"`
    Agent      map[string]AgentConfig `json:"agent,omitempty"`
    Provider   map[string]any        `json:"provider,omitempty"`
    Keybinds   any                   `json:"keybinds,omitempty"` // KeybindsConfig
    // ... その他多数の設定項目
}

type AgentConfig struct {
    Model       string            `json:"model,omitempty"`
    Temperature float64           `json:"temperature,omitempty"`
    Prompt      string            `json:"prompt,omitempty"`
    Tools       map[string]bool   `json:"tools,omitempty"`
}
```

### 3.4 フロントエンド仕様

#### 3.4.1 コンポーネント構成

```typescript
// メインコンポーネント
const App: React.FC = () => {
  const [config, setConfig] = useState<models.Config | null>(null);
  const [sessions, setSessions] = useState<models.Session[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  
  // エラーハンドリング改善済み、設定画面アクセス可能
};

// チャットコンポーネント
const ChatPanel: React.FC = ({ sessionId, sessionTitle }) => {
  const [messages, setMessages] = useState<models.MessageWithParts[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  // メッセージ送信処理、ストリーミング受信処理実装済み
};

// セッション管理コンポーネント
const SessionList: React.FC = ({ sessions, currentSessionId, onSessionSelect, onSessionCreate, onSessionDelete }) => {
  // セッション一覧表示、作成、削除、切り替え実装済み
};

// 設定コンポーネント
const Settings: React.FC = ({ onClose }) => {
  // 接続設定、プロバイダー選択、UI設定実装済み
};
```

#### 3.4.2 ステート管理
- React useState + useEffect で状態管理
- ローカルストレージでの設定永続化（config.json）
- エラーハンドリングの分離による UX 向上
- 設定読み込み失敗でもアプリ起動を継続

#### 3.4.3 スタイリング
- 通常のCSS + CSS変数を使用
- 独自デザインシステム（Material-UI/Chakra UI未使用）
- ダークテーマ対応完了
- レスポンシブデザイン対応完了
- アニメーション効果実装済み

## 4. UI/UX 仕様

### 4.1 レイアウト設計

```
┌─────────────────────────────────────────────────────────────┐
│ Header                                                      │
│ ┌─────────────┐  ┌──────────────────────────────────────┐ │
│ │ OpenCode GUI│  │ Model change: [Provider: Model Name ▼]  [⚙️] │
│ └─────────────┘  └──────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────┤
│ Sidebar (セッション一覧) │        Main Content              │
│                          │                                 │
│ - セッションリスト         │  ┌─────────────────────────────┐ │
│ - 新規作成ボタン           │  │        Chat Messages        │ │
│                          │  │                             │ │
│                          │  └─────────────────────────────┘ │
│                          │  ┌─────────────────────────────┐ │
│                          │  │       Input Area            │ │
│                          │  │   [テキスト入力ボックス]       │ │
│                          │  └─────────────────────────────┘ │
├─────────────────────────────────────────────────────────────┤
│ StatusBar (接続状態, セッション数, モデル名)                   │
└─────────────────────────────────────────────────────────────┘

実装済み機能:
- ヘッダー: タイトル、モデル選択ドロップダウン、設定ボタン
- サイドバー: SessionListコンポーネント
- メインコンテンツ: ChatPanelコンポーネント  
- ステータスバー: 接続状態表示, セッション数, 現在のモデル名
- 設定画面: モーダル形式のSettingsコンポーネント
```

### 4.2 インタラクション仕様

#### 4.2.1 キーボードショートカット
- `Ctrl+Enter`: メッセージ送信
- `Ctrl+N`: 新規セッション作成
- `Ctrl+,`: 設定画面を開く
- `Ctrl+1..9`: セッション切り替え
- `Escape`: 入力キャンセル

#### 4.2.2 マウス操作
- セッションリスト: クリックで切り替え
- セッション削除: 削除ボタン
- 設定画面: 設定ボタン(⚙️)クリック
- メッセージ: 表示のみ
- ドラッグ＆ドロップ: ファイル添付

### 4.3 レスポンシブ対応
- 最小幅: 800px
- サイドバー: 280px (折りたたみ可能)
- モバイルビュー: サイドバーをオーバーレイ表示

## 5. エラー処理

### 5.1 ネットワークエラー
- 自動リトライ機構（指数バックオフ）
- オフラインモード表示
- 接続回復時の自動再同期

### 5.2 APIエラー
- エラーメッセージのユーザーフレンドリーな表示
- 設定読み込みとセッション読み込みの分離
- 接続エラー時でも設定画面にアクセス可能
- バリデーションエラーの表示
- 権限エラーの適切なハンドリング

### 5.3 アプリケーションエラー
- クラッシュレポート機能
- ログファイルの出力
- データ破損防止のためのバックアップ機構
- グラースフルデグラデーション

## 6. 開発・デプロイ仕様

### 6.1 開発環境
- Go 1.21+
- Node.js 18+
- React 18+
- TypeScript 5+

### 6.2 ビルドプロセス
- Wails CLI でのビルド
- フロントエンド: Vite でのバンドル
- コード署名（本番ビルド）
