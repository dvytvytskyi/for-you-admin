#!/bin/bash

# Скрипт для backup бази даних foryou зі старого сервера
# Виконати на старому сервері: 135.181.201.185

set -e

echo "🔍 Пошук бази даних foryou..."
echo ""

# Перевірка контейнерів
CONTAINER_NAME=$(docker ps --format "{{.Names}}" | grep -E "admin-panel.*postgres|for-you.*postgres" | head -1)

if [ -z "$CONTAINER_NAME" ]; then
    echo "❌ Контейнер PostgreSQL не знайдено"
    echo "Доступні контейнери:"
    docker ps --format "{{.Names}}"
    exit 1
fi

echo "✅ Знайдено контейнер: $CONTAINER_NAME"
echo ""

# Перевірка баз даних
echo "🔍 Перевірка баз даних:"
docker exec $CONTAINER_NAME psql -U admin -l 2>&1 | grep -v "Password:" | head -10

echo ""
echo "🔍 Перевірка кількості properties в різних базах:"
echo ""

# Перевірка admin_panel
echo "1. База admin_panel:"
docker exec $CONTAINER_NAME psql -U admin -d admin_panel -c "SELECT COUNT(*) as total FROM properties;" 2>&1 | grep -v "Password:" | grep -E "[0-9]"
docker exec $CONTAINER_NAME psql -U admin -d admin_panel -c "SELECT \"propertyType\", COUNT(*) FROM properties GROUP BY \"propertyType\";" 2>&1 | grep -v "Password:"

echo ""
echo "2. Перевірка інших баз (якщо є):"
for db in $(docker exec $CONTAINER_NAME psql -U admin -l -t 2>&1 | grep -v "Password:" | awk '{print $1}' | grep -v "template\|postgres"); do
    if [ "$db" != "admin_panel" ]; then
        echo "   База: $db"
        docker exec $CONTAINER_NAME psql -U admin -d "$db" -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'properties';" 2>&1 | grep -v "Password:" | grep -E "[0-9]" || echo "   Немає таблиці properties"
    fi
done

echo ""
echo "💡 Якщо знайдено базу з >20000 properties, виконайте backup:"
echo ""
echo "docker exec $CONTAINER_NAME pg_dump -U admin -d НАЗВА_БАЗИ > /tmp/foryou_backup_$(date +%Y%m%d_%H%M%S).sql"
echo ""
echo "Потім скопіюйте файл на новий сервер:"
echo "scp /tmp/foryou_backup_*.sql root@88.99.38.25:/opt/admin-panel/"

