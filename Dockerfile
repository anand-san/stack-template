FROM oven/bun:latest AS server-builder
WORKDIR /app/
COPY tsconfig.json package.json bun.lockb* ./
COPY server ./server
RUN bun install


FROM oven/bun:latest AS frontend-builder
ARG YOUR_CUSTOM_ENV_VARIABLE
WORKDIR /app/frontend
COPY frontend ./
COPY --from=server-builder /app/server ../server
COPY --from=server-builder /app/node_modules ../node_modules


RUN bun install --frozen-lockfile
RUN bun run build

# Final stage
FROM oven/bun:latest
WORKDIR /app
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist
COPY --from=server-builder /app/server ./server
COPY --from=server-builder /app/node_modules ./node_modules


# Expose the port the app runs on
EXPOSE 3000
ENV NODE_ENV=production
CMD ["bun", "run", "server/index.ts"]
