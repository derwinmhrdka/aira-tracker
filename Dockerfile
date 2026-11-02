FROM node:22-alpine AS deps
WORKDIR /app
RUN apk add --no-cache openssl libc6-compat ca-certificates
COPY package.json package-lock.json ./
COPY prisma ./prisma
# One npm download. The Prisma CLI for db push is installed here from that
# cache, so the final image does not download Prisma again.
# Write the CLI package.json directly. `npm init -y --prefix` ignores
# --prefix on npm 10 and overwrites /app/package.json.
RUN --mount=type=cache,target=/root/.npm \
  npm ci --ignore-scripts --no-audit --no-fund \
  && mkdir -p /opt/prisma-cli \
  && printf '%s\n' '{"name":"prisma-cli","private":true}' > /opt/prisma-cli/package.json \
  && npm install --prefix /opt/prisma-cli --prefer-offline --ignore-scripts --no-audit --no-fund prisma@6.19.3
RUN set -e; \
  for i in 1 2 3; do \
    ./node_modules/.bin/prisma generate && exit 0; \
    echo "prisma generate attempt $i failed, retrying..."; \
    sleep 5; \
  done; \
  exit 1

FROM node:22-alpine AS builder
WORKDIR /app
RUN apk add --no-cache openssl libc6-compat ca-certificates
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
# Turbopack on Alpine (musl) can sit at the memory ceiling and emit no logs
# until the SSH deploy timeout kills the build. Webpack completes this app.
RUN ./node_modules/.bin/next build --webpack

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

COPY --from=deps /opt/prisma-cli /opt/prisma-cli
ENV PATH="/opt/prisma-cli/node_modules/.bin:${PATH}"
RUN mkdir -p uploads && chown -R nextjs:nodejs uploads
USER nextjs
EXPOSE 3000

CMD ["node", "server.js"]
