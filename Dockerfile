# ============================================================
# VulnNode-CTF Docker Image
# ============================================================
# This Dockerfile creates a containerized version of VulnNode-CTF
# 
# WARNING: This application is INTENTIONALLY VULNERABLE
# Do NOT expose to public internet or use in production!
# ============================================================

# Stage 1: Build stage
FROM node:14-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# ============================================================
# Stage 2: Runtime stage
FROM node:14-alpine

# Metadata
LABEL maintainer="cybok10"
LABEL version="3.0"
LABEL description="Intentionally Vulnerable E-Commerce Application for CTF"
LABEL security.warning="CONTAINS INTENTIONAL VULNERABILITIES - FOR EDUCATIONAL USE ONLY"

# Set working directory
WORKDIR /app

# Create non-root user (even though we want it vulnerable)
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Copy node_modules from builder
COPY --from=builder /app/node_modules ./node_modules

# Copy application files
COPY --chown=nodejs:nodejs . .

# Create necessary directories
RUN mkdir -p database uploads logs && \
    chown -R nodejs:nodejs database uploads logs

# Set permissions
RUN chmod -R 755 .

# Initialize database
RUN npm run db-init

# Expose port
EXPOSE 3000

# Environment variables
ENV NODE_ENV=production \
    PORT=3000 \
    DB_PATH=./database/vuln_app.db

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Switch to non-root user
USER nodejs

# Start application
CMD ["node", "server.js"]