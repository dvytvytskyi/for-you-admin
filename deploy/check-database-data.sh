#!/bin/bash

# Перевірка даних в БД та API
# ВИКОРИСТОВУЙТЕ ЦЕЙ СКРИПТ НА СЕРВЕРІ!

set -e

PROJECT_DIR="/opt/admin-panel"

if [ ! -d "${PROJECT_DIR}" ]; then
    echo "❌ Помилка: Цей скрипт має виконуватися на сервері!"
    exit 1
fi

cd ${PROJECT_DIR}

echo "🔍 Перевірка даних в БД..."
echo ""

# Використовуємо правильну назву БД контейнера
DB_CONTAINER="for-you-admin-panel-postgres-prod"

# Перевірка чи існує контейнер
if ! docker ps -a --format "{{.Names}}" | grep -q "^${DB_CONTAINER}$"; then
    echo "❌ БД контейнер ${DB_CONTAINER} не знайдено!"
    echo "Доступні контейнери:"
    docker ps -a --format "{{.Names}}" | grep -i postgres
    exit 1
fi

echo "Використовується БД контейнер: ${DB_CONTAINER}"

# 1. Перевірка підключення до БД
echo "🗄️  Перевірка підключення до БД:"
docker exec ${DB_CONTAINER} pg_isready -U admin
echo ""

# 2. Перевірка кількості properties
echo "📊 Кількість properties в БД:"
PROP_COUNT=$(docker exec ${DB_CONTAINER} psql -U admin -d admin_panel -t -c "SELECT COUNT(*) FROM properties;" | tr -d ' ')
echo "Properties: ${PROP_COUNT}"
echo ""

if [ "$PROP_COUNT" = "0" ] || [ -z "$PROP_COUNT" ]; then
    echo "⚠️  Properties не знайдено в БД!"
    echo ""
    echo "Перевіряємо інші таблиці:"
    echo "Countries:"
    docker exec ${DB_CONTAINER} psql -U admin -d admin_panel -t -c "SELECT COUNT(*) FROM countries;" | tr -d ' '
    echo ""
    echo "Cities:"
    docker exec ${DB_CONTAINER} psql -U admin -d admin_panel -t -c "SELECT COUNT(*) FROM cities;" | tr -d ' '
    echo ""
    echo "Developers:"
    docker exec ${DB_CONTAINER} psql -U admin -d admin_panel -t -c "SELECT COUNT(*) FROM developers;" | tr -d ' '
    echo ""
else
    echo "✅ Знайдено ${PROP_COUNT} properties в БД"
    echo ""
    echo "Приклад перших 3 properties:"
    docker exec ${DB_CONTAINER} psql -U admin -d admin_panel -c "SELECT id, name, property_type FROM properties LIMIT 3;"
fi

echo ""
echo "🔍 Перевірка backend логів..."
echo "=========================================="
docker logs --tail 20 for-you-admin-panel-backend-prod 2>&1 | grep -E "(Database|connected|error|Error|properties)" | tail -10
echo "=========================================="
echo ""

echo "🌐 Перевірка API /health:"
curl -s http://localhost:4000/health 2>&1 | head -5
echo ""
echo ""

echo "🌐 Тест API /api/properties (без авторизації - може бути 401):"
STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:4000/api/properties)
echo "HTTP Status: ${STATUS}"
if [ "$STATUS" = "500" ]; then
    echo "❌ Помилка 500 - перевірте логи backend"
    echo ""
    echo "Останні 30 рядків логів:"
    docker logs --tail 30 for-you-admin-panel-backend-prod 2>&1 | tail -30
fi
echo ""

echo "✅ Перевірка завершена!"

