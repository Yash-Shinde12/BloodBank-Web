# ─────────────────────────────────────────────
#  Stage 1: Build
# ─────────────────────────────────────────────
FROM node:20-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package manifests first for better layer caching
COPY package*.json ./

# Install all dependencies (including devDependencies needed for build)
RUN npm ci --frozen-lockfile

# Copy the rest of the source code
COPY . .


# Build the Vite app
RUN npm run build

# ─────────────────────────────────────────────
#  Stage 2: Serve (lean production image)
# ─────────────────────────────────────────────
FROM node:20-alpine AS runner

WORKDIR /app

# Install only the static file server — no build tools in the final image
RUN npm install -g serve

# Copy the compiled static assets from the builder stage
COPY --from=builder /app/dist ./dist

# Expose the port the server will listen on
EXPOSE 3000

# Health-check so Docker / orchestrators know when the container is ready
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:3000 || exit 1

# Serve the SPA — the "-s" flag enables SPA fallback (all routes → index.html)
CMD ["serve", "-s", "dist", "-l", "3000"]
