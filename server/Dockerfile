# --- build stage: compile TypeScript with dev dependencies available ---
FROM node:20-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# --- runtime stage: production dependencies and compiled output only ---
FROM node:20-alpine AS runtime

WORKDIR /app
ENV NODE_ENV=production

COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=build /app/dist ./dist

# Run as the unprivileged user that the node image already provides.
USER node

EXPOSE 4000
CMD ["node", "dist/index.js"]
