#!/bin/bash

# Preview what will be deleted before actually removing duplicates

echo "👀 ПОПЕРЕДНІЙ ПЕРЕГЛЯД: Що буде видалено"
echo ""

ssh root@135.181.201.185 << 'ENDSSH'

echo "=== СКІЛЬКИ ЗАПИСІВ БУДЕ ВИДАЛЕНО ==="
docker exec for-you-admin-panel-postgres-prod psql -U admin -d admin_panel -c "
SELECT COUNT(*) as records_to_delete
FROM properties p1
WHERE EXISTS (
  SELECT 1
  FROM properties p2
  WHERE p2.name = p1.name
  AND p2.\"updatedAt\" > p1.\"updatedAt\"
);
"

echo ""
echo "=== СКІЛЬКИ ЗАЛИШИТЬСЯ ==="
docker exec for-you-admin-panel-postgres-prod psql -U admin -d admin_panel -c "
SELECT 
  COUNT(*) as current_total,
  COUNT(*) - (
    SELECT COUNT(*)
    FROM properties p1
    WHERE EXISTS (
      SELECT 1
      FROM properties p2
      WHERE p2.name = p1.name
      AND p2.\"updatedAt\" > p1.\"updatedAt\"
    )
  ) as will_remain,
  COUNT(DISTINCT name) as unique_names
FROM properties;
"

echo ""
echo "=== ПРИКЛАДИ: ЩО БУДЕ ВИДАЛЕНО (перші 10) ==="
docker exec for-you-admin-panel-postgres-prod psql -U admin -d admin_panel -c "
SELECT 
  p1.name as \"Назва проекту\",
  p1.\"priceFrom\" as \"Ціна\",
  p1.\"createdAt\" as \"Створено\",
  p1.\"updatedAt\" as \"Оновлено\",
  'БУДЕ ВИДАЛЕНО' as \"Статус\"
FROM properties p1
WHERE EXISTS (
  SELECT 1
  FROM properties p2
  WHERE p2.name = p1.name
  AND p2.\"updatedAt\" > p1.\"updatedAt\"
)
ORDER BY p1.name
LIMIT 10;
"

echo ""
echo "=== ПРИКЛАДИ: ЩО ЗАЛИШИТЬСЯ (перші 10 з дублікатів) ==="
docker exec for-you-admin-panel-postgres-prod psql -U admin -d admin_panel -c "
WITH ranked_properties AS (
  SELECT 
    name,
    \"priceFrom\",
    \"createdAt\",
    \"updatedAt\",
    ROW_NUMBER() OVER (PARTITION BY name ORDER BY \"updatedAt\" DESC) as rn
  FROM properties
)
SELECT 
  name as \"Назва проекту\",
  \"priceFrom\" as \"Ціна\",
  \"createdAt\" as \"Створено\",
  \"updatedAt\" as \"Оновлено\",
  'ЗАЛИШИТЬСЯ' as \"Статус\"
FROM ranked_properties
WHERE rn = 1
AND name IN (
  SELECT name
  FROM properties
  GROUP BY name
  HAVING COUNT(*) > 1
)
LIMIT 10;
"

echo ""
echo "=== ПЕРЕВІРКА: ЧИ Є ЗАПИСИ З ОДНАКОВОЮ ДАТОЮ ОНОВЛЕННЯ ==="
docker exec for-you-admin-panel-postgres-prod psql -U admin -d admin_panel -c "
SELECT 
  name,
  COUNT(*) as total_records,
  COUNT(DISTINCT \"updatedAt\") as distinct_update_dates
FROM properties
WHERE name IN (
  SELECT name
  FROM properties
  GROUP BY name
  HAVING COUNT(*) > 1
)
GROUP BY name
HAVING COUNT(*) > COUNT(DISTINCT \"updatedAt\")
LIMIT 10;
"

echo ""
echo "✅ Перегляд завершено"

ENDSSH
