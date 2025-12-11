#!/bin/bash

# Скрипт для виправлення помилки 502 Bad Gateway
# ВИКОРИСТОВУЙТЕ ЦЕЙ СКРИПТ НА СЕРВЕРІ!

set -e

PROJECT_DIR="/opt/admin-panel"

if [ ! -d "${PROJECT_DIR}" ]; then
    echo "❌ Помилка: Цей скрипт має виконуватися на сервері!"
    exit 1
fi

cd ${PROJECT_DIR}

BACKEND_CONTAINER="for-you-admin-panel-backend-prod"
DB_CONTAINER="for-you-admin-panel-postgres-prod"

echo "🔍 Діагностика проблеми 502 Bad Gateway..."
echo ""

# 1. Перевірка чи запущений бекенд контейнер
echo "1️⃣ Перевірка статусу бекенд контейнера:"
if docker ps --format "{{.Names}}" | grep -q "^${BACKEND_CONTAINER}$"; then
    echo "✅ Бекенд контейнер запущений"
    docker ps | grep ${BACKEND_CONTAINER}
else
    echo "❌ Бекенд контейнер НЕ запущений!"
    echo "Спробуємо запустити..."
fi
echo ""

# 2. Перевірка чи запущений БД контейнер
echo "2️⃣ Перевірка статусу БД контейнера:"
if docker ps --format "{{.Names}}" | grep -q "^${DB_CONTAINER}$"; then
    echo "✅ БД контейнер запущений"
else
    echo "❌ БД контейнер НЕ запущений!"
    echo "Запускаємо БД..."
    docker-compose -f docker-compose.prod.yml up -d admin-panel-db
    echo "⏳ Очікуємо запуск БД (10 секунд)..."
    sleep 10
fi
echo ""

# 3. Перевірка логів бекенду
echo "3️⃣ Останні логи бекенду:"
echo "=========================================="
docker logs --tail 50 ${BACKEND_CONTAINER} 2>&1 || echo "Контейнер не знайдено або не запущений"
echo "=========================================="
echo ""

# 4. Перевірка чи бекенд слухає на порту 4000
echo "4️⃣ Перевірка порту 4000:"
if netstat -tuln 2>/dev/null | grep -q ":4000" || ss -tuln 2>/dev/null | grep -q ":4000"; then
    echo "✅ Порт 4000 відкритий"
else
    echo "❌ Порт 4000 НЕ відкритий!"
fi
echo ""

# 5. Тест health endpoint
echo "5️⃣ Тест health endpoint:"
HEALTH_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:4000/health 2>&1 || echo "000")
if [ "$HEALTH_RESPONSE" = "200" ]; then
    echo "✅ Health endpoint відповідає (HTTP 200)"
    curl -s http://localhost:4000/health | head -3
else
    echo "❌ Health endpoint НЕ відповідає (HTTP $HEALTH_RESPONSE)"
fi
echo ""

# 6. Перевірка nginx
echo "6️⃣ Перевірка nginx:"
if systemctl is-active --quiet nginx; then
    echo "✅ Nginx запущений"
    echo "Перевірка конфігурації nginx..."
    nginx -t 2>&1 | tail -1
else
    echo "❌ Nginx НЕ запущений!"
fi
echo ""

# 7. Перезапуск бекенду якщо потрібно
if [ "$HEALTH_RESPONSE" != "200" ]; then
    echo "🔄 Перезапуск бекенду..."
    echo ""
    
    # Зупинка старого контейнера
    if docker ps -a --format "{{.Names}}" | grep -q "^${BACKEND_CONTAINER}$"; then
        echo "🛑 Зупинка старого бекенду..."
        docker stop ${BACKEND_CONTAINER} 2>/dev/null || true
        docker rm -f ${BACKEND_CONTAINER} 2>/dev/null || true
    fi
    
    # Оновлення коду
    echo "📥 Оновлення коду з Git..."
    git pull origin main || echo "⚠️  Не вдалося оновити з Git"
    
    # Перебудова та запуск
    echo "🏗️  Перебудова бекенду..."
    docker-compose -f docker-compose.prod.yml build admin-panel-backend
    
    echo "🚀 Запуск бекенду..."
    docker-compose -f docker-compose.prod.yml up -d admin-panel-backend
    
    echo "⏳ Очікуємо запуск бекенду (15 секунд)..."
    sleep 15
    
    # Перевірка після перезапуску
    echo ""
    echo "📋 Логи після перезапуску:"
    docker logs --tail 30 ${BACKEND_CONTAINER} 2>&1
    
    echo ""
    echo "🔍 Повторна перевірка health endpoint:"
    sleep 5
    NEW_HEALTH=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:4000/health 2>&1 || echo "000")
    if [ "$NEW_HEALTH" = "200" ]; then
        echo "✅ Бекенд успішно запущено!"
        curl -s http://localhost:4000/health
    else
        echo "❌ Бекенд все ще не відповідає (HTTP $NEW_HEALTH)"
        echo "Перевірте логи вище для деталей"
    fi
fi

echo ""
echo "✅ Діагностика завершена!"
echo ""
echo "📝 Наступні кроки:"
echo "1. Перевірте логи: docker logs -f ${BACKEND_CONTAINER}"
echo "2. Перевірте nginx логи: tail -f /var/log/nginx/admin-panel-error.log"
echo "3. Перевірте чи працює БД: docker exec ${DB_CONTAINER} pg_isready -U admin"
