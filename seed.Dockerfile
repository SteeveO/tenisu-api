FROM docker.io/library/node:22-slim
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts
COPY . .
CMD ["npx", "tsx", "scripts/seed.ts"]
