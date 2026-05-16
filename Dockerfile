# syntax=docker/dockerfile:1
# ===== Stage 1: Dependencies =====
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package.json package-lock.json ./

# Make npm resilient to flaky network on the build host. Zeabur has
# intermittently ECONNRESET'd against registry.npmjs.org during peak hours.
RUN npm config set fetch-retries 5 \
 && npm config set fetch-retry-mintimeout 20000 \
 && npm config set fetch-retry-maxtimeout 120000 \
 && npm config set fetch-timeout 600000

# Cache the npm download cache across builds — saves ~2 min on repeat builds.
# Retry the install up to 3 times on transient network failures.
RUN --mount=type=cache,target=/root/.npm,sharing=locked \
    for i in 1 2 3; do \
      NODE_ENV=development npm ci --legacy-peer-deps --no-audit --no-fund --prefer-offline && break; \
      echo "npm ci failed (attempt $i), retrying in 15s..."; \
      sleep 15; \
    done

# ===== Stage 2: Builder =====
FROM node:20-alpine AS builder
# libc6-compat is required for Next.js SWC binary on Alpine (musl).
# Without it, @next/swc-linux-x64-musl fails to load and the build crashes.
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Schema init at runtime: scripts/init-db.js + prisma/migrations/*.sql is run
# from CMD on every boot and is idempotent. The previous build-time
# `prisma db push` was redundant AND broken when DATABASE_URL points at the
# Zeabur internal hostname (builder containers cannot reach the runtime
# overlay network). Removed.

# Build Next.js — cache the compiler output so unchanged pages aren't recompiled
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
ENV NODE_OPTIONS="--max-old-space-size=4096"
RUN --mount=type=cache,target=/app/.next/cache \
    npm run build

# ===== Stage 3: Runner =====
FROM node:20-alpine AS runner
RUN apk add --no-cache libc6-compat
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy built Next.js standalone output
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Copy Prisma generated client + SQL init script + migrations
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder --chown=nextjs:nodejs /app/prisma/init.sql ./prisma/init.sql
COPY --from=builder --chown=nextjs:nodejs /app/prisma/migrations ./prisma/migrations
COPY --from=builder --chown=nextjs:nodejs /app/scripts/init-db.js ./scripts/init-db.js
COPY --from=builder --chown=nextjs:nodejs /app/scripts/seed-admin.js ./scripts/seed-admin.js

# Copy pg driver + its runtime dependencies (chowned to nextjs)
RUN --mount=type=bind,from=builder,source=/app/node_modules,target=/builder-nm \
    cp -r /builder-nm/pg                   ./node_modules/pg && \
    cp -r /builder-nm/pg-connection-string ./node_modules/pg-connection-string && \
    cp -r /builder-nm/pg-pool              ./node_modules/pg-pool && \
    cp -r /builder-nm/pg-protocol          ./node_modules/pg-protocol && \
    cp -r /builder-nm/pg-types             ./node_modules/pg-types && \
    cp -r /builder-nm/pgpass               ./node_modules/pgpass && \
    cp -r /builder-nm/pg-cloudflare        ./node_modules/pg-cloudflare 2>/dev/null || true && \
    chown -R nextjs:nodejs ./node_modules/pg* ./node_modules/pgpass 2>/dev/null || true

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Init DB schema → seed admin user → start server (all idempotent)
CMD ["sh", "-c", "node scripts/init-db.js && node scripts/seed-admin.js && node server.js"]
