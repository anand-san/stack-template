# syntax=docker/dockerfile:1.4
FROM oven/bun:1.1.34 as base

WORKDIR /app

# Install dependencies first for better caching
COPY --link package.json bun.lockb ./
COPY --link frontend/package.json ./frontend/
COPY --link server/package.json ./server/
COPY --link shared/package.json ./shared/

# Install dependencies with specific platform to avoid architecture issues
RUN --mount=type=cache,target=/root/.bun \
    bun install

# Development stage
FROM base as development

# Copy source code
COPY --link . .

# Set environment variables
ENV NODE_ENV=development

# Expose ports for frontend and backend
EXPOSE 5173
EXPOSE 3000

# Command will be specified in docker-compose.yml for each service
