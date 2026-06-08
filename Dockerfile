# Multi-stage build — non-root, minimal attack surface
FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@9 --activate
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# ── builder ───────────────────────────────────────────────────────────
FROM base AS builder
WORKDIR /app
COPY web/package.json web/pnpm-lock.yaml ./
# --ignore-scripts: prevent postinstall from running prisma generate before schema is copied
# --shamefully-hoist: flatten node_modules so standalone output can find all deps
RUN pnpm install --frozen-lockfile --ignore-scripts --node-linker=hoisted
COPY web/ .
RUN node_modules/.bin/prisma generate
ENV NEXT_TELEMETRY_DISABLED=1
# Dummy DATABASE_URL so Next.js static generation doesn't try to connect to DB at build time
ENV DATABASE_URL="postgresql://dummy:dummy@dummy:5432/dummy"
ARG NEXT_PUBLIC_TURNSTILE_SITE_KEY
ENV NEXT_PUBLIC_TURNSTILE_SITE_KEY=$NEXT_PUBLIC_TURNSTILE_SITE_KEY
RUN node_modules/.bin/next build

# ── runner ────────────────────────────────────────────────────────────
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Prisma schema + migrations (needed for prisma migrate deploy at deploy time)
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma

# prisma.config.ts — Prisma 7 config (provides DATABASE_URL since schema.prisma has no url)
COPY --from=builder --chown=nextjs:nodejs /app/prisma.config.ts ./

# Prisma client — standalone trace may not include all engine/adapter files
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/@prisma ./node_modules/@prisma

# Prisma CLI — devDependency, not in standalone, needed for migrate deploy
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/prisma ./node_modules/prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/.bin/prisma ./node_modules/.bin/prisma

# dotenv — required by prisma.config.ts (not in standalone trace)
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/dotenv ./node_modules/dotenv

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Run standalone server directly — cluster mode requires server.js as main module
CMD ["node", "server.js"]
