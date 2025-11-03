#!/bin/bash

# Застосування міграцій БД
# ВИКОРИСТОВУЙТЕ ЦЕЙ СКРИПТ НА СЕРВЕРІ!

set -e

PROJECT_DIR="/opt/admin-panel"
DB_CONTAINER="for-you-admin-panel-postgres-prod"

if [ ! -d "${PROJECT_DIR}" ]; then
    echo "❌ Помилка: Цей скрипт має виконуватися на сервері!"
    exit 1
fi

cd ${PROJECT_DIR}

echo "🗄️  Застосування міграцій БД..."
echo ""

MIGRATION_FILE="${PROJECT_DIR}/admin-panel-backend/src/migrations/002-create-collections-favorites-investments.sql"

if [ ! -f "${MIGRATION_FILE}" ]; then
    echo "❌ Файл міграції не знайдено: ${MIGRATION_FILE}"
    exit 1
fi

echo "📝 Виконуємо міграцію..."
docker exec -i ${DB_CONTAINER} psql -U admin -d admin_panel < ${MIGRATION_FILE}

if [ $? -eq 0 ]; then
    echo "✅ Міграція успішно застосована!"
else
    echo "❌ Помилка при застосуванні міграції"
    exit 1
fi

echo ""
echo "📊 Перевірка створених таблиць:"
docker exec ${DB_CONTAINER} psql -U admin -d admin_panel -c "\dt" | grep -E "(collections|favorites|investments)" || echo "Таблиці створено"

echo ""
echo "✅ Готово!"

