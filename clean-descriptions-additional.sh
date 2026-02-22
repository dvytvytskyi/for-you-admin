#!/bin/bash

# Additional cleanup to remove text phrases without hashtags

echo "🧹 Додаткове очищення описів (текстові фрази без решіток)"
echo ""

ssh root@135.181.201.185 << 'ENDSSH'

echo "=== ВИДАЛЕННЯ ТЕКСТОВИХ ФРАЗ БЕЗ РЕШІТОК ==="
echo ""

docker exec for-you-admin-panel-postgres-prod psql -U admin -d admin_panel -c "
UPDATE properties
SET description = 
  TRIM(
    REPLACE(
      REPLACE(
        REPLACE(
          REPLACE(
            REPLACE(description, 'Project general facts', ''),
            'Finishing and materials', ''
          ),
          'Kitchen and appliances', ''
        ),
        'Furnishing', ''
      ),
      'Location description and benefits', ''
    )
  )
WHERE description LIKE '%Project general facts%' 
   OR description LIKE '%Finishing and materials%'
   OR description LIKE '%Kitchen and appliances%'
   OR description LIKE '%Furnishing%'
   OR description LIKE '%Location description and benefits%';
"

echo ""
echo "=== ОЧИЩЕННЯ ЗАЙВИХ ПРОБІЛІВ ТА ПОРОЖНІХ РЯДКІВ ==="

docker exec for-you-admin-panel-postgres-prod psql -U admin -d admin_panel -c "
UPDATE properties
SET description = REGEXP_REPLACE(
  REGEXP_REPLACE(description, E'\\n\\n+', E'\\n\\n', 'g'),
  E'^\\s+|\\s+\$', '', 'g'
)
WHERE description ~ E'\\n\\n\\n|^\\s+|\\s+\$';
"

echo ""
echo "=== ПЕРЕВІРКА РЕЗУЛЬТАТУ ==="
docker exec for-you-admin-panel-postgres-prod psql -U admin -d admin_panel -c "
SELECT 
  COUNT(CASE WHEN description LIKE '%Project general facts%' THEN 1 END) as with_general_facts,
  COUNT(CASE WHEN description LIKE '%Finishing and materials%' THEN 1 END) as with_finishing,
  COUNT(CASE WHEN description LIKE '%Kitchen and appliances%' THEN 1 END) as with_kitchen,
  COUNT(CASE WHEN description LIKE '%Furnishing%' THEN 1 END) as with_furnishing,
  COUNT(CASE WHEN description LIKE '%Location description and benefits%' THEN 1 END) as with_location
FROM properties;
"

echo ""
echo "=== ПРИКЛАД ОЧИЩЕНОГО ОПИСУ ==="
docker exec for-you-admin-panel-postgres-prod psql -U admin -d admin_panel -c "
SELECT 
  name,
  LEFT(description, 300) as description_preview
FROM properties
WHERE name = 'Serenia District West Residence'
LIMIT 1;
"

echo ""
echo "✅ Готово!"

ENDSSH

echo ""
echo "✅ Додаткове очищення завершено!"
