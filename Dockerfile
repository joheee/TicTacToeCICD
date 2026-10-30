# syntax=docker/dockerfile:1
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:22-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0
# Set by CI to the git SHA; reported by /api/health.
ARG APP_VERSION=dev
ENV APP_VERSION=$APP_VERSION
# Only the deploy workflow's "break_health" demo sets this to 1 (makes /api/health return 503).
ARG FORCE_UNHEALTHY=0
ENV FORCE_UNHEALTHY=$FORCE_UNHEALTHY

COPY --from=build --chown=node:node /app/.next/standalone ./
COPY --from=build --chown=node:node /app/.next/static ./.next/static
# The migrate script imports drizzle-orm's migrator, which standalone tracing does not include.
COPY --from=build --chown=node:node /app/node_modules/drizzle-orm ./node_modules/drizzle-orm
COPY --from=build --chown=node:node /app/migrations ./migrations
COPY --from=build --chown=node:node /app/scripts ./scripts

# The app runs with `node` only. Dropping npm, npx, corepack and yarn removes a package manager nobody
# needs at runtime and the vulnerabilities bundled inside it (the image scan in ci.yml flags them).
RUN rm -rf /usr/local/lib/node_modules/npm /usr/local/lib/node_modules/corepack \
    /usr/local/bin/npm /usr/local/bin/npx /usr/local/bin/corepack \
    /opt/yarn* /usr/local/bin/yarn /usr/local/bin/yarnpkg

USER node
EXPOSE 3000
CMD ["node", "server.js"]
