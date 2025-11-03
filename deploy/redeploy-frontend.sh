#!/bin/bash

# Скрипт для перебілду frontend з правильним API URL
# ВИКОРИСТОВУЙТЕ ЦЕЙ СКРИПТ НА СЕРВЕРІ, НЕ ЛОКАЛЬНО!

set -e

PROJECT_DIR="/opt/admin-panel"
DOMAIN="admin.foryou-realestate.com"

# Перевірка чи скрипт виконується на сервері
if [ ! -d "${PROJECT_DIR}" ]; then
    echo "❌ Помилка: Цей скрипт має виконуватися на сервері!"
    echo "📝 Підключіться до сервера через SSH:"
    echo "   ssh root@135.181.201.185"
    echo ""
    echo "Пароль: FNrtVkfCRwgW"
    echo ""
    echo "Після підключення виконайте:"
    echo "   cd /opt/admin-panel"
    echo "   git pull origin main"
    echo "   ./deploy/redeploy-frontend.sh"
    exit 1
fi

echo "🔧 Виправлення frontend з правильним API URL..."
echo ""

cd ${PROJECT_DIR}

# Оновлюємо код з репозиторію
echo "📥 Оновлення коду з Git..."
git pull origin main
echo ""

# Створюємо/оновлюємо .env.production
echo "📝 Створення .env.production..."
cat > ${PROJECT_DIR}/admin-panel/.env.production << EOF
NEXT_PUBLIC_API_URL=https://${DOMAIN}/api
EOF
echo "✅ .env.production створено:"
cat ${PROJECT_DIR}/admin-panel/.env.production
echo ""

# Зупиняємо frontend
echo "🛑 Зупинка frontend контейнера..."
docker-compose -f docker-compose.prod.yml stop admin-panel-frontend || true
docker-compose -f docker-compose.prod.yml rm -f admin-panel-frontend || true
echo ""

# Перебілд frontend з правильним API URL
echo "🔨 Перебілд frontend (це може зайняти кілька хвилин)..."
docker-compose -f docker-compose.prod.yml build --no-cache admin-panel-frontend
echo ""

# Запускаємо frontend
echo "🚀 Запуск frontend..."
docker-compose -f docker-compose.prod.yml up -d admin-panel-frontend
echo ""

# Очікування
echo "⏳ Очікування запуску (15 секунд)..."
sleep 15

# Перевірка статусу
echo ""
echo "📊 Статус контейнерів:"
docker-compose -f docker-compose.prod.yml ps
echo ""

# Перевірка логів
echo "📋 Останні логи frontend:"
docker-compose -f docker-compose.prod.yml logs --tail=20 admin-panel-frontend
echo ""

echo "✅ Готово!"
echo "🌐 Відкрийте в браузері: https://${DOMAIN}"
echo ""
echo "📧 Дані для входу (якщо потрібно):"
echo "   ./deploy/show-credentials.sh"

