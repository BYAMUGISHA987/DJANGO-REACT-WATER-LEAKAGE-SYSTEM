import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
function normalizeBasePath(value, fallback) {
  if (!value) {
    return fallback
  }

  const trimmedValue = value.replace(/^\/+|\/+$/g, '')
  return trimmedValue ? `/${trimmedValue}/` : '/'
}

export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const publicBasePath = process.env.VITE_PUBLIC_BASE_PATH || env.VITE_PUBLIC_BASE_PATH

  return {
    base:
      command === 'build'
        ? normalizeBasePath(publicBasePath, '/static/')
        : '/',
    plugins: [react()],
    server: {
      proxy: {
        '/api': 'http://127.0.0.1:8000',
        '/media': 'http://127.0.0.1:8000',
      },
    },
  }
})
