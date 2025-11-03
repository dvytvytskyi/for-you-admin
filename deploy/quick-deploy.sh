#!/bin/bash

# Швидкий деплой для тих, хто вже налаштував сервер
# Використання: ./quick-deploy.sh

set -e

PROJECT_DIR="/opt/admin-panel"
cd $PROJECT_DIR

echo "🚀 Швидкий деплой Admin Panel..."

# Оновлення коду (якщо використовуєте git)
if [ -d "$PROJECT_DIR/.git" ]; then
    echo "📥 Оновлення коду з Git..."
    git pull
fi

# Будівництво та перезапуск
echo "🐳 Перебудова контейнерів..."
docker-compose -f docker-compose.prod.yml build --no-cache

echo "🔄 Перезапуск сервісів..."
docker-compose -f docker-compose.prod.yml down
docker-compose -f docker-compose.prod.yml up -d

echo "⏳ Очікування запуску..."
sleep 5

# Перевірка статусу
docker-compose -f docker-compose.prod.yml ps

echo "✅ Деплой завершено!"
echo "🌐 Сайт: https://admin.foryou-realestate.com"

