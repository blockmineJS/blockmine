import path from "path"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"
import monacoEditorPlugin from 'vite-plugin-monaco-editor';

export default defineConfig({
  plugins: [
    react(),
    monacoEditorPlugin.default({})
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, _res) => {
            const ignoredCodes = ['ECONNABORTED', 'ECONNREFUSED', 'EACCES'];
            if (!ignoredCodes.includes(err.code)) {
              console.log('[Vite] proxy error:', err);
            }
          });
        },
      },
      '/socket.io': {
        target: 'http://localhost:3001',
        ws: true,
        changeOrigin: true,
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, _res) => {
            const ignoredCodes = ['ECONNABORTED', 'ECONNREFUSED', 'EACCES'];
            if (!ignoredCodes.includes(err.code)) {
              console.log('[Vite] proxy error:', err);
            }
          });
        },
      },
    },
  },
})