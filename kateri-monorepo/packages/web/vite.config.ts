import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Bind to all interfaces for Codespaces/remote dev and keep port fixed for stable forwarding
    port: 3000,
    host: '0.0.0.0',
    strictPort: true,
    // Configure HMR to work behind GitHub Codespaces port forwarding
    hmr: process.env.CODESPACES
      ? {
          protocol: 'wss',
          host: `${process.env.CODESPACE_NAME}-3000.${process.env.GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN}`,
          clientPort: 443,
        }
      : undefined,
    proxy: {
      // Firebase Auth SDK sends requests to <origin>/identitytoolkit.googleapis.com when connected to an emulator origin.
      // Proxy that path to the local Auth emulator to avoid CORS/tunnel issues.
      '/identitytoolkit.googleapis.com': {
        target: 'http://127.0.0.1:9110',
        changeOrigin: true,
        configure: proxy => {
          const name = 'identitytoolkit'
          proxy.on('proxyReq', (proxyReq, req) => {
            // Minimal request log
            const url = String((req as { url?: string }).url || '')
            console.log(`[proxy:${name}] -> ${req.method} ${url}`)
          })
          proxy.on('proxyRes', (proxyRes, req, res) => {
            const status = proxyRes.statusCode || 0
            const url = String((req as { url?: string }).url || '')
            // Normalize CORS to match incoming Origin (helps Codespaces tunnels)
            const origin = (req.headers && req.headers.origin) || '*'
            if (origin) {
              res.setHeader('access-control-allow-origin', origin as string)
              res.setHeader('vary', 'Origin')
            }
            // If error status, stream body for visibility
            if (status >= 400) {
              const chunks: Buffer[] = []
              proxyRes.on('data', (c: Buffer) => chunks.push(c))
              proxyRes.on('end', () => {
                const body = Buffer.concat(chunks).toString('utf8')
                console.warn(`[proxy:${name}] <- ${status} ${url} body:`, body)
              })
            } else {
              console.log(`[proxy:${name}] <- ${status} ${url}`)
            }
          })
          proxy.on('error', (err, req) => {
            const url = String((req as { url?: string }).url || '')
            console.error(`[proxy:${name}] ERROR for ${url}:`, err.message)
          })
        },
      },
      // Secure token endpoint (STS) used for exchanging/refreshing ID tokens; must also be proxied.
      '/securetoken.googleapis.com': {
        target: 'http://127.0.0.1:9110',
        changeOrigin: true,
        configure: proxy => {
          const name = 'securetoken'
          proxy.on('proxyReq', (proxyReq, req) => {
            const url = String((req as { url?: string }).url || '')
            console.log(`[proxy:${name}] -> ${req.method} ${url}`)
          })
          proxy.on('proxyRes', (proxyRes, req, res) => {
            const status = proxyRes.statusCode || 0
            const url = String((req as { url?: string }).url || '')
            const origin = (req.headers && req.headers.origin) || '*'
            if (origin) {
              res.setHeader('access-control-allow-origin', origin as string)
              res.setHeader('vary', 'Origin')
            }
            if (status >= 400) {
              const chunks: Buffer[] = []
              proxyRes.on('data', (c: Buffer) => chunks.push(c))
              proxyRes.on('end', () => {
                const body = Buffer.concat(chunks).toString('utf8')
                console.warn(`[proxy:${name}] <- ${status} ${url} body:`, body)
              })
            } else {
              console.log(`[proxy:${name}] <- ${status} ${url}`)
            }
          })
          proxy.on('error', (err, req) => {
            const url = String((req as { url?: string }).url || '')
            console.error(`[proxy:${name}] ERROR for ${url}:`, err.message)
          })
        },
      },
      // Same-origin proxy to the Firebase Auth emulator to avoid CORS in browsers/tunnels
      '/emulator/auth': {
        target: 'http://127.0.0.1:9110',
        changeOrigin: true,
        // Strip the prefix so SDK requests like /emulator/auth/identitytoolkit.googleapis.com/... hit the emulator root
        rewrite: path => path.replace(/^\/emulator\/auth/, ''),
        configure: proxy => {
          const name = 'emulator-auth'
          proxy.on('proxyReq', (proxyReq, req) => {
            const url = String((req as { url?: string }).url || '')
            console.log(`[proxy:${name}] -> ${req.method} ${url}`)
          })
          proxy.on('proxyRes', (proxyRes, req, res) => {
            const status = proxyRes.statusCode || 0
            const url = String((req as { url?: string }).url || '')
            const origin = (req.headers && req.headers.origin) || '*'
            if (origin) {
              res.setHeader('access-control-allow-origin', origin as string)
              res.setHeader('vary', 'Origin')
            }
            if (status >= 400) {
              const chunks: Buffer[] = []
              proxyRes.on('data', (c: Buffer) => chunks.push(c))
              proxyRes.on('end', () => {
                const body = Buffer.concat(chunks).toString('utf8')
                console.warn(`[proxy:${name}] <- ${status} ${url} body:`, body)
              })
            } else {
              console.log(`[proxy:${name}] <- ${status} ${url}`)
            }
          })
          proxy.on('error', (err, req) => {
            const url = String((req as { url?: string }).url || '')
            console.error(`[proxy:${name}] ERROR for ${url}:`, err.message)
          })
        },
      },
      // Firestore emulator proxy: the Web SDK talks to /google.firestore.v1.Firestore/... with XHR streaming
      // We proxy that path to the local emulator so requests stay same-origin (no CORS issues in tunnels)
      '/google.firestore.v1.Firestore': {
        target: 'http://127.0.0.1:8088',
        changeOrigin: true,
        ws: true,
        configure: proxy => {
          const name = 'firestore'
          proxy.on('proxyReq', (proxyReq, req) => {
            const url = String((req as { url?: string }).url || '')
            console.log(`[proxy:${name}] -> ${req.method} ${url}`)
          })
          proxy.on('proxyRes', (proxyRes, req, res) => {
            const status = proxyRes.statusCode || 0
            const url = String((req as { url?: string }).url || '')
            const origin = (req.headers && req.headers.origin) || '*'
            if (origin) {
              res.setHeader('access-control-allow-origin', origin as string)
              res.setHeader('vary', 'Origin')
            }
            if (status >= 400) {
              const chunks: Buffer[] = []
              proxyRes.on('data', (c: Buffer) => chunks.push(c))
              proxyRes.on('end', () => {
                const body = Buffer.concat(chunks).toString('utf8')
                console.warn(`[proxy:${name}] <- ${status} ${url} body:`, body)
              })
            } else {
              console.log(`[proxy:${name}] <- ${status} ${url}`)
            }
          })
          proxy.on('error', (err, req) => {
            const url = String((req as { url?: string }).url || '')
            console.error(`[proxy:${name}] ERROR for ${url}:`, err.message)
          })
        },
      },
      // Firestore REST API proxy for emulator (documents endpoints under /v1)
      '/v1/': {
        target: 'http://127.0.0.1:8088',
        changeOrigin: true,
        configure: proxy => {
          const name = 'firestore-rest'
          proxy.on('proxyReq', (proxyReq, req) => {
            const url = String((req as { url?: string }).url || '')
            console.log(`[proxy:${name}] -> ${req.method} ${url}`)
          })
          proxy.on('proxyRes', (proxyRes, req, res) => {
            const status = proxyRes.statusCode || 0
            const url = String((req as { url?: string }).url || '')
            const origin = (req.headers && req.headers.origin) || '*'
            if (origin) {
              res.setHeader('access-control-allow-origin', origin as string)
              res.setHeader('vary', 'Origin')
            }
            if (status >= 400) {
              const chunks: Buffer[] = []
              proxyRes.on('data', (c: Buffer) => chunks.push(c))
              proxyRes.on('end', () => {
                const body = Buffer.concat(chunks).toString('utf8')
                console.warn(`[proxy:${name}] <- ${status} ${url} body:`, body)
              })
            } else {
              console.log(`[proxy:${name}] <- ${status} ${url}`)
            }
          })
          proxy.on('error', (err, req) => {
            const url = String((req as { url?: string }).url || '')
            console.error(`[proxy:${name}] ERROR for ${url}:`, err.message)
          })
        },
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
  define: {
    // Global constants for Firebase config
    __DEV__: process.env.NODE_ENV === 'development',
  },
  preview: {
    host: '0.0.0.0',
    port: 3000,
  },
})
