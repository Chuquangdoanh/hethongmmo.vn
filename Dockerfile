# Multi-stage build — non-root, minimal attack surface
FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@9 --activate
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# ── deps ──────────────────────────────────────────────────────────────
# Dependency install cached separately from app source.
# node-linker=hoisted: actual files instead of pnpm symlinks — required for
# reliable Docker COPY and for Prisma CLI to find its WASM / sibling modules.
FROM base AS deps
WORKDIR /app
COPY web/package.json web/pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --ignore-scripts --node-linker=hoisted

# ── builder ───────────────────────────────────────────────────────────
FROM deps AS builder
COPY web/ .
RUN node_modules/.bin/prisma generate
ENV NEXT_TELEMETRY_DISABLED=1
ENV DATABASE_URL="postgresql://dummy:dummy@dummy:5432/dummy"
ARG NEXT_PUBLIC_TURNSTILE_SITE_KEY
ENV NEXT_PUBLIC_TURNSTILE_SITE_KEY=$NEXT_PUBLIC_TURNSTILE_SITE_KEY
RUN node_modules/.bin/next build

# ── migrator ─────────────────────────────────────────────────────────
# Reuses full node_modules from deps stage so Prisma CLI, @prisma/config,
# effect, and all other migration-time deps are available.
# This stage does NOT run next build — fast to rebuild.
FROM deps AS migrator
COPY web/prisma ./prisma
COPY web/prisma.config.ts ./
ENV NODE_ENV=production
USER nextjs
ENTRYPOINT ["node", "node_modules/prisma/build/index.js"]
CMD ["migrate", "deploy"]

# ── runner ────────────────────────────────────────────────────────────
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Prisma runtime — query engine + generated client (needed for DB queries)
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/@prisma ./node_modules/@prisma

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
CMD ["node", "server.js"]
