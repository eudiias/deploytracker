# ---------- Build ----------
FROM node:22-alpine AS build

WORKDIR /usr/src/app

COPY package*.json tsconfig.json ./
RUN npm ci

COPY src ./src
RUN npm run build

# ---------- Runtime ----------
FROM node:22-alpine

ENV NODE_ENV=production
WORKDIR /usr/src/app

COPY --chown=node:node package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --chown=node:node --from=build /usr/src/app/dist ./dist

USER node

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s \
  CMD wget -qO- http://localhost:3000/ || exit 1

CMD ["node", "dist/server.js"]