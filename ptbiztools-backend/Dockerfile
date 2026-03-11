FROM node:22-alpine

WORKDIR /app

# Install dependencies
RUN apk add --no-cache openssl

# Copy package files first for better caching
COPY package*.json ./

# Copy cache-busting files early to invalidate layer when they change
COPY .force_rebuild BUILD_TIMESTAMP ./

RUN npm ci

# Copy source and build
COPY . .
RUN npx prisma generate
RUN npm run build

# Expose port
EXPOSE 8080

# Start the server
CMD ["node", "dist/index.js"]
