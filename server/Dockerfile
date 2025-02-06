FROM oven/bun:1.1.34 AS builder
WORKDIR /app/
COPY . ./

RUN bun install

# Final stage
FROM oven/bun:1.1.34
WORKDIR /app
COPY --from=builder /app/server ./server
COPY --from=builder /app/node_modules ./node_modules


# Expose the port the app runs on
EXPOSE 3000
ENV NODE_ENV=production
CMD ["bun", "run", "server/index.ts"]
