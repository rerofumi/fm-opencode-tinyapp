import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path-browserify";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "#minpath": "path-browserify",
      "#minproc": "/node_modules/vfile/lib/minproc.browser.js",
      "#minurl": "/src/shims/minurl.ts",
      process: "process/browser",
    },
  },
  define: {
    global: "globalThis",
    "process.env": "{}",
    "process.cwd": '() => "/"',
    "process.platform": '"win32"',
    "process.browser": "true",
  },
  optimizeDeps: {
    include: ["process", "process/browser"],
  },
});
