FROM node:22.15.1-bookworm-slim AS build
WORKDIR /app/backend
COPY backend/package*.json ./
RUN npm ci --no-audit --no-fund
COPY backend/ ./
RUN npm run build
FROM node:22.15.1-bookworm-slim
WORKDIR /app/backend
ENV NODE_ENV=development
COPY --from=build /app/backend/node_modules ./node_modules
COPY --from=build /app/backend/dist ./dist
COPY backend/catalog-service/migrations ./catalog-service/migrations
COPY backend/commerce-service/migrations ./commerce-service/migrations
COPY backend/identity-store-service/migrations ./identity-store-service/migrations
COPY backend/ai-service/migrations ./ai-service/migrations
COPY backend/tests ./tests
COPY backend/jest*.cjs ./
COPY backend/tsconfig.json ./
COPY backend/shared/src ./shared/src
COPY backend/catalog-service/src ./catalog-service/src
COPY backend/commerce-service/src ./commerce-service/src
COPY backend/identity-store-service/src ./identity-store-service/src
COPY backend/package.json ./
USER node
CMD ["node","dist/catalog-service/src/main.js"]
