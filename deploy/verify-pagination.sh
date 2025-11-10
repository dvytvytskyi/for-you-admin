#!/bin/bash

# Скрипт для перевірки пагінації на продакшені
# Використовуйте на сервері: ssh root@135.181.201.185

set -e

PROJECT_DIR="/opt/admin-panel"
BACKEND_CONTAINER="for-you-admin-panel-backend-prod"

echo "🔍 Перевірка пагінації properties..."
echo ""

cd ${PROJECT_DIR} || {
    echo "❌ Проект не знайдено"
    exit 1
}

# 1. Перевірка що бекенд працює
echo "1️⃣ Перевірка статусу бекенду:"
if docker ps | grep -q ${BACKEND_CONTAINER}; then
    echo "   ✅ Backend контейнер працює"
else
    echo "   ❌ Backend контейнер не працює"
    exit 1
fi
echo ""

# 2. Тест API без пагінації (має повернути всі дані)
echo "2️⃣ Тест API БЕЗ пагінації (для перевірки зворотної сумісності):"
RESPONSE_NO_PAGINATION=$(curl -s http://localhost:4000/api/properties -H "Authorization: Bearer test" 2>&1 | head -c 200)
if echo "$RESPONSE_NO_PAGINATION" | grep -q "data"; then
    echo "   ✅ API працює без пагінації"
    COUNT_NO_PAGINATION=$(curl -s http://localhost:4000/api/properties -H "Authorization: Bearer test" 2>&1 | grep -o '"data":\[' | wc -l || echo "0")
    echo "   📊 Структура відповіді: OK"
else
    echo "   ⚠️  Можлива помилка авторизації (це нормально для тесту)"
fi
echo ""

# 3. Тест API З пагінацією (має повернути тільки 100 записів)
echo "3️⃣ Тест API З пагінацією (page=1, limit=100):"
RESPONSE_WITH_PAGINATION=$(curl -s "http://localhost:4000/api/properties?page=1&limit=100" -H "Authorization: Bearer test" 2>&1 | head -c 500)
if echo "$RESPONSE_WITH_PAGINATION" | grep -q "pagination"; then
    echo "   ✅ API повертає структуру з пагінацією"
    echo "   📊 Перевірка структури відповіді..."
    
    # Спробуємо витягнути дані про пагінацію
    PAGINATION_INFO=$(curl -s "http://localhost:4000/api/properties?page=1&limit=100" -H "Authorization: Bearer test" 2>&1 | grep -o '"pagination":{[^}]*}' || echo "")
    if [ ! -z "$PAGINATION_INFO" ]; then
        echo "   ✅ Знайдено об'єкт pagination в відповіді"
        echo "   📋 $PAGINATION_INFO"
    else
        echo "   ⚠️  Можлива помилка авторизації (це нормально для тесту)"
    fi
else
    echo "   ⚠️  Можлива помилка авторизації або структура відповіді змінилася"
fi
echo ""

# 4. Перевірка логів бекенду на наявність пагінації
echo "4️⃣ Перевірка логів бекенду (останні 20 рядків з 'pagination'):"
docker logs ${BACKEND_CONTAINER} 2>&1 | grep -i "pagination\|page\|limit" | tail -5 || echo "   ℹ️  Немає недавніх записів про пагінацію"
echo ""

# 5. Перевірка коду на бекенді
echo "5️⃣ Перевірка коду бекенду (чи є пагінація в коді):"
if docker exec ${BACKEND_CONTAINER} grep -q "hasPagination" /app/dist/routes/properties.routes.js 2>/dev/null; then
    echo "   ✅ Код пагінації присутній в скомпільованому файлі"
else
    echo "   ⚠️  Код пагінації не знайдено - можливо потрібна перебудова"
    echo "   💡 Виконайте: cd ${PROJECT_DIR} && docker-compose -f docker-compose.prod.yml build admin-panel-backend"
fi
echo ""

# 6. Перевірка фронтенду (чи передає параметри пагінації)
echo "6️⃣ Перевірка коду фронтенду (чи передає page/limit):"
FRONTEND_CONTAINER="for-you-admin-panel-frontend-prod"
if docker ps | grep -q ${FRONTEND_CONTAINER}; then
    if docker exec ${FRONTEND_CONTAINER} grep -q "page.*limit" /app/.next/server/app/properties/page.js 2>/dev/null || \
       docker exec ${FRONTEND_CONTAINER} grep -q "URLSearchParams" /app/.next/server/app/properties/page.js 2>/dev/null; then
        echo "   ✅ Фронтенд використовує пагінацію"
    else
        echo "   ⚠️  Не вдалося перевірити - можливо потрібна перебудова фронтенду"
    fi
else
    echo "   ⚠️  Frontend контейнер не знайдено"
fi
echo ""

echo "✅ Перевірка завершена!"
echo ""
echo "💡 Рекомендації:"
echo "   1. Переконайтеся що на фронтенді завжди передаються параметри page та limit"
echo "   2. Перевірте в браузері Network tab - запити мають містити ?page=1&limit=100"
echo "   3. Якщо код змінився, перебудують контейнери:"
echo "      docker-compose -f docker-compose.prod.yml build"
echo "      docker-compose -f docker-compose.prod.yml up -d"

