# --- Stage 1: Build ---
FROM node:20-alpine AS builder

WORKDIR /app

# Enable pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy package.json only (lockfile is in monorepo root, not available in context)
COPY package.json ./

# Install dependencies (will generate a local lockfile)
RUN pnpm install

COPY . .
# Build the application
RUN pnpm run build

# --- Stage 2: Serve ---
FROM nginx:alpine

# Install envsubst
RUN apk add --no-cache gettext

WORKDIR /usr/share/nginx/html

# Remove default nginx static assets
RUN rm -rf ./*

# Copy build artifacts
COPY --from=builder /app/dist .

# Copy nginx template
COPY nginx.conf.template /etc/nginx/nginx.conf.template

# Expose port
EXPOSE 8080

# Start Nginx (Manual envsubst to ensure variable replacement works correctly, with debug cat)
CMD ["/bin/sh", "-c", "envsubst '$API_URL' < /etc/nginx/nginx.conf.template > /etc/nginx/conf.d/default.conf && echo '--- GENERATED CONFIG ---' && cat /etc/nginx/conf.d/default.conf && echo '--- END CONFIG ---' && nginx -g 'daemon off;'"]
