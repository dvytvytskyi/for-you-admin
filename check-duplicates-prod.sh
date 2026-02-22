#!/bin/bash

# Script to check for duplicate properties in the production database

echo "🔍 Підключення до продакшн сервера для пошуку дублікатів..."
echo ""

# SSH command with password (you'll need to enter password manually)
ssh root@135.181.201.185 << 'ENDSSH'

echo "📊 Виконання SQL запитів..."
echo ""

# Query 1: General statistics
echo "=== ЗАГАЛЬНА СТАТИСТИКА ==="
docker exec for-you-admin-panel-postgres-prod psql -U admin -d admin_panel -c "
SELECT 
  'Загальна кількість проектів' as metric, 
  COUNT(*)::text as value 
FROM properties 
UNION ALL 
SELECT 
  'Унікальних назв', 
  COUNT(DISTINCT name)::text 
FROM properties 
UNION ALL 
SELECT 
  'Назв з дублікатами', 
  COUNT(*)::text 
FROM ( 
  SELECT name 
  FROM properties 
  GROUP BY name 
  HAVING COUNT(*) > 1 
) as duplicates 
UNION ALL 
SELECT 
  'Загальна кількість дублікатів (зайвих записів)', 
  (SUM(cnt) - COUNT(*))::text 
FROM ( 
  SELECT name, COUNT(*) as cnt 
  FROM properties 
  GROUP BY name 
  HAVING COUNT(*) > 1 
) as dup_counts;
"

echo ""
echo "=== ТОП 30 НАЗВ З ДУБЛІКАТАМИ ==="
docker exec for-you-admin-panel-postgres-prod psql -U admin -d admin_panel -c "
SELECT 
  name, 
  COUNT(*) as count 
FROM properties 
GROUP BY name 
HAVING COUNT(*) > 1 
ORDER BY COUNT(*) DESC, name 
LIMIT 30;
"

echo ""
echo "=== СТАТИСТИКА ЗА ТИПОМ ==="
docker exec for-you-admin-panel-postgres-prod psql -U admin -d admin_panel -c "
SELECT 
  \"propertyType\" as type, 
  COUNT(*) as total, 
  COUNT(DISTINCT name) as unique_names, 
  (COUNT(*) - COUNT(DISTINCT name)) as duplicates 
FROM properties 
GROUP BY \"propertyType\";
"

echo ""
echo "✅ Готово!"

ENDSSH
