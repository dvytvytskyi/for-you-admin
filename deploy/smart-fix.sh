#!/bin/bash

# Розумне виправлення: знаходить контейнери та повністю видаляє проблемний backend
# ВИКОРИСТОВУЙТЕ ЦЕЙ СКРИПТ НА СЕРВЕРІ!

set -e

PROJECT_DIR="/opt/admin-panel"

if [ ! -d "${PROJECT_DIR}" ]; then
    echo "❌ Помилка: Цей скрипт має виконуватися на сервері!"
    exit 1
fi

cd ${PROJECT_DIR}

echo "🔍 Знаходження контейнерів..."
echo ""

# Знаходимо БД контейнер
DB_CONTAINER=$(docker ps -a --format "{{.Names}}" | grep -i postgres | grep -i admin | head -1)
if [ -z "$DB_CONTAINER" ]; then
    DB_CONTAINER=$(docker ps -a --format "{{.Names}}" | grep -i postgres | head -1)
fi

if [ -z "$DB_CONTAINER" ]; then
    echo "❌ БД контейнер не знайдено! Перевірте docker-compose.prod.yml"
    exit 1
fi

echo "✅ Знайдено БД контейнер: ${DB_CONTAINER}"

# Знаходимо backend контейнер
BACKEND_CONTAINER=$(docker ps -a --format "{{.Names}}" | grep -i backend | grep -i admin | head -1)
if [ -z "$BACKEND_CONTAINER" ]; then
    BACKEND_CONTAINER=$(docker ps -a --format "{{.Names}}" | grep -i backend | head -1)
fi

if [ -n "$BACKEND_CONTAINER" ]; then
    echo "✅ Знайдено backend контейнер: ${BACKEND_CONTAINER}"
    echo ""
    echo "💀 Радикальне видалення backend контейнера..."
    
    # Зупиняємо
    docker stop ${BACKEND_CONTAINER} 2>/dev/null || true
    
    # Видаляємо контейнер
    docker rm -f ${BACKEND_CONTAINER} 2>/dev/null || true
    
    # Видаляємо через docker-compose
    docker-compose -f docker-compose.prod.yml rm -f admin-panel-backend 2>/dev/null || true
    
    # Видаляємо образ
    BACKEND_IMAGE=$(docker images --format "{{.Repository}}:{{.Tag}}" | grep "admin.*backend" | head -1)
    if [ -n "$BACKEND_IMAGE" ]; then
        echo "Видаляємо образ: ${BACKEND_IMAGE}"
        docker rmi -f ${BACKEND_IMAGE} 2>/dev/null || true
    fi
    
    # Видаляємо всі образи з назвою admin-panel-backend
    docker images | grep "admin-panel.*backend" | awk '{print $3}' | xargs -r docker rmi -f 2>/dev/null || true
    
    echo "✅ Видалено"
else
    echo "ℹ️  Backend контейнер не знайдено (може бути ще не створений)"
fi

echo ""
echo "🔄 Оновлення коду з Git..."
git pull origin main

echo ""
echo "🔧 Перевірка та виправлення конфігурації БД..."
./deploy/check-and-fix-db.sh

echo ""
echo "🏗️  Перебудова backend (без кешу)..."
docker-compose -f docker-compose.prod.yml build --no-cache admin-panel-backend

echo ""
echo "🚀 Створення та запуск контейнера через docker напряму (обхідний шлях)..."
# Використовуємо docker run замість docker-compose для обходу багу

# Читаємо конфігурацію з docker-compose
DB_PASSWORD=$(grep "DB_PASSWORD" .env 2>/dev/null | cut -d '=' -f2 || echo "admin123")

# Запускаємо через docker run напряму
docker run -d \
  --name for-you-admin-panel-backend-prod \
  --restart unless-stopped \
  -p 127.0.0.1:4000:4000 \
  --network admin-panel_admin-network \
  -e NODE_ENV=production \
  -e DATABASE_URL="postgresql://admin:${DB_PASSWORD}@${DB_CONTAINER}:5432/admin_panel" \
  -v ${PROJECT_DIR}/admin-panel-backend/uploads:/app/uploads \
  --env-file ${PROJECT_DIR}/admin-panel-backend/.env \
  admin-panel_admin-panel-backend:latest

echo ""
echo "⏳ Очікуємо запуск backend (25 секунд)..."
sleep 25

echo ""
echo "📋 Останні 40 рядків логів backend:"
echo "=========================================="
docker logs --tail 40 for-you-admin-panel-backend-prod 2>&1
echo "=========================================="
echo ""

echo "🔍 Перевірка health:"
curl -s http://localhost:4000/health 2>&1 | head -10
echo ""
echo ""

echo "📊 Кількість properties в БД:"
docker exec ${DB_CONTAINER} psql -U admin -d admin_panel -t -c "SELECT COUNT(*) FROM properties;" 2>&1 | tr -d ' '
echo ""

echo "✅ Завершено!"
echo ""
echo "🌐 Перевірте в браузері: https://admin.foryou-realestate.com/properties"

