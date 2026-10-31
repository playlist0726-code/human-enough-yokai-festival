FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY public ./public
COPY shared ./shared
COPY scripts/build-production.mjs ./scripts/build-production.mjs
COPY server.mjs playtest-network.mjs ./
RUN npm run build
ENV NODE_ENV=production GAME_HOST=0.0.0.0 PORT=4173
EXPOSE 4173
USER node
CMD ["npm", "start"]
