FROM node:20-alpine AS builder

WORKDIR /app

# Копіюємо файли залежностей
COPY package*.json ./
COPY tsconfig.json ./

# Встановлюємо залежності
RUN npm ci

# Копіюємо вихідний код
COPY . .

# Білдимо проект
RUN npm run build

# Production образ
FROM node:20-alpine

WORKDIR /app

# Копіюємо package files
COPY package*.json ./

# Встановлюємо тільки production залежності
RUN npm ci --only=production

# Копіюємо збілджені файли
COPY --from=builder /app/dist ./dist

# Створюємо директорію для uploads
RUN mkdir -p uploads

EXPOSE 4000

CMD ["node", "dist/server.js"]

