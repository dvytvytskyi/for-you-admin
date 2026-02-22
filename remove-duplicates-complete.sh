#!/bin/bash

# Complete script to remove duplicate properties by name on production server
# Updates ALL foreign key references before deletion

echo "🗑️  Повний скрипт видалення дублікатів проектів"
echo ""
echo "⚠️  УВАГА: Цей скрипт оновить всі посилання та видалить дублікати!"
echo ""

# Check if --confirm flag is present
if [[ "$1" != "--confirm" ]]; then
  echo "Для виконання запустіть скрипт з параметром --confirm:"
  echo "./remove-duplicates-complete.sh --confirm"
  echo ""
  exit 0
fi

echo "📊 Підключення до продакшн сервера..."
echo ""

ssh root@135.181.201.185 << 'ENDSSH'

echo "=== АНАЛІЗ ПЕРЕД ВИДАЛЕННЯМ ==="
echo ""

docker exec for-you-admin-panel-postgres-prod psql -U admin -d admin_panel -c "
SELECT COUNT(*) as total_duplicates_to_delete
FROM properties p1
WHERE EXISTS (
  SELECT 1
  FROM properties p2
  WHERE p2.name = p1.name
  AND p2.\"updatedAt\" > p1.\"updatedAt\"
);
"

echo ""
echo "=== СТВОРЕННЯ РЕЗЕРВНОЇ КОПІЇ ==="
echo "Створюємо backup перед видаленням..."

docker exec for-you-admin-panel-postgres-prod pg_dump -U admin admin_panel > /root/backup_before_duplicate_removal_$(date +%Y%m%d_%H%M%S).sql

if [ $? -eq 0 ]; then
  echo "✅ Backup успішно створено"
else
  echo "❌ Помилка створення backup! Зупиняємо виконання."
  exit 1
fi

echo ""
echo "=== ОНОВЛЕННЯ ПОСИЛАНЬ В УСІХ ТАБЛИЦЯХ ==="
echo ""

# 1. investor_chat_messages (property_id)
echo "1️⃣ Оновлення investor_chat_messages..."
docker exec for-you-admin-panel-postgres-prod psql -U admin -d admin_panel -c "
UPDATE investor_chat_messages icm
SET property_id = newest.new_id
FROM (
  SELECT DISTINCT ON (p1.name)
    p1.name,
    p2.id as old_id,
    p1.id as new_id
  FROM properties p1
  JOIN properties p2 ON p2.name = p1.name AND p2.\"updatedAt\" < p1.\"updatedAt\"
  ORDER BY p1.name, p1.\"updatedAt\" DESC
) AS newest
WHERE icm.property_id = newest.old_id;
"

# 2. favorites (propertyId)
echo "2️⃣ Оновлення favorites..."
docker exec for-you-admin-panel-postgres-prod psql -U admin -d admin_panel -c "
UPDATE favorites f
SET \"propertyId\" = newest.new_id
FROM (
  SELECT DISTINCT ON (p1.name)
    p1.name,
    p2.id as old_id,
    p1.id as new_id
  FROM properties p1
  JOIN properties p2 ON p2.name = p1.name AND p2.\"updatedAt\" < p1.\"updatedAt\"
  ORDER BY p1.name, p1.\"updatedAt\" DESC
) AS newest
WHERE f.\"propertyId\" = newest.old_id;
"

# 3. portfolio_items (propertyId)
echo "3️⃣ Оновлення portfolio_items..."
docker exec for-you-admin-panel-postgres-prod psql -U admin -d admin_panel -c "
UPDATE portfolio_items pi
SET \"propertyId\" = newest.new_id
FROM (
  SELECT DISTINCT ON (p1.name)
    p1.name,
    p2.id as old_id,
    p1.id as new_id
  FROM properties p1
  JOIN properties p2 ON p2.name = p1.name AND p2.\"updatedAt\" < p1.\"updatedAt\"
  ORDER BY p1.name, p1.\"updatedAt\" DESC
) AS newest
WHERE pi.\"propertyId\" = newest.old_id;
"

