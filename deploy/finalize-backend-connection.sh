#!/bin/bash

# Фіналізація після відновлення PostgreSQL
# Перезапуск backend та перевірка роботи

set -e

BACKEND_CONTAINER="for-you-admin-panel-backend-prod"
DB_CONTAINER="for-you-admin-panel-postgres-prod"

if [ ! -d "/opt/admin-panel" ]; then
    echo "❌ Помилка: Цей скрипт має виконуватися на сервері!"
    exit 1
fi

echo "🔄 Перезапуск backend для підключення до БД..."
echo ""

# 1. Перезапуск backend
docker restart ${BACKEND_CONTAINER}

# 2. Очікування запуску
echo "⏳ Очікуємо запуск backend (15 секунд)..."
sleep 15

# 3. Перевірка логів
echo ""
echo "📋 Останні 30 рядків логів backend:"
echo "=========================================="
docker logs --tail 30 ${BACKEND_CONTAINER} 2>&1
echo "=========================================="
echo ""

# 4. Перевірка health endpoint
echo "🔍 Перевірка health endpoint:"
HEALTH_RESPONSE=$(curl -s http://localhost:4000/health 2>&1 || echo "ERROR")
echo "${HEALTH_RESPONSE}"
echo ""

# 5. Перевірка статусу БД в health
if echo "${HEALTH_RESPONSE}" | grep -q '"database":"connected"'; then
    echo "✅ Backend підключений до БД!"
else
    echo "⚠️  Backend ще не підключений до БД. Перевіряємо логи..."
    sleep 10
    docker logs --tail 20 ${BACKEND_CONTAINER} 2>&1 | grep -i "database\|error\|connected" || true
fi

# 6. Перевірка нових таблиць та полів
echo ""
echo "📊 Перевірка нових таблиць та полів:"
echo ""

# Collections
echo "Collections:"
docker exec ${DB_CONTAINER} psql -U admin -d admin_panel -c "SELECT COUNT(*) as count FROM collections;" 2>&1 | grep -v "count\|row" | head -1

# Favorites
echo "Favorites:"
docker exec ${DB_CONTAINER} psql -U admin -d admin_panel -c "SELECT COUNT(*) as count FROM favorites;" 2>&1 | grep -v "count\|row" | head -1

# Investments
echo "Investments:"
docker exec ${DB_CONTAINER} psql -U admin -d admin_panel -c "SELECT COUNT(*) as count FROM investments;" 2>&1 | grep -v "count\|row" | head -1

# Areas з новими полями
echo ""
echo "Перевірка полів Areas:"
docker exec ${DB_CONTAINER} psql -U admin -d admin_panel -c "\d areas" | grep -E "(description|images)" || echo "⚠️  Нові поля не знайдено в areas"

# Developers з новими полями
echo ""
echo "Перевірка полів Developers:"
docker exec ${DB_CONTAINER} psql -U admin -d admin_panel -c "\d developers" | grep -E "(images)" || echo "⚠️  Нові поля не знайдено в developers"

# 7. Перевірка користувачів
echo ""
echo "👤 Список користувачів:"
docker exec ${DB_CONTAINER} psql -U admin -d admin_panel -c "SELECT email, role, status FROM users;" 2>&1

# 8. Тест API endpoint
echo ""
echo "🧪 Тест API /auth/me (потрібен токен):"
echo "   Для тестування використайте:"
echo "   curl -H 'Authorization: Bearer YOUR_TOKEN' http://localhost:4000/api/auth/me"
echo ""

# 9. Перевірка статусу контейнерів
echo "📊 Статус контейнерів:"
docker-compose -f docker-compose.prod.yml ps 2>&1 | grep -E "(NAME|backend|postgres)" || docker ps | grep -E "(backend|postgres)"
echo ""

echo "✅ Перевірка завершена!"
echo ""
echo "🌐 URL: https://admin.foryou-realestate.com"
echo "📧 Дані для входу:"
echo "   Email: evelyn@admin-for-you.com"
echo "   Password: s5GhepwhhxNto1UX"
echo ""
echo "💡 Якщо логін не працює, перевірте:"
echo "   1. Чи backend підключений до БД (health endpoint)"
echo "   2. Чи користувач існує в БД (показано вище)"
echo "   3. Логи backend: docker logs -f ${BACKEND_CONTAINER}"

