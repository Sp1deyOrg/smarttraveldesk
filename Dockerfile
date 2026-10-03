# syntax=docker/dockerfile:1

# Build: install with bun (honours bun.lock and the 24h release-age guard in bunfig.toml).
FROM oven/bun:1.3.14 AS build
WORKDIR /app
COPY package.json bun.lock bunfig.toml ./
RUN bun install --frozen-lockfile
COPY . .
RUN bun run build

# Run: the nitro node-server output carries its own traced node_modules.
FROM node:22-slim
WORKDIR /app
ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=8080
COPY --from=build --chown=node:node /app/.output ./.output
USER node
EXPOSE 8080
CMD ["node", ".output/server/index.mjs"]
