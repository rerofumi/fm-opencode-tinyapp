# fm-opencode-tinyapp

サーバーモードの OpenCode に対しリクエストを送信し操作するための GUI インタフェース。

ターミナル+CLI 環境で非 ASCII 文字（日本語など）を入力すると画面が崩れたりログがたどれなかったりする問題を解決するため、テキスト入力を容易にする GUI サポートツール。

[opencode-web](https://github.com/chris-tse/opencode-web) にインスパイアされています。

## 機能

- OpenCode Server への API 接続と GUI 操作
- ストリーミング応答によるリアルタイムチャット
- セッション管理（作成・切替・削除）
- モデル選択（プロバイダー別にグループ化）
- ファイル操作（検索・シンボル検索・ファイル読み込み）
- LLM を利用した文章校正機能
- マークダウンレンダリングとコードシンタックスハイライト

## 構成

**Wails v2** アプリケーション

- バックエンド: Go 1.23
- フロントエンド: React 18 + TypeScript + Vite
- 開発ツール環境: mise で管理

## 前提条件

- [Go](https://go.dev/) 1.23 以上
- [Node.js](https://nodejs.org/) 18 以上
- [Wails CLI](https://wails.io/) v2.10+
  ```bash
  go install github.com/wailsapp/wails/v2/cmd/wails@latest
  ```
- Windows: [Microsoft Edge WebView2 Runtime](https://developer.microsoft.com/en-us/microsoft-edge/webview2/)
- (推奨) [mise](https://mise.jdx.dev/) - 開発環境管理

## 開発環境セットアップ

### mise を使う場合（推奨）

```bash
# 必要なツールをインストール
mise install

# Wails CLI をインストール
go install github.com/wailsapp/wails/v2/cmd/wails@latest

# 環境を確認
wails doctor
```

### 手動セットアップ

```bash
# Go と Node.js をインストール後
go install github.com/wailsapp/wails/v2/cmd/wails@latest

# フロントエンド依存関係をインストール
cd frontend
npm install
cd ..

# 環境を確認
wails doctor
```

## ビルド手順

### 開発モード

```bash
wails dev
```

または mise タスクを使用:

```bash
mise run dev
```

### 本番ビルド

```bash
wails build
```

ビルド成果物は `build/bin/` に生成されます。

## 使い方

### 1. OpenCode Server への接続設定

1. アプリを起動
2. 設定画面（⚙️ アイコン）を開く
3. 以下を設定:
   - **Server URL**: OpenCode Server のアドレス（例: `http://localhost:8000`）
   - **Provider/Model**: 使用するモデルを選択
   - (オプション) **LLM 設定**: 文章校正用の LLM API 設定（Base URL, API Key, Model, Prompt）

### 2. 基本操作

- **メッセージ送信**: `Ctrl+Enter` で送信、`Enter` で改行
- **新規セッション**: サイドバーの "New Session" ボタンまたは `Ctrl+N`
- **セッション切替**: サイドバーのリストから選択
- **モデル変更**: ヘッダーのドロップダウンから選択
- **文章校正**: 入力欄の「推敲」ボタンをクリック

### 3. キーボードショートカット

| キー | 動作 |
|------|------|
| `Ctrl+Enter` | メッセージ送信 |
| `Ctrl+N` | 新規セッション作成 |
| `Ctrl+,` | 設定画面を開く |
| `Escape` | 入力キャンセル |

## ライセンス

このプロジェクトは MIT ライセンスの下で公開されています。

## 作者

**rerofumi** - [GitHub](https://github.com/rerofumi) - rero2@yuumu.org

## 参考

- [OpenCode](https://github.com/stackblitz/opencode) - AI-powered coding assistant
- [opencode-web](https://github.com/chris-tse/opencode-web) - Web UI for OpenCode (Inspiration)

