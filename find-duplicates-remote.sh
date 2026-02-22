#!/bin/bash

# Script to find duplicate properties in the database
# This script should be run on the production server

echo "🔍 Пошук дублікатів проектів в базі даних..."
echo ""

# SQL query to find duplicates
SQL_QUERY="
-- Дублікати за назвою
SELECT 
  name,
  COUNT(*) as count,
  STRING_AGG(id::text, ', ') as ids
FROM properties
GROUP BY name
HAVING COUNT(*) > 1
ORDER BY count DESC, name;

-- Загальна статистика
SELECT 
  'Загальна кількість проектів' as metric,
  COUNT(*) as value
FROM properties
UNION ALL
SELECT 
  'Унікальних назв' as metric,
  COUNT(DISTINCT name) as value
FROM properties
UNION ALL
SELECT 
  'Назв з дублікатами' as metric,
  COUNT(*) as value
FROM (
  SELECT name
  FROM properties
  GROUP BY name
  HAVING COUNT(*) > 1
) as duplicates;

-- Дублікати за типом
SELECT 
  'propertyType' as field,
  \"propertyType\" as value,
  COUNT(*) as total_count,
  COUNT(DISTINCT name) as unique_names,
  COUNT(*) - COUNT(DISTINCT name) as duplicates_count
FROM properties
GROUP BY \"propertyType\";
"

# Check if we're on the server or need to connect remotely
if [ -f "/root/admin_for_you/docker-compose.yml" ]; then
  # We're on the server
  echo "📊 Виконання запиту на сервері..."
  docker exec for-you-admin-panel-postgres-new psql -U admin -d admin_panel -c "$SQL_QUERY"
else
  # We need to connect remotely
  echo "🌐 Підключення до віддаленого сервера..."
  echo "Введіть пароль для root@135.181.201.185:"
  ssh root@135.181.201.185 "docker exec for-you-admin-panel-postgres-new psql -U admin -d admin_panel -c \"$SQL_QUERY\""
fi

echo ""
echo "✅ Готово!"
