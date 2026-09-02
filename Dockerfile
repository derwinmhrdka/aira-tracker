FROM node:22-alpine AS deps
WORKDIR /app
RUN apk add --no-cache openssl libc6-compat ca-certificates
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci --ignore-scripts
# Prisma downloads engine binaries — retry on transient ECONNRESET
RUN set -e; \
  for i in 1 2 3 4 5; do \
    npx prisma generate && exit 0; \
    echo "prisma generate attempt $i failed, retrying..."; \
    sleep $((i * 10)); \
  done; \
  exit 1

FROM node:22-alpine AS builder
WORKDIR /app
RUN apk add --no-cache openssl libc6-compat ca-certificates
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
# Client already generated in deps — only build Next.js (skip prisma generate)
RUN npx next build

FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN apk add --no-cache openssl libc6-compat ca-certificates \
  && addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/node_modules/prisma ./node_modules/prisma
COPY --from=builder /app/node_modules/sharp ./node_modules/sharp
COPY --from=builder /app/node_modules/@img ./node_modules/@img
COPY --from=builder /app/package.json ./package.json

# Seed script deps — copy from builder (avoid npm install pulling all package.json deps)
COPY --from=builder /app/node_modules/tsx ./node_modules/tsx
COPY --from=builder /app/node_modules/esbuild ./node_modules/esbuild
COPY --from=builder /app/node_modules/@esbuild ./node_modules/@esbuild
COPY --from=builder /app/node_modules/bcryptjs ./node_modules/bcryptjs

# Prisma CLI for deploy-time db push (self-contained — partial node_modules copy misses deps like `effect`)
USER root
RUN mkdir -p /opt/prisma-cli \
  && cd /opt/prisma-cli \
  && npm init -y \
  && for i in 1 2 3 4 5; do npm install --ignore-scripts prisma@6.19.3 && break || sleep $((i * 10)); done
ENV PATH="/opt/prisma-cli/node_modules/.bin:${PATH}"
RUN mkdir -p uploads && chown -R nextjs:nodejs uploads
USER nextjs
EXPOSE 3000

CMD ["node", "server.js"]
