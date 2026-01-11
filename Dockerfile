# Multi-stage build for ShelfSeeker application
FROM node:20-alpine AS base

# Stage 1: Build web frontend
FROM base AS web-builder
WORKDIR /app/web
COPY web/package*.json ./
RUN npm ci
COPY web/ ./
RUN npm run build

# Stage 2: Build server and shared modules
FROM base AS server-builder
# Build shared IRC modules first
WORKDIR /app
COPY package*.json ./
COPY tsconfig.json ./
COPY src/ ./src/
RUN npm ci
RUN npm run build

# Build server
WORKDIR /app/server
COPY server/package*.json ./
RUN npm ci
COPY server/tsconfig.json ./
COPY server/src/ ./src/
RUN npm run build

# Stage 3: Production image
FROM base AS production
WORKDIR /app

# Install production dependencies for root (shared modules)
COPY package*.json ./
RUN npm ci --production

# Install production dependencies for server
WORKDIR /app/server
COPY server/package*.json ./
RUN npm ci --production

# Set up the runtime directory structure
WORKDIR /app

# Copy built shared modules (compiled from root src/) - needed by server
COPY --from=server-builder /app/dist ./dist
COPY --from=server-builder /app/src ./src

# Copy built server files
COPY --from=server-builder /app/server/dist ./server/dist

# Copy built web frontend to be served by Express
COPY --from=web-builder /app/web/dist ./server/public

# Create runtime directories
RUN mkdir -p server/downloads server/.tmp server/data

# Expose API server port
EXPOSE 3001

# Set environment variables
ENV NODE_ENV=production

# Start the server (need to be in /app/server workdir)
WORKDIR /app/server
CMD ["node", "dist/server/src/server.js"]
