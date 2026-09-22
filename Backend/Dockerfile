# --- Stage 1: build ---
FROM node:24-slim AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# DATABASE_URL não é usada para conectar aqui — `prisma generate` só lê o
# schema, mas prisma.config.ts exige a variável definida (via env() do
# Prisma) mesmo que o valor não seja alcançável nesta etapa.
ENV DATABASE_URL="postgresql://user:pass@localhost:5432/placeholder"

RUN npx prisma generate
RUN npm run build

# --- Stage 2: production ---
FROM node:24-slim AS production

WORKDIR /app
ENV NODE_ENV=production

COPY package.json package-lock.json ./
# prisma (CLI) é mantida para permitir `prisma migrate deploy` no entrypoint,
# mesmo em produção — não afeta o runtime do NestJS em si.
RUN npm ci --omit=dev && npm install prisma@7.10.0 dotenv

COPY --from=build /app/dist ./dist
COPY --from=build /app/src/generated ./src/generated
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/prisma.config.ts ./prisma.config.ts
COPY docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh

RUN mkdir -p uploads/regulations

EXPOSE 3000

ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["node", "dist/main.js"]
