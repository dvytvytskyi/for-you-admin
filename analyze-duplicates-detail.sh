#!/bin/bash

# Script to analyze duplicate properties in detail

echo "🔍 Детальний аналіз дублікатів..."
echo ""

ssh root@135.181.201.185 << 'ENDSSH'

echo "=== АНАЛІЗ ДУБЛІКАТІВ З 3 ЗАПИСАМИ ==="
docker exec for-you-admin-panel-postgres-prod psql -U admin -d admin_panel -c "
SELECT 
  p.name,
  p.id,
  p.\"propertyType\",
  p.\"priceFrom\",
  p.\"createdAt\",
  p.\"updatedAt\",
  length(p.photos) as photos_length
FROM properties p
WHERE p.name IN (
  SELECT name 
  FROM properties 
  GROUP BY name 
  HAVING COUNT(*) > 2
)
ORDER BY p.name, p.\"createdAt\";
"

echo ""
echo "=== ПРИКЛАД ДЕТАЛЬНОГО ПОРІВНЯННЯ (перші 5 дублікатів) ==="
docker exec for-you-admin-panel-postgres-prod psql -U admin -d admin_panel -c "
WITH duplicates AS (
  SELECT name
  FROM properties
  GROUP BY name
  HAVING COUNT(*) = 2
  LIMIT 5
)
SELECT 
  p.name,
  p.id,
  p.\"priceFrom\",
  p.\"bedroomsFrom\",
  p.\"bedroomsTo\",
  p.\"sizeFrom\",
  p.\"sizeTo\",
  p.\"createdAt\",
  p.\"updatedAt\",
  length(p.photos) as photos_length,
  length(p.description) as description_length
FROM properties p
WHERE p.name IN (SELECT name FROM duplicates)
ORDER BY p.name, p.\"createdAt\";
"

echo ""
echo "=== ДУБЛІКАТИ ЗА ДАТОЮ СТВОРЕННЯ ==="
docker exec for-you-admin-panel-postgres-prod psql -U admin -d admin_panel -c "
SELECT 
  DATE(\"createdAt\") as created_date,
  COUNT(*) as duplicates_created
FROM properties
WHERE name IN (
  SELECT name 
  FROM properties 
  GROUP BY name 
  HAVING COUNT(*) > 1
)
GROUP BY DATE(\"createdAt\")
ORDER BY created_date DESC
LIMIT 20;
"

echo ""
echo "=== ПЕРЕВІРКА: ЧИ Є ВІДМІННОСТІ В ДАНИХ МІЖ ДУБЛІКАТАМИ ==="
docker exec for-you-admin-panel-postgres-prod psql -U admin -d admin_panel -c "
WITH dup_groups AS (
  SELECT 
    name,
    COUNT(*) as cnt,
    COUNT(DISTINCT \"priceFrom\") as distinct_prices,
    COUNT(DISTINCT \"developerId\") as distinct_developers,
    COUNT(DISTINCT \"areaId\") as distinct_areas,
    COUNT(DISTINCT photos) as distinct_photos
  FROM properties
  WHERE name IN (
    SELECT name 
    FROM properties 
    GROUP BY name 
    HAVING COUNT(*) > 1
  )
  GROUP BY name
)
SELECT 
  'Дублікати з різними цінами' as metric,
  COUNT(*) as count
FROM dup_groups
WHERE distinct_prices > 1
UNION ALL
SELECT 
  'Дублікати з різними девелоперами',
  COUNT(*)
FROM dup_groups
WHERE distinct_developers > 1
UNION ALL
SELECT 
  'Дублікати з різними районами',
  COUNT(*)
FROM dup_groups
WHERE distinct_areas > 1
UNION ALL
SELECT 
  'Дублікати з різними фото',
  COUNT(*)
FROM dup_groups
WHERE distinct_photos > 1;
"

echo ""
echo "✅ Аналіз завершено!"

ENDSSH

