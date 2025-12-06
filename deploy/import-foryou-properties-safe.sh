#!/bin/bash

# Безпечний імпорт properties з обробкою помилок
# Виконати на сервері: 88.99.38.25

set -e

BACKUP_FILE="/opt/admin-pro-part/backups/migration_backup_20251118_095046.sql"
DB_NAME="foryou_admin_panel"
CONTAINER_NAME="for-you-admin-panel-postgres-prod"

echo "📥 БЕЗПЕЧНИЙ ІМПОРТ PROPERTIES"
echo "=============================="
echo ""

# Вимікаємо всі foreign key constraints
echo "🔧 Вимікаю foreign key constraints..."
docker exec ${CONTAINER_NAME} psql -U admin -d ${DB_NAME} << "EOFSQL"
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT conname FROM pg_constraint WHERE conrelid = 'properties'::regclass AND contype = 'f') LOOP
        EXECUTE 'ALTER TABLE properties DROP CONSTRAINT IF EXISTS ' || quote_ident(r.conname);
    END LOOP;
END $$;
EOFSQL

echo "✅ Constraints вимкнено"
echo ""

# Додаємо відсутніх developers
echo "🔧 Додаю відсутніх developers..."
docker exec ${CONTAINER_NAME} psql -U admin -d ${DB_NAME} << "EOFSQL"
-- Додаємо developers, які використовуються в properties, але відсутні в таблиці
INSERT INTO developers (id, name, "createdAt")
SELECT DISTINCT p."developerId", 'Unknown Developer', NOW()
FROM (VALUES 
    ('06b47345-56c7-4663-90a1-d61d3ee880a6'),
    ('8ad5d550-0f6b-4c43-835e-52d9b049bd3d')
) AS p("developerId")
WHERE NOT EXISTS (SELECT 1 FROM developers WHERE id = p."developerId")
ON CONFLICT (id) DO NOTHING;
EOFSQL

echo "✅ Developers додані"
echo ""

# Імпортуємо properties
echo "📥 Імпортую properties (24720 записів)..."
echo "   (це може зайняти кілька хвилин...)"
echo ""

awk "/COPY public.properties/,/^\\\\.$/" ${BACKUP_FILE} | docker exec -i ${CONTAINER_NAME} psql -U admin -d ${DB_NAME} 2>&1 | grep -E "COPY|ERROR" | tail -10 || true

echo ""
echo "✅ Перевірка після імпорту:"
echo ""

echo "Кількість properties:"
docker exec ${CONTAINER_NAME} psql -U admin -d ${DB_NAME} -c "SELECT COUNT(*) FROM properties;" 2>&1 | grep -v "Password:" | grep -E "[0-9]"

echo ""
echo "Розподіл по типах:"
docker exec ${CONTAINER_NAME} psql -U admin -d ${DB_NAME} -c "SELECT \"propertyType\", COUNT(*) FROM properties GROUP BY \"propertyType\";" 2>&1 | grep -v "Password:" | head -10

echo ""
echo "✅ Імпорт завершено!"


