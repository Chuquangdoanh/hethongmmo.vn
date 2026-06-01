# Multi-stage build — non-root, minimal attack surface
FROM node:20-alpine AS base
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# ── deps ──────────────────────────────────────────────────────────────
FROM base AS deps
WORKDIR /app
COPY web/package*.json ./
RUN npm ci --only=production && npm cache clean --force

# ── builder ───────────────────────────────────────────────────────────
FROM base AS builder
WORKDIR /app
COPY web/package*.json ./
RUN npm ci
COPY web/ .
RUN npx prisma generate
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# ── runner ────────────────────────────────────────────────────────────
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Copy only what's needed
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/prisma ./prisma
COPY --from=deps /app/node_modules ./node_modules

# Run as non-root
USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
