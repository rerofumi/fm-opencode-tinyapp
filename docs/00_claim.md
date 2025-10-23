# opencode を API 経由で操作する簡易 GUI の作成

## 機能

Web UI として HTML と React で作成、 Wails にてアプリ化
opencode とは API でやり取り
opencode API アクセスは Wails のアプリ層で実装、Web UI からは Wails アプリ層を介して opencode にアクセスする
Web UI からエージェントに指令を与えることができる
エージェントからの返答は Web stream にて表示

## Web UI

エージェントへの指令を入力するテキストボックス、 Ctrl＋Enter で送信、Enter は改行入力
エージェントからの返答を表示するテキストボックス、 Stream API を使うが Wails APP層を介している
モデルを切り替えるドロップダウンメニュー、モデル一覧は API で取得する
現在の session 表示と、他のセッションに切り替えられるドロップダウンメニュー
新しいセッションを始める New Session ボタン

## 使用する opencode API
- GET /event
- GET,POST,DELETE /session
- POST /session/${sessionId}/message
- GET /app
- POST /app/init
- GET /config
