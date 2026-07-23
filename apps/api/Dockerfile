# Build with the repository root as context:
# docker build -f apps/api/Dockerfile --target runtime -t order-manager-api .
FROM node:22-alpine AS dependencies

WORKDIR /app

COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/api-client/package.json packages/api-client/package.json
COPY packages/eslint-config/package.json packages/eslint-config/package.json
COPY packages/tsconfig/package.json packages/tsconfig/package.json

RUN npm ci --include-workspace-root

FROM dependencies AS build

COPY apps/api apps/api
COPY packages/tsconfig packages/tsconfig
COPY scripts scripts

RUN npm run prisma:generate --workspace @order-manager/api
RUN npm run build --workspace @order-manager/api

# This target intentionally retains Prisma CLI, migrations and TypeScript tools.
# It is used only by the approved staging migration job, never by the API service.
FROM build AS migrate

WORKDIR /app
ENV NODE_ENV=staging

CMD ["sh", "-c", "node scripts/verify-staging-migration-gate.mjs && npm run prisma:migrate:staging --workspace @order-manager/api"]

FROM node:22-alpine AS runtime

WORKDIR /app
ENV NODE_ENV=production

COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/api-client/package.json packages/api-client/package.json
COPY packages/eslint-config/package.json packages/eslint-config/package.json
COPY packages/tsconfig/package.json packages/tsconfig/package.json

RUN npm ci --omit=dev --workspace @order-manager/api --include-workspace-root && npm cache clean --force

COPY --from=build /app/apps/api/dist ./apps/api/dist

WORKDIR /app/apps/api
USER node
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/api/v1/health').then((response) => process.exit(response.ok ? 0 : 1)).catch(() => process.exit(1))"

CMD ["node", "dist/main.js"]
