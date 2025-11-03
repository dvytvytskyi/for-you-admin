#!/bin/bash

# Повне виправлення: перебудова backend + перевірка даних
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
echo "🛑 Видалення старого backend контейнера..."
docker rm -f for-you-admin-panel-backend-prod 2>/dev/null || true

echo ""
echo "🔧 Перевірка та виправлення конфігурації БД..."
./deploy/check-and-fix-db.sh

echo ""
echo "🏗️  Перебудова backend (без кешу)..."
docker-compose -f docker-compose.prod.yml build --no-cache admin-panel-backend

echo ""
echo "🚀 Створення та запуск контейнера..."
docker-compose -f docker-compose.prod.yml create admin-panel-backend
docker-compose -f docker-compose.prod.yml start admin-panel-backend

echo ""
echo "⏳ Очікуємо запуск backend (25 секунд)..."
sleep 25

echo ""
echo "📋 Логи backend (останні 40 рядків):"
echo "=========================================="
docker logs --tail 40 for-you-admin-panel-backend-prod 2>&1
echo "=========================================="
echo ""

echo "🔍 Перевірка health:"
curl -s http://localhost:4000/health 2>&1
echo ""
echo ""

echo "📊 Перевірка даних в БД:"
./deploy/check-database-data.sh

echo ""
echo "✅ Завершено!"
echo ""
echo "🌐 Перевірте в браузері: https://admin.foryou-realestate.com/properties"

