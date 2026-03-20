# ── Build stage ──────────────────────────────────────────────
FROM oven/bun:1-alpine AS builder

WORKDIR /app

COPY package.json bun.lock* ./
RUN bun install --frozen-lockfile

COPY . .

# PUBLIC_API_URL is baked into the static build at compile time.
# Set this to your public-facing domain (e.g. https://shot.game).
# If left empty, the frontend will use relative paths (/api/...).
ARG PUBLIC_API_URL=""
ENV PUBLIC_API_URL=$PUBLIC_API_URL

RUN bun run build

# ── Runtime stage ─────────────────────────────────────────────
FROM nginx:alpine

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
