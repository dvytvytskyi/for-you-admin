#!/bin/bash

# Автоматичне виправлення помилки 502 Bad Gateway
# Виконується через SSH на сервері

set -e

SERVER_IP="135.181.201.185"
SERVER_USER="root"
SERVER_PASSWORD="xTVvPEwrpaF4"
PROJECT_DIR="/root/admin-panel"
BACKEND_CONTAINER="for-you-admin-panel-backend-prod"
DB_CONTAINER="for-you-admin-panel-postgres-prod"

echo "🔍 Діагностика та виправлення помилки 502 Bad Gateway..."
echo ""

echo "📤 Підключення до сервера та виконання команд..."

sshpass -p "${SERVER_PASSWORD}" ssh -o StrictHostKeyChecking=no ${SERVER_USER}@${SERVER_IP} << 'ENDSSH'
set -e

PROJECT_DIR="/root/admin-panel"
BACKEND_CONTAINER="for-you-admin-panel-backend-prod"
DB_CONTAINER="for-you-admin-panel-postgres-prod"

cd ${PROJECT_DIR}

echo "1️⃣ Перевірка статусу контейнерів..."
echo "=========================================="

# Перевірка БД
if docker ps --format "{{.Names}}" | grep -q "^${DB_CONTAINER}$"; then
    echo "✅ БД контейнер запущений"
else
    echo "❌ БД контейнер НЕ запущений! Запускаю..."
    docker-compose -f docker-compose.prod.yml up -d admin-panel-db
    sleep 10
fi

# Перевірка бекенду
if docker ps --format "{{.Names}}" | grep -q "^${BACKEND_CONTAINER}$"; then
    echo "✅ Бекенд контейнер запущений"
    docker ps | grep ${BACKEND_CONTAINER}
else
    echo "❌ Бекенд контейнер НЕ запущений!"
fi

echo ""
echo "2️⃣ Перевірка health endpoint..."
HEALTH_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:4000/health 2>&1 || echo "000")
if [ "$HEALTH_RESPONSE" = "200" ]; then
    echo "✅ Health endpoint відповідає (HTTP 200)"
    curl -s http://localhost:4000/health
else
    echo "❌ Health endpoint НЕ відповідає (HTTP $HEALTH_RESPONSE)"
fi

echo ""
echo "3️⃣ Останні логи бекенду..."
echo "=========================================="
docker logs --tail 50 ${BACKEND_CONTAINER} 2>&1 || echo "Контейнер не знайдено"
echo "=========================================="

echo ""
echo "4️⃣ Перезапуск бекенду..."
if [ "$HEALTH_RESPONSE" != "200" ]; then
    echo "🛑 Зупинка старого бекенду..."
    docker stop ${BACKEND_CONTAINER} 2>/dev/null || true
    docker rm -f ${BACKEND_CONTAINER} 2>/dev/null || true
    
    echo "📥 Оновлення коду з Git..."
    git pull origin main || echo "⚠️  Не вдалося оновити з Git"
    
    echo "🏗️  Перебудова бекенду..."
    docker-compose -f docker-compose.prod.yml build admin-panel-backend
    
    echo "🚀 Запуск бекенду..."
    docker-compose -f docker-compose.prod.yml up -d admin-panel-backend
    
    echo "⏳ Очікуємо запуск бекенду (20 секунд)..."
    sleep 20
    
    echo ""
    echo "5️⃣ Перевірка після перезапуску..."
    NEW_HEALTH=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:4000/health 2>&1 || echo "000")
    if [ "$NEW_HEALTH" = "200" ]; then
        echo "✅ Бекенд успішно запущено!"
        curl -s http://localhost:4000/health
    else
        echo "❌ Бекенд все ще не відповідає (HTTP $NEW_HEALTH)"
        echo ""
        echo "📋 Детальні логи:"
        docker logs --tail 50 ${BACKEND_CONTAINER} 2>&1
    fi
else
    echo "✅ Бекенд працює нормально, перезапуск не потрібен"
fi

echo ""
echo "6️⃣ Перевірка nginx..."
if systemctl is-active --quiet nginx; then
    echo "✅ Nginx запущений"
    nginx -t 2>&1 | tail -1
    echo "🔄 Перезапуск nginx..."
    systemctl reload nginx
else
    echo "❌ Nginx НЕ запущений!"
    systemctl start nginx
fi

echo ""
echo "✅ Діагностика завершена!"
ENDSSH

echo ""
echo "✅ Виправлення завершено!"
echo ""
echo "🌐 Перевірте сайт: https://admin.foryou-realestate.com"
