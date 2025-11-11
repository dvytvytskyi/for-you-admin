#!/bin/bash

# Скрипт для виправлення та оновлення продакшн БД
SERVER_IP="135.181.201.185"
SERVER_USER="root"
SERVER_PASSWORD="FNrtVkfCRwgW"
PROJECT_DIR="/opt/admin-panel"

if ! command -v sshpass &> /dev/null; then
    if [[ "$OSTYPE" == "darwin"* ]]; then
        brew install hudochenkov/sshpass/sshpass 2>/dev/null || true
    fi
fi

# Завантажити all_properties.json
echo "📤 Завантаження all_properties.json на сервер..."
if [ -f "all_properties.json" ]; then
    sshpass -p "${SERVER_PASSWORD}" scp -o StrictHostKeyChecking=no all_properties.json ${SERVER_USER}@${SERVER_IP}:${PROJECT_DIR}/all_properties.json
    echo "✅ Файл завантажено"
else
    echo "❌ Файл all_properties.json не знайдено!"
    exit 1
fi

# Виконати на сервері
sshpass -p "${SERVER_PASSWORD}" ssh -o StrictHostKeyChecking=no ${SERVER_USER}@${SERVER_IP} << 'ENDSSH'
set -e

PROJECT_DIR="/opt/admin-panel"
cd ${PROJECT_DIR}

echo ""
echo "🔧 Виправлення Git конфліктів..."
# Видаляємо конфліктний файл
rm -f admin-panel-backend/src/scripts/count-offplan-by-area.ts 2>/dev/null || true

echo ""
echo "📥 Оновлення коду з Git..."
git fetch origin
git reset --hard origin/main || {
    echo "⚠️  Git reset не вдався, пробуємо інший підхід..."
    git stash
    git pull origin main
}

echo ""
echo "🔨 Перебудова бекенду..."
docker-compose -f docker-compose.prod.yml build admin-panel-backend

echo ""
echo "🛑 Зупинка старого контейнера..."
docker-compose -f docker-compose.prod.yml stop admin-panel-backend 2>/dev/null || true
docker rm -f for-you-admin-panel-backend-prod 2>/dev/null || true

echo ""
echo "🔄 Запуск нового контейнера..."
docker-compose -f docker-compose.prod.yml up -d --force-recreate --no-deps admin-panel-backend

echo ""
echo "⏳ Очікування запуску (20 секунд)..."
sleep 20

echo ""
echo "📁 Копіювання all_properties.json в контейнер..."
docker cp ${PROJECT_DIR}/all_properties.json for-you-admin-panel-backend-prod:/app/all_properties.json
echo "✅ Файл скопійовано"

echo ""
echo "🔍 Перевірка наявності скриптів в dist..."
docker exec for-you-admin-panel-backend-prod ls -la dist/scripts/ | head -10 || {
    echo "❌ Скрипти не скомпільовані!"
    echo "Перевіряємо чи є dist директорія..."
    docker exec for-you-admin-panel-backend-prod ls -la dist/ || echo "❌ dist не існує"
    exit 1
}

echo ""
echo "📊 Статистика БД ДО оновлення:"
docker exec for-you-admin-panel-postgres-prod psql -U admin -d admin_panel -c "
SELECT \"propertyType\", COUNT(*) as count FROM properties GROUP BY \"propertyType\";
"

echo ""
echo "🧹 Очищення старих off-plan properties..."
# Використовуємо SQL напряму, бо це надійніше
docker exec for-you-admin-panel-postgres-prod psql -U admin -d admin_panel -c "
DELETE FROM properties WHERE \"propertyType\" = 'off-plan';
"
echo "✅ Старі off-plan properties видалено"

echo ""
echo "📥 Імпорт нових off-plan properties..."
docker exec for-you-admin-panel-backend-prod node dist/scripts/import-all-properties.js 2>&1 || {
    echo "❌ Помилка імпорту"
    echo "Логи:"
    docker logs for-you-admin-panel-backend-prod --tail 30
    exit 1
}

echo ""
echo "📊 Статистика БД ПІСЛЯ оновлення:"
docker exec for-you-admin-panel-postgres-prod psql -U admin -d admin_panel -c "
SELECT \"propertyType\", COUNT(*) as count FROM properties GROUP BY \"propertyType\";
"

echo ""
echo "🔄 Перезапуск бекенду..."
docker-compose -f docker-compose.prod.yml restart admin-panel-backend

echo ""
echo "✅ Оновлення завершено!"

ENDSSH

echo ""
echo "🎉 Готово!"

