FROM oven/bun:1.2.13-alpine AS installer
WORKDIR /app/
COPY . ./
RUN bun install
RUN bun run build

FROM oven/bun:1.2.13-alpine
WORKDIR /app/
COPY --from=installer /app/dist ./dist
EXPOSE 3000
ENV NODE_ENV=production
CMD ["bun", "dist/index.js"]