# 4. investments (propertyId)
echo "4️⃣ Оновлення investments..."
docker exec for-you-admin-panel-postgres-prod psql -U admin -d admin_panel -c "
UPDATE investments i
SET \"propertyId\" = newest.new_id
FROM (
  SELECT DISTINCT ON (p1.name)
    p1.name,
    p2.id as old_id,
    p1.id as new_id
  FROM properties p1
  JOIN properties p2 ON p2.name = p1.name AND p2.\"updatedAt\" < p1.\"updatedAt\"
  ORDER BY p1.name, p1.\"updatedAt\" DESC
) AS newest
WHERE i.\"propertyId\" = newest.old_id;
"

# 5. collection_properties (propertyId)
echo "5️⃣ Оновлення collection_properties..."
docker exec for-you-admin-panel-postgres-prod psql -U admin -d admin_panel -c "
UPDATE collection_properties cp
SET \"propertyId\" = newest.new_id
FROM (
  SELECT DISTINCT ON (p1.name)
    p1.name,
    p2.id as old_id,
    p1.id as new_id
  FROM properties p1
  JOIN properties p2 ON p2.name = p1.name AND p2.\"updatedAt\" < p1.\"updatedAt\"
  ORDER BY p1.name, p1.\"updatedAt\" DESC
) AS newest
WHERE cp.\"propertyId\" = newest.old_id;
"

# 6. property_units (propertyId)
echo "6️⃣ Оновлення property_units..."
docker exec for-you-admin-panel-postgres-prod psql -U admin -d admin_panel -c "
UPDATE property_units pu
SET \"propertyId\" = newest.new_id
FROM (
  SELECT DISTINCT ON (p1.name)
    p1.name,
    p2.id as old_id,
    p1.id as new_id
  FROM properties p1
  JOIN properties p2 ON p2.name = p1.name AND p2.\"updatedAt\" < p1.\"updatedAt\"
  ORDER BY p1.name, p1.\"updatedAt\" DESC
) AS newest
WHERE pu.\"propertyId\" = newest.old_id;
"

# 7. properties_facilities_facilities (propertiesId)
echo "7️⃣ Оновлення properties_facilities_facilities..."
docker exec for-you-admin-panel-postgres-prod psql -U admin -d admin_panel -c "
UPDATE properties_facilities_facilities pff
SET \"propertiesId\" = newest.new_id
FROM (
  SELECT DISTINCT ON (p1.name)
    p1.name,
    p2.id as old_id,
    p1.id as new_id
  FROM properties p1
  JOIN properties p2 ON p2.name = p1.name AND p2.\"updatedAt\" < p1.\"updatedAt\"
  ORDER BY p1.name, p1.\"updatedAt\" DESC
) AS newest
WHERE pff.\"propertiesId\" = newest.old_id;
"

echo ""
echo "✅ Всі посилання оновлено!"
echo ""

echo "=== ВИДАЛЕННЯ ДУБЛІКАТІВ ==="
echo "Видаляємо старіші дублікати..."

docker exec for-you-admin-panel-postgres-prod psql -U admin -d admin_panel -c "
DELETE FROM properties
WHERE id IN (
  SELECT p1.id
  FROM properties p1
  WHERE EXISTS (
    SELECT 1
    FROM properties p2
    WHERE p2.name = p1.name
    AND p2.\"updatedAt\" > p1.\"updatedAt\"
  )
);
"

echo ""
echo "=== ПЕРЕВІРКА РЕЗУЛЬТАТУ ==="
docker exec for-you-admin-panel-postgres-prod psql -U admin -d admin_panel -c "
SELECT 
  COUNT(*) as total_properties,
  COUNT(DISTINCT name) as unique_names,
  COUNT(*) - COUNT(DISTINCT name) as remaining_duplicates
FROM properties;
"

echo ""
echo "=== ПЕРЕВІРКА ЗАЛИШКОВИХ ДУБЛІКАТІВ ==="
docker exec for-you-admin-panel-postgres-prod psql -U admin -d admin_panel -c "
SELECT name, COUNT(*) as count
FROM properties
GROUP BY name
HAVING COUNT(*) > 1
ORDER BY count DESC
LIMIT 10;
"

echo ""
echo "✅ Готово!"
echo ""
echo "Backup збережено на сервері в /root/"

ENDSSH

echo ""
echo "✅ Скрипт завершено!"
