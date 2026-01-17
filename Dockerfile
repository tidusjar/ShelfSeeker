# Multi-stage build for ShelfSeeker application
FROM node:20-alpine AS base

# Stage 1: Build web frontend
FROM base AS web-builder
WORKDIR /app/web
COPY web/package*.json ./
RUN npm ci
COPY web/ ./
RUN npm run build

# Stage 2: Build server
FROM base AS server-builder
WORKDIR /app/server
COPY server/package*.json ./
RUN npm ci
COPY server/tsconfig.json ./
COPY server/src/ ./src/
RUN npm run build

# Stage 3: Production image
FROM base AS production
WORKDIR /app/server

# Install production dependencies for server
COPY server/package*.json ./
RUN npm ci --production

# Copy built server files
COPY --from=server-builder /app/server/dist ./dist

# Copy built web frontend to be served by Express
COPY --from=web-builder /app/web/dist ./public

# Create runtime directories
RUN mkdir -p downloads .tmp data

# Expose API server port
EXPOSE 3001

# Set environment variables
ENV NODE_ENV=production

# Start the server
CMD ["node", "dist/server.js"]
