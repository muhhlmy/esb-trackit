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

# Custom nginx config to handle SPA client routing, production CSP & security headers
RUN printf 'server {\n\
  listen 80;\n\
  server_name localhost;\n\
  add_header Content-Security-Policy "default-src '\''self'\''; script-src '\''self'\''; style-src '\''self'\'' '\''unsafe-inline'\'' https://fonts.googleapis.com; font-src '\''self'\'' data: https://fonts.gstatic.com; img-src '\''self'\'' data: blob:; connect-src '\''self'\'' ws: wss: http: https:; object-src '\''none'\''; base-uri '\''self'\''; frame-ancestors '\''none'\''; form-action '\''self'\''; worker-src '\''self'\'' blob:;" always;\n\
  add_header X-Content-Type-Options "nosniff" always;\n\
  add_header X-Frame-Options "DENY" always;\n\
  add_header Referrer-Policy "strict-origin-when-cross-origin" always;\n\
  add_header Permissions-Policy "camera=(), geolocation=(), microphone=(), payment=(), usb=()" always;\n\
  add_header Cross-Origin-Opener-Policy "same-origin" always;\n\
  add_header Cross-Origin-Resource-Policy "same-origin" always;\n\
  location / {\n\
    root /usr/share/nginx/html;\n\
    index index.html;\n\
    try_files $uri $uri/ /index.html;\n\
  }\n\
  location /api/ {\n\
    proxy_pass http://backend:3000/api/;\n\
    proxy_http_version 1.1;\n\
    proxy_set_header Upgrade $http_upgrade;\n\
    proxy_set_header Connection "upgrade";\n\
    proxy_set_header Host $host;\n\
    proxy_set_header X-Real-IP $remote_addr;\n\
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;\n\
    proxy_set_header X-Forwarded-Proto $scheme;\n\
    proxy_set_header X-Request-ID $request_id;\n\
    proxy_cache_bypass $http_upgrade;\n\
    client_max_body_size 500m;\n\
  }\n\
}\n' > /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
