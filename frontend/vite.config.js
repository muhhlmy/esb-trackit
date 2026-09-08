import fs from 'node:fs'
import { fileURLToPath, URL } from 'node:url'

import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'

const FRONTEND_SECURITY_HEADERS = {
  'Content-Security-Policy':
    "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' data: https://fonts.gstatic.com; img-src 'self' data: blob:; connect-src 'self' ws: wss: http: https:; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'; worker-src 'self' blob:;",
  'Permissions-Policy': 'camera=(), geolocation=(), microphone=(), payment=(), usb=()',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Resource-Policy': 'same-origin',
}

function resolveApiProxyTarget(env = {}) {
  if (env.VITE_API_PROXY_TARGET) {
    return env.VITE_API_PROXY_TARGET
  }
  if (process.env.VITE_API_PROXY_TARGET) {
    return process.env.VITE_API_PROXY_TARGET
  }
  try {
    const backendEnvPath = fileURLToPath(new URL('../backend/.env', import.meta.url))
    if (fs.existsSync(backendEnvPath)) {
      const content = fs.readFileSync(backendEnvPath, 'utf-8')
      const match = content.match(/^PORT\s*=\s*(\d+)/m)
      if (match && match[1]) {
        return `http://127.0.0.1:${match[1]}`
      }
    }
  } catch {
    // ignore
  }
  return 'http://127.0.0.1:3000'
}

// Custom plugin: inject security headers in dev & preview servers + block sensitive dotfiles
function securityHeadersPlugin() {
  const blockSensitiveDotfiles = (req, res, next) => {
    const rawUrl = (req.url || '').split('?')[0]
    // Allow Vite internal dev assets and dependencies
    if (rawUrl.includes('/.vite/') || rawUrl.startsWith('/@')) {
      return next()
    }
    // Block sensitive dotfiles like /.env, /.git, and package lockfiles
    if (
      /^\/\.[a-zA-Z0-9_-]/i.test(rawUrl) ||
      /\/\.(env|git|svn|hg|DS_Store|dockerignore)/i.test(rawUrl) ||
      /\/(package(-lock)?\.json|yarn\.lock|pnpm-lock\.yaml)/i.test(rawUrl)
    ) {
      res.statusCode = 404
      res.end('Not Found')
      return
    }
    return next()
  }

  const applyHeaders = (_req, res, next) => {
    if (!res.headersSent) {
      for (const [name, value] of Object.entries(FRONTEND_SECURITY_HEADERS)) {
        res.setHeader(name, value)
      }
    }
    return next()
  }

  return {
    name: 'security-headers',
    configureServer(server) {
      server.middlewares.use(blockSensitiveDotfiles)
      server.middlewares.use(applyHeaders)
    },
    configurePreviewServer(server) {
      server.middlewares.use(blockSensitiveDotfiles)
      server.middlewares.use(applyHeaders)
    },
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode = 'development' }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const proxyTarget = resolveApiProxyTarget(env)

  return {
    plugins: [
      tailwindcss(),
      vue(),
      securityHeadersPlugin(),
    ],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    server: {
      host: env.VITE_HOST || process.env.VITE_HOST || '127.0.0.1',
      port: 5173,
      allowedHosts: true,
      headers: FRONTEND_SECURITY_HEADERS,
      proxy: {
        '/api': {
          target: proxyTarget,
          changeOrigin: true,
          ws: true,
        },
      },
    },
    preview: {
      host: env.VITE_HOST || process.env.VITE_HOST || '127.0.0.1',
      port: 5173,
      allowedHosts: true,
      headers: FRONTEND_SECURITY_HEADERS,
    },
    build: {
      sourcemap: false,
    },
  }
})
