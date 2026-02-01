# --- Stage 1: Build ---
FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
# Build the application
RUN npm run build

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
COPY nginx.conf.template /etc/nginx/templates/default.conf.template

# Expose port
EXPOSE 8080

# Start Nginx (envsubst is handled automatically by the nginx docker image if template is in /etc/nginx/templates)
CMD ["nginx", "-g", "daemon off;"]
