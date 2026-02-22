#!/bin/bash

# Script to remove duplicate properties by name on production server
# This version handles foreign key constraints by updating references first

echo "🗑️  Скрипт видалення дублікатів проектів по назві (з оновленням посилань)"
echo ""
echo "⚠️  УВАГА: Цей скрипт видалить всі дублікати, залишивши тільки найновіші записи!"
echo ""

# Check if --confirm flag is present
if [[ "$1" != "--confirm" ]]; then
  echo "Для виконання запустіть скрипт з параметром --confirm:"
  echo "./remove-duplicates-prod-safe.sh --confirm"
  echo ""
  exit 0
fi

echo "📊 Підключення до продакшн сервера..."
echo ""

ssh root@135.181.201.185 << 'ENDSSH'

echo "=== АНАЛІЗ ПЕРЕД ВИДАЛЕННЯМ ==="
echo ""

# Count how many records will be deleted
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

# Create backup
docker exec for-you-admin-panel-postgres-prod pg_dump -U admin admin_panel > /root/backup_before_duplicate_removal_$(date +%Y%m%d_%H%M%S).sql

if [ $? -eq 0 ]; then
  echo "✅ Backup успішно створено"
else
  echo "❌ Помилка створення backup! Зупиняємо виконання."
  exit 1
fi

echo ""
echo "=== ОНОВЛЕННЯ ПОСИЛАНЬ В INVESTOR_CHAT_MESSAGES ==="
echo "Оновлюємо посилання на проекти в чаті інвесторів..."

# Update foreign key references in investor_chat_messages
docker exec for-you-admin-panel-postgres-prod psql -U admin -d admin_panel -c "
-- Update investor_chat_messages to point to the newest version of each property
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

echo ""
echo "=== ОНОВЛЕННЯ ПОСИЛАНЬ В FAVORITES (якщо є) ==="

# Update favorites table if it exists
docker exec for-you-admin-panel-postgres-prod psql -U admin -d admin_panel -c "
DO \$\$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'favorites') THEN
    UPDATE favorites f
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
    WHERE f.property_id = newest.old_id;
  END IF;
END \$\$;
"

echo ""
echo "=== ВИДАЛЕННЯ ДУБЛІКАТІВ ==="
echo "Видаляємо старіші дублікати..."

# Delete duplicates
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
