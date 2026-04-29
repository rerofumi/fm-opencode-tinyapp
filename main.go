package main

import (
	"context"
	"embed"
	"encoding/json"
	"flag"
	"fmt"
	"io/fs"
	"log"
	"net/http"
	"path"
	"reflect"
	"os"
	"os/signal"
	"strings"
	"syscall"

	"github.com/wailsapp/wails/v2"
	"github.com/wailsapp/wails/v2/pkg/options"
	"github.com/wailsapp/wails/v2/pkg/options/assetserver"
)

//go:embed all:frontend/dist
var assets embed.FS

func main() {
	serve := flag.Bool("serve", false, "serve the frontend over HTTP for remote browser access")
	host := flag.String("host", "0.0.0.0", "host interface for --serve mode")
	port := flag.Int("port", 34115, "port number for --serve mode")
	flag.Parse()

	if *serve {
		if err := runHTTPServer(*host, *port); err != nil {
			log.Fatalf("serve mode failed: %v", err)
		}
		return
	}

	app := NewApp()

	err := wails.Run(&options.App{
		Title:  "fm-opencode-tinyapp",
		Width:  1224,
		Height: 768,
		AssetServer: &assetserver.Options{
			Assets: assets,
		},
		BackgroundColour: &options.RGBA{R: 27, G: 38, B: 54, A: 1},
		OnStartup:        app.startupWails,
		Bind: []interface{}{
			app,
		},
	})

	if err != nil {
		println("Error:", err.Error())
	}
}

func runHTTPServer(host string, port int) error {
	app := NewApp()
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	app.startup(ctx)

	eventBroker := newEventBroker()
	app.eventEmitter = eventBroker.Emit
	app.startEventForwardingAsync()

	distFS, err := fs.Sub(assets, "frontend/dist")
	if err != nil {
		return fmt.Errorf("failed to open embedded frontend files: %w", err)
	}

	fileServer := http.FileServer(http.FS(distFS))
	mux := http.NewServeMux()
	mux.HandleFunc("/__bridge/call", makeBridgeCallHandler(app))
	mux.HandleFunc("/__bridge/events", eventBroker.ServeHTTP)
	mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		cleanPath := path.Clean(strings.TrimPrefix(r.URL.Path, "/"))
		if cleanPath == "." {
			cleanPath = ""
		}
		if cleanPath != "" {
			if _, statErr := fs.Stat(distFS, cleanPath); statErr == nil {
				fileServer.ServeHTTP(w, r)
				return
			}
		}

		http.ServeFileFS(w, r, distFS, "index.html")
	})

	addr := fmt.Sprintf("%s:%d", host, port)
	log.Printf("Serving fm-opencode-tinyapp on http://%s", addr)
	server := &http.Server{Addr: addr, Handler: mux}
	errCh := make(chan error, 1)
	go func() { errCh <- server.ListenAndServe() }()

	sigCh := make(chan os.Signal, 1)
	signal.Notify(sigCh, syscall.SIGINT, syscall.SIGTERM)
	select {
	case sig := <-sigCh:
		log.Printf("Received %s. Shutting down...", sig)
	case err := <-errCh:
		if err != nil && err != http.ErrServerClosed {
			return err
		}
	}
	cancel()
	return server.Shutdown(context.Background())
}

type bridgeRequest struct {
	Method string            `json:"method"`
	Args   []json.RawMessage `json:"args"`
}

func makeBridgeCallHandler(app *App) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
			return
		}
		var req bridgeRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}
		result, err := callAppMethod(app, req.Method, req.Args)
		if err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}
		_ = json.NewEncoder(w).Encode(map[string]any{"result": result})
	}
}

func callAppMethod(app *App, methodName string, args []json.RawMessage) (any, error) {
	method := reflect.ValueOf(app).MethodByName(methodName)
	if !method.IsValid() {
		return nil, fmt.Errorf("unknown method: %s", methodName)
	}
	methodType := method.Type()
	if methodType.NumIn() != len(args) {
		return nil, fmt.Errorf("invalid arg count for %s", methodName)
	}
	callArgs := make([]reflect.Value, methodType.NumIn())
	for i := 0; i < methodType.NumIn(); i++ {
		argPtr := reflect.New(methodType.In(i))
		if err := json.Unmarshal(args[i], argPtr.Interface()); err != nil {
			return nil, err
		}
		callArgs[i] = argPtr.Elem()
	}
	out := method.Call(callArgs)
	if len(out) == 0 {
		return nil, nil
	}
	last := out[len(out)-1].Interface()
	if last != nil {
		if err, ok := last.(error); ok {
			return nil, err
		}
	}
	if len(out) == 1 {
		return nil, nil
	}
	return out[0].Interface(), nil
}
