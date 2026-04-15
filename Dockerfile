# ===== Stage 1: Dependencies =====
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package.json package-lock.json ./
RUN NODE_ENV=development npm ci --legacy-peer-deps

# ===== Stage 2: Builder =====
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generate Prisma client (schema-only, no DB connection needed at build time)
RUN npx prisma generate

# Build Next.js
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
ENV NODE_OPTIONS="--max-old-space-size=4096"
RUN npm run build

# ===== Stage 3: Runner =====
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy built files
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Copy Prisma schema + generated client
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

# Copy pg driver + its runtime dependencies
# Use RUN+mount so optional packages (pg-cloudflare) don't fail the build
RUN --mount=type=bind,from=builder,source=/app/node_modules,target=/builder-nm \
    cp -r /builder-nm/pg                  ./node_modules/pg && \
    cp -r /builder-nm/pg-connection-string ./node_modules/pg-connection-string && \
    cp -r /builder-nm/pg-pool             ./node_modules/pg-pool && \
    cp -r /builder-nm/pg-protocol         ./node_modules/pg-protocol && \
    cp -r /builder-nm/pg-types            ./node_modules/pg-types && \
    cp -r /builder-nm/pgpass              ./node_modules/pgpass && \
    cp -r /builder-nm/pg-cloudflare       ./node_modules/pg-cloudflare 2>/dev/null || true

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Apply schema to DB (safe push) then start server
# Skip db push if DATABASE_URL is not set to avoid crash-loop on missing env
CMD ["sh", "-c", "if [ -n \"$DATABASE_URL\" ]; then npx prisma db push --accept-data-loss; fi && node server.js"]
