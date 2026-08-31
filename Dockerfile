FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY src ./src
COPY content ./content

ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=3000 \
    SOURCE=local \
    CONTENT_ROOT=./content

EXPOSE 3000

USER node

CMD ["node", "src/index.js"]
