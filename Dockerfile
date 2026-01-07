FROM node:24.12.0-alpine3.23

WORKDIR /app

COPY package*.json ./
COPY tsconfig.json ./
RUN npm ci

COPY server.ts ./
COPY src/ ./src/
COPY tests/ ./tests/

RUN npm run build

RUN addgroup -g 1001 -S nodejs && \
    adduser -S appuser -u 1001 -G nodejs && \
    chown -R appuser:nodejs /app

USER appuser

EXPOSE 3003

CMD ["node", "dist/server.js"]
