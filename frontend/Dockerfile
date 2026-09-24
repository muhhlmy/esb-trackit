# ===================================================
# Frontend Multi-Stage Dockerfile
# ===================================================
FROM node:22-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Production web server
FROM nginx:alpine AS runner

COPY --from=builder /app/dist /usr/share/nginx/html

# Versioned proxy configuration with endpoint-specific upload limits.
COPY nginx.conf /etc/nginx/conf.d/default.conf

# nginx:alpine master process perlu root untuk bind :80 dan menulis
# /run/nginx.pid + temp dirs; worker process sudah drop ke user `nginx`
# otomatis (built-in privilege separation). Container tetap minim serang
# karena cap_drop ALL + no-new-privileges aktif di docker-compose.yml.
# Alternatif non-root: USER nginx + bind :8080 (unprivileged) + port remap.

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
