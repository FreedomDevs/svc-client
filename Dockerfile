# ---------- stage 1: build ----------
FROM node:22-alpine3.24 AS builder
RUN apk add --no-cache python3 make g++

WORKDIR /app

COPY package.json ./

# зависимости
RUN --mount=type=bind,source=package-lock.json,target=package-lock.json \
  npm ci

COPY src ./src
COPY prisma ./prisma
COPY test ./test
COPY eslint.config.mjs tsconfig.build.json tsconfig.json prisma.config.ts ./
RUN npx prisma generate
RUN npm run build


# ---------- stage 2: production ----------
FROM node:22-alpine3.24

RUN --mount=type=bind,source=package.json,target=package.json \
  --mount=type=bind,source=package-lock.json,target=package-lock.json \
  --mount=type=bind,from=builder,source=/app,target=/builder \
  --mount=type=bind,source=prisma.config.ts,target=/tmp-prisma.config.ts \
  cp -r /builder/prisma ./ && \
  cp -r /builder/dist ./ && \
  cp -r /tmp-prisma.config.ts ./prisma.config.ts && \
  npm ci --omit=dev && \
  find node_modules -type f \( -name "*.d.js" -o -name "*.d.cjs" -o -name "*.map" \) -delete && \
  mkdir -p ./node_modules/.prisma && \
  cp -r /builder/node_modules/.prisma/client ./node_modules/.prisma/ && \
  rm -rf /root/.npm/

CMD ["sh", "-c", "export NODE_ENV=production && ./node_modules/.bin/prisma migrate deploy && exec node dist/src/main.js"]