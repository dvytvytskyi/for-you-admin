#!/bin/bash

# Скрипт для оновлення бази даних на продакшн
# Використання: ./deploy/update-production-database.sh

set -e

SERVER_IP="135.181.201.185"
SERVER_USER="root"
PROJECT_DIR="/opt/admin-panel"
BACKEND_DIR="$PROJECT_DIR/admin-panel-backend"

echo "🚀 Початок оновлення бази даних на продакшн..."
echo ""

# Крок 1: Оновити код з Git
echo "📥 Крок 1: Оновлення коду з Git..."
ssh $SERVER_USER@$SERVER_IP << 'ENDSSH'
cd /opt/admin-panel
git pull origin main
echo "✅ Код оновлено"
ENDSSH

# Крок 2: Завантажити all_properties.json на сервер
echo ""
echo "📤 Крок 2: Завантаження all_properties.json на сервер..."
if [ -f "all_properties.json" ]; then
    scp all_properties.json $SERVER_USER@$SERVER_IP:$PROJECT_DIR/all_properties.json
    echo "✅ all_properties.json завантажено"
else
    echo "⚠️  Файл all_properties.json не знайдено локально. Переконайтеся, що він є на сервері."
fi

# Крок 3: Виконати оновлення БД на сервері
echo ""
echo "🔄 Крок 3: Оновлення бази даних на сервері..."
ssh $SERVER_USER@$SERVER_IP << 'ENDSSH'
set -e

cd /opt/admin-panel

echo "📦 Перебудова бекенд контейнера..."
docker-compose -f docker-compose.prod.yml build admin-panel-backend

echo "🔄 Перезапуск бекенд контейнера..."
docker-compose -f docker-compose.prod.yml restart admin-panel-backend

# Чекаємо, поки контейнер запуститься
echo "⏳ Очікування запуску контейнера..."
sleep 10

# Крок 4: Очищення старих off-plan properties
echo ""
echo "🧹 Крок 4: Очищення старих off-plan properties..."
docker exec for-you-admin-panel-backend-prod npm run clear:offplan || {
    echo "⚠️  Скрипт clear:offplan не знайдено, використовую альтернативний метод..."
    docker exec for-you-admin-panel-backend-prod node dist/scripts/clear-offplan-properties.js || true
}

# Крок 5: Імпорт нових properties
echo ""
echo "📥 Крок 5: Імпорт нових properties з all_properties.json..."
docker exec for-you-admin-panel-backend-prod npm run import:all-properties || {
    echo "⚠️  Скрипт import:all-properties не знайдено, використовую альтернативний метод..."
    docker exec for-you-admin-panel-backend-prod node dist/scripts/import-all-properties.js || true
}

# Крок 6: Видалення дублікатів secondary properties
echo ""
echo "🔍 Крок 6: Перевірка та видалення дублікатів secondary properties..."
docker exec for-you-admin-panel-backend-prod npm run check:secondary-duplicates || {
    docker exec for-you-admin-panel-backend-prod node dist/scripts/check-secondary-duplicates.js || true
}

echo ""
echo "🗑️  Видалення дублікатів..."
docker exec for-you-admin-panel-backend-prod npm run remove:secondary-duplicates || {
    docker exec for-you-admin-panel-backend-prod node dist/scripts/remove-secondary-duplicates.js || true
}

# Крок 7: Перевірка статистики
echo ""
echo "📊 Крок 7: Перевірка статистики БД..."
docker exec for-you-admin-panel-backend-prod npm run count:properties || {
    docker exec for-you-admin-panel-backend-prod node dist/scripts/count-properties.js || true
}

echo ""
echo "✅ Оновлення бази даних завершено!"
ENDSSH

echo ""
echo "🎉 Готово! База даних оновлена на продакшн."

