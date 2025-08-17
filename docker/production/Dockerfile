FROM oven/bun:1.2.13-alpine AS installer
WORKDIR /app/
COPY . ./
RUN bun install

ARG VITE_API_ENDPOINT
ARG VITE_SENTRY_ENABLED
ARG VITE_SENTRY_DSN
ARG VITE_SENTRY_ENVIRONMENT
ARG VITE_CLERK_PUBLISHABLE_KEY

RUN bun run build

FROM oven/bun:1.2.13-alpine
WORKDIR /app/
COPY --from=installer /app/dist .
EXPOSE 3000
ENV NODE_ENV=production
CMD ["bun", "index.js"]
