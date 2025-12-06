#!/bin/bash

# Скрипт для деплою нового endpoint PATCH /api/auth/profile
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
echo "🏗️  Перебудова backend контейнера..."
docker-compose -f docker-compose.prod.yml build --no-cache admin-panel-backend

echo ""
echo "🛑 Зупинка та видалення старого контейнера backend..."
docker-compose -f docker-compose.prod.yml stop admin-panel-backend 2>/dev/null || true
docker-compose -f docker-compose.prod.yml rm -f admin-panel-backend 2>/dev/null || true
docker rm -f for-you-admin-panel-backend-prod 2>/dev/null || true

echo ""
echo "🚀 Запуск нового backend контейнера..."
docker-compose -f docker-compose.prod.yml up -d admin-panel-backend

echo ""
echo "⏳ Очікуємо запуск backend (10 секунд)..."
sleep 10

echo ""
echo "📋 Останні 30 рядків логів backend:"
docker logs --tail 30 for-you-admin-panel-backend-prod 2>&1 | tail -30

echo ""
echo "✅ Backend перебудовано та перезапущено!"
echo ""
echo "🧪 Тестування нового endpoint:"
echo "   curl -X PATCH http://localhost:4000/api/auth/profile \\"
echo "     -H 'Authorization: Bearer YOUR_TOKEN' \\"
echo "     -H 'Content-Type: application/json' \\"
echo "     -d '{\"firstName\": \"Test\"}'"
echo ""
echo "🌐 Перевірте API: curl http://localhost:4000/health"

