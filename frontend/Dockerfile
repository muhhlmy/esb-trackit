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

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
