#!/bin/bash

# Script to clean up property descriptions
# Removes specific phrases and asterisks

echo "🧹 Скрипт очищення описів проектів"
echo ""
echo "Буде видалено:"
echo "  - ##### Project general facts"
echo "  - ##### Finishing and materials"
echo "  - ##### Kitchen and appliances"
echo "  - ##### Furnishing"
echo "  - ##### Location description and benefits"
echo "  - Всі зірочки (*)"
echo ""

# Check if --confirm flag is present
if [[ "$1" != "--confirm" ]]; then
  echo "Для виконання запустіть скрипт з параметром --confirm:"
  echo "./clean-descriptions.sh --confirm"
  echo ""
  exit 0
fi

echo "📊 Підключення до продакшн сервера..."
echo ""

ssh root@135.181.201.185 << 'ENDSSH'

echo "=== АНАЛІЗ ПЕРЕД ОЧИЩЕННЯМ ==="
echo ""

# Count how many properties have these phrases
docker exec for-you-admin-panel-postgres-prod psql -U admin -d admin_panel -c "
SELECT 
  COUNT(*) as total_properties,
  COUNT(CASE WHEN description LIKE '%##### Project general facts%' THEN 1 END) as with_general_facts,
  COUNT(CASE WHEN description LIKE '%##### Finishing and materials%' THEN 1 END) as with_finishing,
  COUNT(CASE WHEN description LIKE '%##### Kitchen and appliances%' THEN 1 END) as with_kitchen,
  COUNT(CASE WHEN description LIKE '%##### Furnishing%' THEN 1 END) as with_furnishing,
  COUNT(CASE WHEN description LIKE '%##### Location description and benefits%' THEN 1 END) as with_location,
  COUNT(CASE WHEN description LIKE '%*%' THEN 1 END) as with_asterisks
FROM properties;
"

echo ""
echo "=== СТВОРЕННЯ РЕЗЕРВНОЇ КОПІЇ ==="
echo "Створюємо backup перед очищенням..."

docker exec for-you-admin-panel-postgres-prod pg_dump -U admin admin_panel > /root/backup_before_description_cleanup_$(date +%Y%m%d_%H%M%S).sql

if [ $? -eq 0 ]; then
  echo "✅ Backup успішно створено"
else
  echo "❌ Помилка створення backup! Зупиняємо виконання."
  exit 1
fi

echo ""
echo "=== ОЧИЩЕННЯ ОПИСІВ (description) ==="
echo "Видаляємо фрази та зірочки з англійських описів..."

docker exec for-you-admin-panel-postgres-prod psql -U admin -d admin_panel -c "
UPDATE properties
SET description = 
  REPLACE(
    REPLACE(
      REPLACE(
        REPLACE(
          REPLACE(
            REPLACE(description, '##### Project general facts', ''),
            '##### Finishing and materials', ''
          ),
          '##### Kitchen and appliances', ''
        ),
        '##### Furnishing', ''
      ),
      '##### Location description and benefits', ''
    ),
    '*', ''
  )
WHERE description LIKE '%#####%' OR description LIKE '%*%';
"

echo ""
echo "=== ОЧИЩЕННЯ РОСІЙСЬКИХ ОПИСІВ (descriptionRu) ==="
echo "Видаляємо зірочки з російських описів..."

docker exec for-you-admin-panel-postgres-prod psql -U admin -d admin_panel -c "
UPDATE properties
SET \"descriptionRu\" = REPLACE(\"descriptionRu\", '*', '')
WHERE \"descriptionRu\" IS NOT NULL AND \"descriptionRu\" LIKE '%*%';
"

echo ""
echo "=== ОЧИЩЕННЯ ПЛАНІВ ОПЛАТИ (paymentPlan) ==="
echo "Видаляємо зірочки з планів оплати..."

docker exec for-you-admin-panel-postgres-prod psql -U admin -d admin_panel -c "
UPDATE properties
SET \"paymentPlan\" = REPLACE(\"paymentPlan\", '*', '')
WHERE \"paymentPlan\" IS NOT NULL AND \"paymentPlan\" LIKE '%*%';
"

echo ""
echo "=== ПЕРЕВІРКА РЕЗУЛЬТАТУ ==="
docker exec for-you-admin-panel-postgres-prod psql -U admin -d admin_panel -c "
SELECT 
  COUNT(*) as total_properties,
  COUNT(CASE WHEN description LIKE '%##### Project general facts%' THEN 1 END) as with_general_facts,
  COUNT(CASE WHEN description LIKE '%##### Finishing and materials%' THEN 1 END) as with_finishing,
  COUNT(CASE WHEN description LIKE '%##### Kitchen and appliances%' THEN 1 END) as with_kitchen,
  COUNT(CASE WHEN description LIKE '%##### Furnishing%' THEN 1 END) as with_furnishing,
  COUNT(CASE WHEN description LIKE '%##### Location description and benefits%' THEN 1 END) as with_location,
  COUNT(CASE WHEN description LIKE '%*%' THEN 1 END) as with_asterisks_desc,
  COUNT(CASE WHEN \"descriptionRu\" LIKE '%*%' THEN 1 END) as with_asterisks_desc_ru,
  COUNT(CASE WHEN \"paymentPlan\" LIKE '%*%' THEN 1 END) as with_asterisks_payment
FROM properties;
"

echo ""
echo "=== ПРИКЛАД ОЧИЩЕНОГО ОПИСУ (перший проект) ==="
docker exec for-you-admin-panel-postgres-prod psql -U admin -d admin_panel -c "
SELECT 
  name,
  LEFT(description, 200) as description_preview
FROM properties
LIMIT 1;
"

echo ""
echo "✅ Готово!"
echo ""
echo "Backup збережено на сервері в /root/"

ENDSSH

echo ""
echo "✅ Скрипт завершено!"
