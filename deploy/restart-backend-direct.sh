#!/bin/bash

# Перезапуск бекенду через docker run напряму
set -e

PROJECT_DIR="/opt/admin-panel"
BACKEND_CONTAINER="for-you-admin-panel-backend-prod"
DB_CONTAINER="for-you-admin-panel-postgres-prod"
NETWORK="admin-panel_admin-network"
IMAGE_NAME="admin-panel_admin-panel-backend:latest"

cd ${PROJECT_DIR} || exit 1

echo "🛑 Зупинка та видалення старого контейнера..."
docker stop ${BACKEND_CONTAINER} 2>/dev/null || true
docker rm -f ${BACKEND_CONTAINER} 2>/dev/null || true

echo ""
echo "📝 Читаємо конфігурацію..."
DB_PASSWORD=$(grep "DB_PASSWORD" .env 2>/dev/null | cut -d '=' -f2 || echo "admin123")

echo ""
echo "🚀 Запуск нового контейнера через docker run..."
docker run -d \
  --name ${BACKEND_CONTAINER} \
  --restart unless-stopped \
  -p 127.0.0.1:4000:4000 \
  --network ${NETWORK} \
  -e NODE_ENV=production \
  -e DATABASE_URL="postgresql://admin:${DB_PASSWORD}@${DB_CONTAINER}:5432/admin_panel" \
  -v ${PROJECT_DIR}/admin-panel-backend/uploads:/app/uploads \
  --env-file ${PROJECT_DIR}/admin-panel-backend/.env \
  ${IMAGE_NAME}

echo ""
echo "⏳ Очікування запуску (15 секунд)..."
sleep 15

echo ""
echo "📊 Статус контейнера:"
docker ps | grep ${BACKEND_CONTAINER} || echo "❌ Контейнер не запущений"

echo ""
echo "📋 Останні 30 рядків логів:"
docker logs --tail 30 ${BACKEND_CONTAINER} 2>&1 || echo "Не вдалося отримати логи"

echo ""
echo "🔍 Health check:"
curl -s http://localhost:4000/health 2>&1 | head -3 || echo "Backend ще не готовий"

echo ""
echo "✅ Готово!"

