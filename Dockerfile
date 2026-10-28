# ==========================================
# Stage 1: Build the Vite SPA Frontend
# ==========================================
FROM node:22-alpine AS frontend-builder
WORKDIR /app/client

COPY client/package*.json ./
RUN npm ci

COPY client/ ./
RUN npm run build

# ==========================================
# Stage 2: Production Server & Serving Image
# ==========================================
FROM node:22-alpine AS runner
WORKDIR /app

# Install native dependencies required for better-sqlite3 compilation
RUN apk add --no-cache python3 make g++

ENV NODE_ENV=production
ENV PORT=3000
ENV DATA_DIR=/app/data

# Prepare server dependencies
COPY server/package*.json ./server/
WORKDIR /app/server
RUN npm ci --omit=dev

# Copy server application source
COPY server/src ./src

# Copy built static assets from Stage 1 into expected client/dist path
COPY --from=frontend-builder /app/client/dist /app/client/dist

# Create dedicated persistent data directory
RUN mkdir -p /app/data && chmod 777 /app/data

EXPOSE 3000

CMD ["node", "src/index.js"]
