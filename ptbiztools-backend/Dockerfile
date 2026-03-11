FROM node:22-alpine AS builder

WORKDIR /app

# Install OpenSSL for Prisma
RUN apk add --no-cache openssl

COPY package*.json ./
RUN npm ci

COPY prisma ./prisma/
COPY tsconfig.json ./tsconfig.json

# Copy source and build
COPY src ./src
COPY BUILD_TIMESTAMP ./

RUN npx prisma generate
RUN npm run build

FROM node:22-alpine AS runner

WORKDIR /app

# Install OpenSSL for Prisma
RUN apk add --no-cache openssl

COPY package*.json ./
RUN npm ci --only=production

COPY prisma ./prisma/
RUN npx prisma generate

COPY --from=builder /app/dist ./dist/

EXPOSE 3000

CMD ["node", "dist/index.js"]
