import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,

    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8001',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
      '/schedule': {
        target: 'http://127.0.0.1:8001',
        changeOrigin: true,
      },
      '/dbms': {
        target: 'http://127.0.0.1:8001',
        changeOrigin: true,
      },
      '/metrics': {
        target: 'http://127.0.0.1:8001',
        changeOrigin: true,
      },
      '/ai': {
        target: 'http://127.0.0.1:8001',
        changeOrigin: true,
      },
      '/health': {
        target: 'http://127.0.0.1:8001',
        changeOrigin: true,
      },
    },
  },
})
