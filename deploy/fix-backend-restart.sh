#!/bin/bash

# Виправлення перезапуску бекенду
set -e

PROJECT_DIR="/opt/admin-panel"
BACKEND_CONTAINER="for-you-admin-panel-backend-prod"

cd ${PROJECT_DIR} || exit 1

echo "🛑 Зупинка та видалення старого контейнера..."
docker stop ${BACKEND_CONTAINER} 2>/dev/null || true
docker rm -f ${BACKEND_CONTAINER} 2>/dev/null || true

echo ""
echo "🚀 Запуск нового контейнера..."
docker-compose -f docker-compose.prod.yml up -d admin-panel-backend

echo ""
echo "⏳ Очікування запуску (10 секунд)..."
sleep 10

echo ""
echo "📊 Статус контейнера:"
docker ps | grep ${BACKEND_CONTAINER} || echo "❌ Контейнер не запущений"

echo ""
echo "📋 Останні 30 рядків логів:"
docker logs --tail 30 ${BACKEND_CONTAINER} 2>&1 || echo "Не вдалося отримати логи"

echo ""
echo "✅ Готово!"

