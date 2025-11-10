#!/bin/bash

# Скрипт для запуску бази даних для admin-panel-backend

set -e

echo "🔄 Перевірка Docker..."
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker не запущений. Будь ласка, запустіть Docker Desktop."
    exit 1
fi

echo "✅ Docker запущений"

cd "$(dirname "$0")/.."

echo "🔄 Запуск бази даних..."
docker-compose up -d admin-panel-db

echo "⏳ Очікування готовності бази даних..."
sleep 5

# Перевірка підключення
for i in {1..30}; do
    if docker exec for-you-admin-panel-postgres-new pg_isready -U admin > /dev/null 2>&1; then
        echo "✅ База даних готова!"
        echo ""
        echo "📊 Інформація про підключення:"
        echo "   Host: localhost"
        echo "   Port: 5435"
        echo "   Database: admin_panel"
        echo "   User: admin"
        echo ""
        echo "🔗 DATABASE_URL: postgresql://admin:admin123@localhost:5435/admin_panel"
        exit 0
    fi
    echo "   Очікування... ($i/30)"
    sleep 1
done

echo "❌ База даних не відповіла протягом 30 секунд"
echo "Перевірте логи: docker-compose logs admin-panel-db"
exit 1

