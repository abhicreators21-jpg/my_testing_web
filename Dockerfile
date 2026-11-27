# ShopSphere production image.
# Node 22 LTS is used because better-sqlite3 11.x ships prebuilt binaries for it;
# the build stage also carries a toolchain so it can compile from source if needed.
FROM node:22-alpine AS build
RUN apk upgrade --no-cache && apk add --no-cache python3 make g++
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
# Build the client, then drop dev dependencies so the runtime image stays small.
RUN npm run build && npm prune --omit=dev

FROM node:22-alpine
# The date keys the build cache so this layer installs today's OS fixes; AppJet keeps it current on deploy.
RUN echo "os-refresh 2026-11-27" && apk upgrade --no-cache
WORKDIR /app
ENV NODE_ENV=production \
    PORT=3000 \
    HOST=0.0.0.0 \
    DATA_DIR=/app/data \
    HOME=/home/appjet
COPY --from=build /app ./
RUN mkdir -p /app/data /home/appjet && chown -R 10001:10001 /app /home/appjet
USER 10001:10001
EXPOSE 3000
CMD ["node", "server/index.js"]
