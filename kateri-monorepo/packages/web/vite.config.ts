import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Production-style Vite config (no emulator proxies)
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    host: '0.0.0.0',
    strictPort: true,
    hmr: process.env.CODESPACES
      ? {
          protocol: 'wss',
          host: `${process.env.CODESPACE_NAME}-3000.${process.env.GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN}`,
          clientPort: 443,
        }
      : undefined,
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
  define: {
    __DEV__: process.env.NODE_ENV === 'development',
  },
  preview: {
    host: '0.0.0.0',
    port: 3000,
  },
})
