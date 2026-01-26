FROM node:24 AS builder

WORKDIR /app

COPY ./package*.json ./

RUN npm ci

COPY . .

# Vite reads VITE_* env vars at build-time
ARG VITE_API_URL=/api
ENV VITE_API_URL=${VITE_API_URL}

RUN npm run build

FROM alpine:3.20

WORKDIR /app

COPY --from=builder /app/dist ./dist

CMD ["sh", "-c", "cp -rp /app/dist/. /app/staticfiles/ && tail -f /dev/null"]

