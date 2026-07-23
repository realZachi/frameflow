import path from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const publicMoonshotKey = env['VITE_MOONSHOT_API_KEY']?.trim() ?? ''
  const moonshotKey = publicMoonshotKey.length > 0
    ? publicMoonshotKey
    : (env['MOONSHOT_API_KEY']?.trim() ?? '')
  const moonshotProxy = {
    '/api/moonshot': {
      target: 'https://api.moonshot.ai',
      changeOrigin: true,
      rewrite: (requestPath: string) => requestPath.replace(/^\/api\/moonshot/, ''),
    },
  }

  return {
    define: {
      'import.meta.env.VITE_MOONSHOT_API_KEY': JSON.stringify(moonshotKey),
    },
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
