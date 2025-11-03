#!/bin/bash

# Скрипт для перебудови та перезапуску backend
# ВИКОРИСТОВУЙТЕ ЦЕЙ СКРИПТ НА СЕРВЕРІ!

set -e

PROJECT_DIR="/opt/admin-panel"

if [ ! -d "${PROJECT_DIR}" ]; then
    echo "❌ Помилка: Цей скрипт має виконуватися на сервері!"
    exit 1
fi

cd ${PROJECT_DIR}

echo "🔄 Оновлення коду з Git..."
git pull origin main

echo ""
echo "🔧 Перевірка та виправлення конфігурації БД..."
./deploy/check-and-fix-db.sh

echo ""
echo "🏗️  Перебудова backend контейнера..."
docker-compose -f docker-compose.prod.yml build --no-cache admin-panel-backend

echo ""
echo "🚀 Перезапуск backend..."
docker-compose -f docker-compose.prod.yml up -d admin-panel-backend

echo ""
echo "⏳ Очікуємо запуск backend (10 секунд)..."
sleep 10

echo ""
echo "📋 Останні 20 рядків логів backend:"
docker logs --tail 20 for-you-admin-panel-backend-prod 2>&1 | tail -20

echo ""
echo "✅ Backend перебудовано та перезапущено!"
echo ""
echo "🌐 Перевірте API: curl http://localhost:4000/health"

