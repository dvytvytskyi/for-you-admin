#!/bin/bash

# Скрипт для перевірки логів backend та діагностики помилок
# ВИКОРИСТОВУЙТЕ ЦЕЙ СКРИПТ НА СЕРВЕРІ!

set -e

PROJECT_DIR="/opt/admin-panel"

if [ ! -d "${PROJECT_DIR}" ]; then
    echo "❌ Помилка: Цей скрипт має виконуватися на сервері!"
    exit 1
fi

cd ${PROJECT_DIR}

echo "🔍 Діагностика backend..."
echo ""

# 1. Статус контейнера
echo "📦 Статус backend контейнера:"
docker ps -a | grep backend-prod || echo "Контейнер не знайдено"
echo ""

# 2. Останні 50 рядків логів
echo "📋 Останні 50 рядків логів backend:"
echo "=========================================="
docker logs --tail 50 for-you-admin-panel-backend-prod 2>&1
echo "=========================================="
echo ""

# 3. Перевірка підключення до БД
echo "🗄️  Перевірка підключення до БД з backend контейнера:"
docker exec for-you-admin-panel-backend-prod sh -c 'node -e "const {AppDataSource} = require(\"./dist/config/database\"); console.log(\"DB initialized:\", AppDataSource.isInitialized);"' 2>&1 || echo "Не вдалося перевірити підключення"
echo ""

# 4. Перевірка DATABASE_URL
echo "📝 Перевірка DATABASE_URL в контейнері:"
docker exec for-you-admin-panel-backend-prod sh -c 'echo $DATABASE_URL' 2>&1 | head -c 50
echo "..."
echo ""

# 5. Перевірка entities
echo "📂 Перевірка наявності entities в dist:"
docker exec for-you-admin-panel-backend-prod sh -c 'ls -la dist/entities/ 2>&1 | head -10' || echo "Папка dist/entities не знайдена"
echo ""

# 6. Тест API
echo "🌐 Тест API /health:"
curl -s http://localhost:4000/health | head -3
echo ""
echo ""

# 7. Тест API /api/properties (може повернути помилку)
echo "🌐 Тест API /api/properties (потрібен токен):"
curl -s -o /dev/null -w "HTTP Status: %{http_code}\n" http://localhost:4000/api/properties || echo "Помилка запиту"
echo ""

echo "✅ Діагностика завершена!"

