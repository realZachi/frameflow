import path from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const moonshotKey = env['MOONSHOT_API_KEY'] ?? ''

  // Proxy instead of a direct browser call: the Moonshot API does not allow CORS,
  // and the key remains server-side (no VITE_ prefix, never included in the bundle).
  const moonshotProxy = {
    '/api/moonshot': {
      target: 'https://api.moonshot.ai',
      changeOrigin: true,
      rewrite: (path: string) => path.replace(/^\/api\/moonshot/, ''),
      headers: { Authorization: `Bearer ${moonshotKey}` },
    },
  }

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      host: '127.0.0.1',
      port: Number(process.env['PORT']) || 4173,
      proxy: moonshotProxy,
    },
    preview: {
      proxy: moonshotProxy,
    },
  }
})
