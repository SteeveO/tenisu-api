# Local environment only: Lambda packaging is separate. Commands are in compose.yaml.
FROM docker.io/library/node:22-slim
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts
COPY . .
