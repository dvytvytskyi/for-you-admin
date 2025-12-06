#!/bin/bash

# Скрипт для імпорту бази даних foryou на новий сервер
# Виконати на новому сервері: 88.99.38.25

set -e

BACKUP_FILE="/opt/admin-panel/foryou_backup.sql"
DB_NAME="foryou_admin_panel"
CONTAINER_NAME="for-you-admin-panel-postgres-prod"

echo "🔍 Перевірка backup файлу..."
if [ ! -f "$BACKUP_FILE" ]; then
    echo "❌ Backup файл не знайдено: $BACKUP_FILE"
    echo ""
    echo "💡 Спочатку скопіюйте backup зі старого сервера:"
    echo "   scp root@135.181.201.185:/tmp/foryou_backup.sql /opt/admin-panel/"
    exit 1
fi

echo "✅ Backup файл знайдено: $BACKUP_FILE"
echo "   Розмір: $(du -h $BACKUP_FILE | cut -f1)"
echo ""

echo "🔧 Імпортую дані в базу $DB_NAME..."
docker exec -i $CONTAINER_NAME psql -U admin -d $DB_NAME < $BACKUP_FILE 2>&1 | tail -20

echo ""
echo "🔍 Перевірка після імпорту:"
echo ""
echo "Кількість properties:"
docker exec $CONTAINER_NAME psql -U admin -d $DB_NAME -c "SELECT COUNT(*) FROM properties;" 2>&1 | grep -v "Password:" | grep -E "[0-9]"

echo ""
echo "Розподіл по типах:"
docker exec $CONTAINER_NAME psql -U admin -d $DB_NAME -c "SELECT \"propertyType\", COUNT(*) FROM properties GROUP BY \"propertyType\";" 2>&1 | grep -v "Password:"

echo ""
echo "Кількість areas:"
docker exec $CONTAINER_NAME psql -U admin -d $DB_NAME -c "SELECT COUNT(*) FROM areas;" 2>&1 | grep -v "Password:" | grep -E "[0-9]"

echo ""
echo "Кількість developers:"
docker exec $CONTAINER_NAME psql -U admin -d $DB_NAME -c "SELECT COUNT(*) FROM developers;" 2>&1 | grep -v "Password:" | grep -E "[0-9]"

echo ""
echo "✅ Імпорт завершено!"
echo ""
echo "🔧 Оновлюю DATABASE_URL..."
cd /opt/admin-panel
sed -i "s|DATABASE_URL=.*|DATABASE_URL=postgresql://admin:REDACTED_DB_PASSWORD@for-you-admin-panel-postgres-prod:5432/$DB_NAME|" admin-panel-backend/.env

echo "🔄 Перезапускаю backend..."
docker restart for-you-admin-panel-backend-prod

echo ""
echo "✅ Готово! Backend підключено до бази з даними foryou"

