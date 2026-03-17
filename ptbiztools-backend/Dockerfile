FROM node:22-alpine

WORKDIR /app

# Install dependencies
RUN apk add --no-cache openssl python3 py3-pip
RUN pip3 install --no-cache-dir "uv>=0.4.15" "mem0[mcp]"

# Copy package files first for better caching
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
