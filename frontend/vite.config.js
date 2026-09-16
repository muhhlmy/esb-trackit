import { fileURLToPath, URL } from 'node:url'

import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'

const FRONTEND_SECURITY_HEADERS = {
  'Content-Security-Policy':
    "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' data: https://fonts.gstatic.com; img-src 'self' data: blob:; connect-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'; worker-src 'self' blob:;",
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
  return 'http://127.0.0.1:3000'
}

// Custom plugin: inject security headers in dev & preview servers + block sensitive dotfiles
function securityHeadersPlugin(devHeaders) {
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

  const applyHeaders = (headers) => (_req, res, next) => {
    if (!res.headersSent) {
      for (const [name, value] of Object.entries(headers)) {
        res.setHeader(name, value)
      }
    }
    return next()
  }

  return {
    name: 'security-headers',
    configureServer(server) {
      server.middlewares.use(blockSensitiveDotfiles)
      server.middlewares.use(applyHeaders(devHeaders))
    },
    configurePreviewServer(server) {
      server.middlewares.use(blockSensitiveDotfiles)
      server.middlewares.use(applyHeaders(FRONTEND_SECURITY_HEADERS))
    },
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode = 'development' }) => {
  const env = loadEnv(mode, fileURLToPath(new URL('.', import.meta.url)), 'VITE_')
  const proxyTarget = resolveApiProxyTarget(env)
  const port = Number(env.VITE_PORT || 5173)
  const rawAllowedHosts = env.VITE_ALLOWED_HOSTS || process.env.VITE_ALLOWED_HOSTS || ''
  const parsedAllowedHosts = rawAllowedHosts
    ? rawAllowedHosts.split(',').map((host) => host.trim()).filter(Boolean)
    : []
  const allowedHosts =
    rawAllowedHosts === 'true' || rawAllowedHosts === '*'
      ? true
      : Array.from(new Set(['.trycloudflare.com', ...parsedAllowedHosts]))

  const hostList = Array.isArray(allowedHosts) ? allowedHosts : []
  const hmrHosts = new Set(['localhost', '127.0.0.1', ...hostList.filter((host) => !host.startsWith('.'))])
  if (env.VITE_HOST && !['0.0.0.0', '::'].includes(env.VITE_HOST)) hmrHosts.add(env.VITE_HOST)
  const hmrOrigins = [...hmrHosts].flatMap((host) => ['ws', 'wss'].map((scheme) => scheme + '://' + host + ':' + port))
  const devHeaders = {
    ...FRONTEND_SECURITY_HEADERS,
    'Content-Security-Policy': FRONTEND_SECURITY_HEADERS['Content-Security-Policy'].replace(
      "connect-src 'self';",
      "connect-src 'self' https://*.trycloudflare.com wss://*.trycloudflare.com " + hmrOrigins.join(' ') + ';',
    ),
  }

  return {
    plugins: [
      tailwindcss(),
      vue(),
      securityHeadersPlugin(devHeaders),
    ],
    optimizeDeps: {
      include: [
        'vue',
        'vue-router',
        'lucide-vue-next',
        'gsap',
        'chart.js',
        'vue-chartjs',
        'dompurify',
        'jsbarcode',
        '@tiptap/vue-3',
        '@tiptap/starter-kit',
        '@tiptap/extension-placeholder',
        '@tiptap/extension-image',
        'xlsx',
      ],
    },
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    server: {
      host: env.VITE_HOST || process.env.VITE_HOST || '127.0.0.1',
      port,
      allowedHosts,
      headers: devHeaders,
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
      port,
      allowedHosts,
      headers: FRONTEND_SECURITY_HEADERS,
    },
    build: {
      sourcemap: false,
    },
  }
})
