# ============================================================================
#  Dockerfile backend (multi-stage) — build sekali, jalan di mana saja.
# ============================================================================

# ---- Stage 1: build ----
FROM node:22-alpine AS builder
# Direktori kerja di dalam container.
WORKDIR /app
# Salin manifest & skema dulu agar cache layer install efisien.
COPY package.json ./
COPY prisma ./prisma
# Install seluruh dependency (termasuk dev untuk kompilasi).
RUN npm install
# Generate Prisma Client dari skema.
RUN npx prisma generate
# Salin sisa source code.
COPY tsconfig.json nest-cli.json ./
COPY src ./src
# Kompilasi TypeScript menjadi JavaScript di folder dist.
RUN npm run build

# ---- Stage 2: runtime ----
FROM node:22-alpine AS runner
WORKDIR /app
# Set environment produksi.
ENV NODE_ENV=production
# Salin manifest & prisma untuk install dependency runtime saja.
COPY package.json ./
COPY prisma ./prisma
# Install dependency produksi (lebih ramping).
RUN npm install --omit=dev && npx prisma generate
# Salin hasil build dari stage builder.
COPY --from=builder /app/dist ./dist
# Ekspos port aplikasi.
EXPOSE 3000
# Sinkronkan skema ke database lalu start server saat container hidup.
# Catatan: "db push" dipakai pada tahap awal (belum ada file migrasi). Untuk
# produksi, hasilkan migrasi dengan `prisma migrate dev` lalu ganti ke
# `prisma migrate deploy` agar perubahan skema terlacak & aman.
CMD ["sh", "-c", "npx prisma db push --accept-data-loss && node dist/main.js"]
