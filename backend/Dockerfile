# ===================================================
# Backend Dockerfile for IT Assets Monitoring
# ===================================================
FROM node:22-alpine AS base

WORKDIR /app

# Install dependencies first for efficient layer caching
COPY package*.json ./
RUN npm ci --omit=dev

# Copy application source
COPY . .

# Set environment
ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3000

# Create storage directory for persistent database backups
RUN mkdir -p /app/storage/backups && chown -R node:node /app/storage

# Non-root user for security hardening
USER node

EXPOSE 3000

CMD ["node", "src/server.js"]
