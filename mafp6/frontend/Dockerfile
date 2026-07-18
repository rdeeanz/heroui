# ============================================================================
#  Dockerfile frontend (multi-stage): build dengan Node, sajikan via Nginx.
# ============================================================================

# ---- Stage 1: build ----
FROM node:22-alpine AS builder
WORKDIR /app
# Salin manifest lalu install dependency (cache layer efisien).
COPY package.json ./
RUN npm install
# Salin sisa source & konfigurasi.
COPY . .
# Build aplikasi produksi (hasil di folder dist).
RUN npm run build

# ---- Stage 2: serve ----
FROM nginx:1.27-alpine AS runner
# Salin konfigurasi Nginx kustom (reverse proxy /api + SPA fallback).
COPY nginx.conf /etc/nginx/conf.d/default.conf
# Salin hasil build ke direktori web root Nginx.
COPY --from=builder /app/dist /usr/share/nginx/html
# Ekspos port HTTP.
EXPOSE 80
# Jalankan Nginx di foreground.
CMD ["nginx", "-g", "daemon off;"]
