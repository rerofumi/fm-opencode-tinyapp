package main

import (
	"embed"
	"flag"
	"fmt"
	"io/fs"
	"log"
	"net/http"
	"path"
	"strings"

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
		OnStartup:        app.startup,
		Bind: []interface{}{
			app,
		},
	})

	if err != nil {
		println("Error:", err.Error())
	}
}

func runHTTPServer(host string, port int) error {
	distFS, err := fs.Sub(assets, "frontend/dist")
	if err != nil {
		return fmt.Errorf("failed to open embedded frontend files: %w", err)
	}

	fileServer := http.FileServer(http.FS(distFS))
	handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
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
	return http.ListenAndServe(addr, handler)
}
