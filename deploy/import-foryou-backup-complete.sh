#!/bin/bash

# Скрипт для повного імпорту backup бази foryou
# Виконати на сервері: 88.99.38.25

set -e

BACKUP_FILE="/opt/admin-pro-part/backups/migration_backup_20251118_095046.sql"
DB_NAME="foryou_admin_panel"
CONTAINER_NAME="for-you-admin-panel-postgres-prod"

echo "📥 ПОВНИЙ ІМПОРТ BACKUP БАЗИ FORYOU"
echo "===================================="
echo ""

# Перевірка файлу
if [ ! -f "$BACKUP_FILE" ]; then
    echo "❌ Backup файл не знайдено: $BACKUP_FILE"
    exit 1
fi

echo "✅ Backup файл знайдено: $BACKUP_FILE"
echo "   Розмір: $(du -h $BACKUP_FILE | cut -f1)"
echo ""

# Копіюємо файл в контейнер
echo "📋 Копіюю backup в контейнер..."
docker cp "$BACKUP_FILE" ${CONTAINER_NAME}:/tmp/backup.sql
echo "✅ Файл скопійовано"
echo ""

# Створюємо модифікований backup без обмежень
echo "🔧 Створюю модифікований backup без обмежень..."
docker exec ${CONTAINER_NAME} bash -c "
    # Видаляємо restrict та додаємо unrestrict
    sed 's/\\\\restrict.*/\\\\unrestrict Lwis9SqyfyE77xUdKEixijRB43Z6A5T5dxOE95AGnGfRP2WZKc277BVbrcpENo2/' /tmp/backup.sql > /tmp/backup_unrestricted.sql
    echo '✅ Backup модифіковано'
"

# Імпортуємо через psql
echo ""
echo "📥 Імпортую дані в базу $DB_NAME..."
echo "   (це може зайняти кілька хвилин...)"
echo ""

# Використовуємо psql з опцією для ігнорування помилок на початку
docker exec ${CONTAINER_NAME} psql -U admin -d ${DB_NAME} -f /tmp/backup_unrestricted.sql 2>&1 | grep -v "ERROR.*BBQ\|ERROR.*Giant\|ERROR.*Outdoor\|error: backslash commands" | tail -20 || true

echo ""
echo "🔍 Перевірка після імпорту:"
echo ""

echo "Кількість properties:"
docker exec ${CONTAINER_NAME} psql -U admin -d ${DB_NAME} -c "SELECT COUNT(*) FROM properties;" 2>&1 | grep -v "Password:" | grep -E "[0-9]" || echo "0"

echo ""
echo "Розподіл по типах:"
docker exec ${CONTAINER_NAME} psql -U admin -d ${DB_NAME} -c "SELECT \"propertyType\", COUNT(*) FROM properties GROUP BY \"propertyType\";" 2>&1 | grep -v "Password:" | head -10

echo ""
echo "Кількість areas:"
docker exec ${CONTAINER_NAME} psql -U admin -d ${DB_NAME} -c "SELECT COUNT(*) FROM areas;" 2>&1 | grep -v "Password:" | grep -E "[0-9]" || echo "0"

echo ""
echo "Кількість developers:"
docker exec ${CONTAINER_NAME} psql -U admin -d ${DB_NAME} -c "SELECT COUNT(*) FROM developers;" 2>&1 | grep -v "Password:" | grep -E "[0-9]" || echo "0"

echo ""
echo "✅ Імпорт завершено!"


