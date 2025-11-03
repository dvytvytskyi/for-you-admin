#!/bin/bash

# Обхідний шлях для багу docker-compose ContainerConfig
# Використовує docker create + start замість up
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
echo "💀 Видалення старого контейнера (повне)..."
docker stop for-you-admin-panel-backend-prod 2>/dev/null || true
docker rm -f for-you-admin-panel-backend-prod 2>/dev/null || true

# Видаляємо через docker-compose без перевірки образу
docker-compose -f docker-compose.prod.yml rm -f admin-panel-backend 2>/dev/null || true

echo "✅ Видалено"

echo ""
echo "🔧 Перевірка та виправлення конфігурації БД..."
./deploy/check-and-fix-db.sh

echo ""
echo "🏗️  Перебудова backend (без кешу)..."
docker-compose -f docker-compose.prod.yml build --no-cache admin-panel-backend

echo ""
echo "🚀 Створення контейнера через docker-compose create (обхідний шлях)..."
# Використовуємо create замість up, щоб уникнути багу ContainerConfig
docker-compose -f docker-compose.prod.yml create --force-recreate admin-panel-backend

echo ""
echo "▶️  Запуск контейнера..."
docker-compose -f docker-compose.prod.yml start admin-panel-backend

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
curl -s http://localhost:4000/health 2>&1 | head -5
echo ""
echo ""

echo "📊 Статус контейнера:"
docker ps | grep backend-prod || echo "Контейнер не запущено"
echo ""

echo "✅ Завершено!"
echo ""
echo "🌐 Перевірте в браузері: https://admin.foryou-realestate.com"

