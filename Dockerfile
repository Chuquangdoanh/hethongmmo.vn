# Multi-stage build — non-root, minimal attack surface
FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@11.1.3 --activate
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# ── deps ──────────────────────────────────────────────────────────────
# Dependency install cached separately from app source.
# node-linker=hoisted: actual files instead of pnpm symlinks — required for
# reliable Docker COPY and for Prisma CLI to find its WASM / sibling modules.
# --mount=type=cache: pnpm content-addressable store persists between builds
# (exported via cache-to=type=gha,mode=max → restored on next CI run).
FROM base AS deps
WORKDIR /app
COPY web/package.json web/pnpm-lock.yaml ./
RUN --mount=type=cache,target=/root/.local/share/pnpm/store,id=pnpm-store \
    pnpm install --frozen-lockfile --ignore-scripts --node-linker=hoisted

# ── builder ───────────────────────────────────────────────────────────
FROM deps AS builder
COPY web/ .
RUN node_modules/.bin/prisma generate
ENV NEXT_TELEMETRY_DISABLED=1
ENV DATABASE_URL="postgresql://dummy:dummy@dummy:5432/dummy"
ARG NEXT_PUBLIC_TURNSTILE_SITE_KEY=0x4AAAAAADdtPd4eBWk-jqZ6
ENV NEXT_PUBLIC_TURNSTILE_SITE_KEY=${NEXT_PUBLIC_TURNSTILE_SITE_KEY}
# --mount=type=cache: Turbopack incremental cache persists between builds.
# With cache-to=type=gha,mode=max this is exported to GHA and restored next run,
# cutting next build from ~8 min → ~1-2 min for code-only changes.
RUN --mount=type=cache,target=/app/.next/cache,id=nextjs-build-cache \
    node_modules/.bin/next build

# ── migrator ─────────────────────────────────────────────────────────
# Reuses full node_modules from deps stage so Prisma CLI, @prisma/config,
# effect, and all other migration-time deps are available.
# This stage does NOT run next build — fast to rebuild.
# (rebuild marker 2026-07-08: force this stage to rebuild — a prior CI run failed
# before build-migrator ran, leaving prod's migrator image 3 migrations behind)
FROM deps AS migrator
COPY web/prisma ./prisma
COPY web/prisma.config.ts ./
ENV NODE_ENV=production
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

# sharp native binaries — @vercel/nft không trace được .node binary qua optionalDeps
# Thiếu @img thì import sharp throw ở module-level → upload route trả "Internal Server Error" text
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/sharp ./node_modules/sharp
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/@img ./node_modules/@img

# fetch-cache cần writeable — Next.js tạo thư mục này lúc runtime
RUN mkdir -p /app/.next/cache && chown nextjs:nodejs /app/.next/cache

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
CMD ["node", "server.js"]
