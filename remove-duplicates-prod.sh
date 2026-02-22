#!/bin/bash

# Script to remove duplicate properties by name on production server
# Keeps only the most recently updated record for each project name

echo "🗑️  Скрипт видалення дублікатів проектів по назві"
echo ""
echo "⚠️  УВАГА: Цей скрипт видалить всі дублікати, залишивши тільки найновіші записи!"
echo ""

# Check if --confirm flag is present
if [[ "$1" != "--confirm" ]]; then
  echo "Для виконання запустіть скрипт з параметром --confirm:"
  echo "./remove-duplicates-prod.sh --confirm"
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
echo "=== ПРИКЛАДИ ЗАПИСІВ, ЯКІ БУДУТЬ ВИДАЛЕНІ (перші 5) ==="
docker exec for-you-admin-panel-postgres-prod psql -U admin -d admin_panel -c "
SELECT 
  p1.name,
  p1.id,
  p1.\"createdAt\",
  p1.\"updatedAt\"
FROM properties p1
WHERE EXISTS (
  SELECT 1
  FROM properties p2
  WHERE p2.name = p1.name
  AND p2.\"updatedAt\" > p1.\"updatedAt\"
)
ORDER BY p1.name
LIMIT 5;
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
