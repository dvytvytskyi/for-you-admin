#!/bin/bash

# Повне виправлення backend: видалення контейнера, перебудова, перевірка
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
echo "🛑 Зупинка та видалення старого backend контейнера..."
docker stop for-you-admin-panel-backend-prod 2>/dev/null || true
docker rm -f for-you-admin-panel-backend-prod 2>/dev/null || true
docker-compose -f docker-compose.prod.yml stop admin-panel-backend 2>/dev/null || true
docker-compose -f docker-compose.prod.yml rm -f admin-panel-backend 2>/dev/null || true

echo ""
echo "🔧 Перевірка та виправлення конфігурації БД..."
./deploy/check-and-fix-db.sh

echo ""
echo "🏗️  Перебудова backend контейнера (без кешу)..."
docker-compose -f docker-compose.prod.yml build --no-cache admin-panel-backend

echo ""
echo "🚀 Запуск backend..."
docker-compose -f docker-compose.prod.yml up -d admin-panel-backend

echo ""
echo "⏳ Очікуємо запуск backend (15 секунд)..."
sleep 15

echo ""
echo "📋 Останні 30 рядків логів backend:"
echo "=========================================="
docker logs --tail 30 for-you-admin-panel-backend-prod 2>&1
echo "=========================================="
echo ""

echo "🔍 Перевірка health endpoint:"
curl -s http://localhost:4000/health | head -5
echo ""
echo ""

echo "📊 Статус контейнерів:"
docker-compose -f docker-compose.prod.yml ps
echo ""

echo "✅ Backend виправлено та перезапущено!"
echo ""
echo "🌐 Перевірте в браузері: https://admin.foryou-realestate.com"
echo "📋 Для детальних логів: ./deploy/check-backend-logs.sh"

