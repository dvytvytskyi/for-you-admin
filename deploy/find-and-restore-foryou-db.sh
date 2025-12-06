#!/bin/bash

# Скрипт для пошуку та відновлення бази даних foryou
# Виконати на сервері: 88.99.38.25

set -e

echo "🔍 ПОШУК БАЗИ ДАНИХ FORYOU З >20000 PROPERTIES"
echo "=============================================="
echo ""

CONTAINER_NAME="for-you-admin-panel-postgres-prod"
TARGET_DB="foryou_admin_panel"

echo "📊 Перевірка всіх баз даних в контейнері $CONTAINER_NAME:"
echo ""

# Отримуємо список всіх баз
DATABASES=$(docker exec $CONTAINER_NAME psql -U admin -l -t 2>&1 | grep -v "Password:" | awk '{print $1}' | grep -vE "template|postgres|^$")

echo "Знайдені бази:"
for db in $DATABASES; do
    echo "  - $db"
done
echo ""

echo "🔍 Перевірка кількості properties в кожній базі:"
echo ""

FOUND_DB=""
MAX_COUNT=0

for db in $DATABASES; do
    # Перевіряємо чи є таблиця properties
    has_table=$(docker exec $CONTAINER_NAME psql -U admin -d "$db" -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'properties';" 2>&1 | grep -v "Password:" | tr -d ' ')
    
    if [ "$has_table" = "1" ]; then
        count=$(docker exec $CONTAINER_NAME psql -U admin -d "$db" -t -c "SELECT COUNT(*) FROM properties;" 2>&1 | grep -v "Password:" | tr -d ' ')
        echo "  База $db: $count properties"
        
        if [ "$count" -gt "$MAX_COUNT" ] 2>/dev/null; then
            MAX_COUNT=$count
            FOUND_DB=$db
        fi
        
        if [ "$count" -gt 10000 ] 2>/dev/null; then
            echo "  ✅ ЗНАЙДЕНО БАЗУ З >10000 PROPERTIES: $db ($count properties)"
        fi
    fi
done

echo ""

if [ -n "$FOUND_DB" ] && [ "$MAX_COUNT" -gt 10000 ]; then
    echo "🎯 ЗНАЙДЕНО БАЗУ: $FOUND_DB з $MAX_COUNT properties"
    echo ""
    echo "📋 Детальна інформація:"
    docker exec $CONTAINER_NAME psql -U admin -d "$FOUND_DB" -c "SELECT \"propertyType\", COUNT(*) FROM properties GROUP BY \"propertyType\";" 2>&1 | grep -v "Password:"
    echo ""
    echo "💡 Для копіювання даних в базу $TARGET_DB виконайте:"
    echo ""
    echo "docker exec $CONTAINER_NAME pg_dump -U admin -d $FOUND_DB > /tmp/foryou_backup_\$(date +%Y%m%d_%H%M%S).sql"
    echo "docker exec -i $CONTAINER_NAME psql -U admin -d $TARGET_DB < /tmp/foryou_backup_*.sql"
    echo ""
    echo "Або використайте команду:"
    echo "docker exec $CONTAINER_NAME pg_dump -U admin -d $FOUND_DB | docker exec -i $CONTAINER_NAME psql -U admin -d $TARGET_DB"
else
    echo "❌ Базу з >10000 properties не знайдено"
    echo ""
    echo "🔍 Перевірка Docker volumes на наявність старих даних:"
    docker volume ls | grep -E "admin|postgres|foryou"
    echo ""
    echo "💡 Можливі варіанти:"
    echo "  1. Дані були видалені"
    echo "  2. Дані знаходяться на іншому сервері"
    echo "  3. Потрібен backup файл для відновлення"
fi

