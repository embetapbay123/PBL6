FROM node:22.15.1-bookworm-slim AS build
WORKDIR /app
COPY frontend/package*.json ./
RUN npm ci --no-audit --no-fund
COPY frontend/ ./
RUN npm run build
FROM caddy:2.10.0-alpine
COPY --from=build /app/dist /srv
COPY frontend/Caddyfile /etc/caddy/Caddyfile
