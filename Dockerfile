# apps/api/Dockerfile

FROM node:18-alpine AS base
WORKDIR /app
RUN npm install -g pnpm


FROM base AS deps
WORKDIR /app

COPY package.json pnpm-lock.yaml ./
COPY ../../pnpm-workspace.yaml ./
COPY ../../packages/types/package.json ./packages/types/
COPY ../../packages/swapper/package.json ./packages/swapper/
RUN pnpm install --frozen-lockfile

FROM base AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .
COPY ../../packages/types ./packages/types
COPY ../../packages/swapper ./packages/swapper
RUN pnpm run --filter "...@gemwallet/api" build


FROM base AS pruner
WORKDIR /app

COPY --from=builder /app/package.json /app/pnpm-lock.yaml /app/pnpm-workspace.yaml ./
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages/types/dist ./packages/types/dist
COPY --from=builder /app/packages/swapper/dist ./packages/swapper/dist

RUN pnpm prune --prod

FROM node:18-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
EXPOSE ${PORT}

COPY --from=pruner /app/node_modules ./node_modules
COPY --from=pruner /app/dist ./dist
COPY --from=pruner /app/package.json ./package.json

COPY --from=pruner /app/packages/types/dist ./node_modules/@gemwallet/types/dist
COPY --from=pruner /app/packages/swapper/dist ./node_modules/@gemwallet/swapper/dist

CMD ["node", "dist/index.js"]
