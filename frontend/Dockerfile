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

# Non-root user: nginx worker tidak butuh privilege root.
# pid & *_temp_path harus pindah ke direktori writable oleh user non-root,
# karena default nginx.conf menulis ke /run dan /var/lib/nginx (root-owned).
RUN addgroup -S app && adduser -S app -G app \
 && mkdir -p /run/app /tmp/nginx \
 && chown -R app:app /usr/share/nginx/html /etc/nginx/conf.d /var/cache/nginx /var/log/nginx /etc/nginx /run/app /tmp/nginx
USER app

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
