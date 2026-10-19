import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig(({ mode }) => {
  // In production (Vercel build), there is no local Django server.
  // API calls use the absolute VITE_API_BASE_URL injected by Vercel.
  // In development, Vite's built-in proxy forwards /api and /media to
  // the local Django server at http://127.0.0.1:8000.
  const isDev = mode === 'development'

  return {
    plugins: [react()],
    resolve: {
      alias: { '@': path.resolve(__dirname, './src') },
    },
    server: isDev
      ? {
          host: '0.0.0.0',
          port: 5173,
          strictPort: false,
          proxy: {
            '/api': {
              target: 'http://127.0.0.1:8000',
              changeOrigin: true,
              secure: false,
            },
            '/media': {
              target: 'http://127.0.0.1:8000',
              changeOrigin: true,
              secure: false,
            },
          },
        }
      : undefined,
  }
})
