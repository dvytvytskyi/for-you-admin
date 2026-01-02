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

# Встановлюємо Chromium та залежності для Puppeteer
# Puppeteer v20+ використовує "chrome-headless-shell" або Chromium
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    nodejs \
    yarn

# Вказуємо Puppeteer використовувати встановлений Chromium
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

WORKDIR /app

# Копіюємо package files
COPY package*.json ./

# Встановлюємо тільки production залежності
RUN npm ci --only=production

# Копіюємо збілджені файли
COPY --from=builder /app/dist ./dist

# Створюємо директорію для uploads і templates (якщо будуть копіюватись)
RUN mkdir -p uploads
# Копіюємо папку templates, якщо вона існуватиме в src (при build tsc не копіює не-ts файли за замовчуванням, треба налаштувати або копіювати вручну)
# Але поки що ми будемо очікувати, що templates будуть в dist/templates або копіюємо їх окремо
COPY --from=builder /app/src/templates ./dist/templates

EXPOSE 4000

CMD ["node", "dist/server.js"]
