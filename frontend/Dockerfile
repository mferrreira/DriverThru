FROM oven/bun:1.1 as builder
WORKDIR /app

COPY package.json bun.lock ./
RUN bun install 

COPY . .
RUN bun run build