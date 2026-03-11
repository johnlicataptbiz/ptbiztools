FROM node:22-alpine

WORKDIR /app

# Install dependencies
RUN apk add --no-cache openssl

# Copy package files
COPY package*.json ./
RUN npm ci

# Copy source and build
COPY . .
RUN npx prisma generate
RUN npm run build

# Expose port
EXPOSE 8080

# Start the server
CMD ["node", "dist/index.js"]
