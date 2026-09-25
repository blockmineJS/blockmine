import path from "path"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"
import monacoEditorPlugin from 'vite-plugin-monaco-editor';

function nodePinsForBrowser() {
  return {
    name: 'node-pins-for-browser',
    enforce: 'pre',
    transform(code, id) {
      const normalized = id.split('?')[0].replace(/\\/g, '/');
      if (!normalized.endsWith('/shared/nodePins.cjs')) return null;
      const withoutExports = code.replace(/module\.exports\s*=\s*\{[\s\S]*?\};?\s*$/, '');
      return {
        code: `${withoutExports}\nexport { isDynamicNodeType, computeDynamicInputs, computeDynamicOutputs, applyDynamicPins, withVariablePins };\n`,
        map: null,
      };
    },
  };
}

export default defineConfig({
  plugins: [
    nodePinsForBrowser(),
    react(),
    monacoEditorPlugin.default({})
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@node-catalog": path.resolve(__dirname, "../shared/nodePins.cjs"),
    },
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
    allowedHosts: ['glibly-steadfast-squid.cloudpub.ru'],
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