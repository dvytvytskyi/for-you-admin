#!/bin/bash

# Скрипт для перевірки БД на продакшн
SERVER_IP="135.181.201.185"
SERVER_USER="root"
SERVER_PASSWORD="FNrtVkfCRwgW"

if ! command -v sshpass &> /dev/null; then
    if [[ "$OSTYPE" == "darwin"* ]]; then
        brew install hudochenkov/sshpass/sshpass 2>/dev/null || true
    fi
fi

sshpass -p "${SERVER_PASSWORD}" ssh -o StrictHostKeyChecking=no ${SERVER_USER}@${SERVER_IP} << 'ENDSSH'
echo "🔍 Перевірка БД на продакшн..."
echo ""

# Підключення до БД та перевірка кількості properties
docker exec for-you-admin-panel-postgres-prod psql -U admin -d admin_panel -c "
SELECT 
    \"propertyType\",
    COUNT(*) as count
FROM properties
GROUP BY \"propertyType\";
" 2>&1

echo ""
echo "📊 Детальніше:"
docker exec for-you-admin-panel-postgres-prod psql -U admin -d admin_panel -c "
SELECT 
    \"propertyType\",
    COUNT(*) as total,
    COUNT(CASE WHEN \"createdAt\" > NOW() - INTERVAL '7 days' THEN 1 END) as last_7_days,
    COUNT(CASE WHEN \"createdAt\" > NOW() - INTERVAL '1 day' THEN 1 END) as last_24_hours,
    MIN(\"createdAt\") as oldest,
    MAX(\"createdAt\") as newest
FROM properties
GROUP BY \"propertyType\";
" 2>&1

echo ""
echo "📅 Приклади останніх off-plan properties:"
docker exec for-you-admin-panel-postgres-prod psql -U admin -d admin_panel -c "
SELECT 
    name,
    \"createdAt\"
FROM properties
WHERE \"propertyType\" = 'off-plan'
ORDER BY \"createdAt\" DESC
LIMIT 10;
" 2>&1

ENDSSH

