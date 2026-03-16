FROM node:20-alpine

WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY . .

# Генерируем Prisma клиент
ENV DATABASE_URL=postgresql://placeholder:placeholder@localhost:5432/placeholder
RUN npx prisma generate --schema=./prisma/schema.prisma

EXPOSE 3000
CMD ["node", "src/index.js"]