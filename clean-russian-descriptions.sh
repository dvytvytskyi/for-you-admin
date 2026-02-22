#!/bin/bash

# Clean Russian descriptions - simplified version

echo "🧹 Очищення російських описів (спрощена версія)"
echo ""

ssh root@135.181.201.185 << 'ENDSSH'

echo "=== ОЧИЩЕННЯ РОСІЙСЬКИХ ОПИСІВ (крок за кроком) ==="
echo ""

# Step 1: Remove hashtag phrases
echo "1️⃣ Видалення фраз з решітками..."
docker exec for-you-admin-panel-postgres-prod psql -U admin -d admin_panel -c "
UPDATE properties
SET \"descriptionRu\" = REPLACE(\"descriptionRu\", '##### Отделка и материалы', '')
WHERE \"descriptionRu\" LIKE '%##### Отделка и материалы%';
"

docker exec for-you-admin-panel-postgres-prod psql -U admin -d admin_panel -c "
UPDATE properties
SET \"descriptionRu\" = REPLACE(\"descriptionRu\", '##### Кухня и бытовая техника', '')
WHERE \"descriptionRu\" LIKE '%##### Кухня и бытовая техника%';
"

docker exec for-you-admin-panel-postgres-prod psql -U admin -d admin_panel -c "
UPDATE properties
SET \"descriptionRu\" = REPLACE(\"descriptionRu\", '##### Меблировка', '')
WHERE \"descriptionRu\" LIKE '%##### Меблировка%';
"

docker exec for-you-admin-panel-postgres-prod psql -U admin -d admin_panel -c "
UPDATE properties
SET \"descriptionRu\" = REPLACE(\"descriptionRu\", '##### Описание локации и преимущества', '')
WHERE \"descriptionRu\" LIKE '%##### Описание локации и преимущества%';
"

docker exec for-you-admin-panel-postgres-prod psql -U admin -d admin_panel -c "
UPDATE properties
SET \"descriptionRu\" = REPLACE(\"descriptionRu\", '##### Общие факты о проекте', '')
WHERE \"descriptionRu\" LIKE '%##### Общие факты о проекте%';
"

# Step 2: Remove text phrases without hashtags
echo "2️⃣ Видалення текстових фраз без решіток..."
docker exec for-you-admin-panel-postgres-prod psql -U admin -d admin_panel -c "
UPDATE properties
SET \"descriptionRu\" = REPLACE(\"descriptionRu\", 'Отделка и материалы', '')
WHERE \"descriptionRu\" LIKE '%Отделка и материалы%';
"

docker exec for-you-admin-panel-postgres-prod psql -U admin -d admin_panel -c "
UPDATE properties
SET \"descriptionRu\" = REPLACE(\"descriptionRu\", 'Кухня и бытовая техника', '')
WHERE \"descriptionRu\" LIKE '%Кухня и бытовая техника%';
"

docker exec for-you-admin-panel-postgres-prod psql -U admin -d admin_panel -c "
UPDATE properties
SET \"descriptionRu\" = REPLACE(\"descriptionRu\", 'Меблировка', '')
WHERE \"descriptionRu\" LIKE '%Меблировка%';
"

docker exec for-you-admin-panel-postgres-prod psql -U admin -d admin_panel -c "
UPDATE properties
SET \"descriptionRu\" = REPLACE(\"descriptionRu\", 'Описание локации и преимущества', '')
WHERE \"descriptionRu\" LIKE '%Описание локации и преимущества%';
"

docker exec for-you-admin-panel-postgres-prod psql -U admin -d admin_panel -c "
UPDATE properties
SET \"descriptionRu\" = REPLACE(\"descriptionRu\", 'Общие факты о проекте', '')
WHERE \"descriptionRu\" LIKE '%Общие факты о проекте%';
"

# Step 3: Clean up extra whitespace
echo "3️⃣ Очищення зайвих пробілів..."
docker exec for-you-admin-panel-postgres-prod psql -U admin -d admin_panel -c "
UPDATE properties
SET \"descriptionRu\" = TRIM(\"descriptionRu\")
WHERE \"descriptionRu\" IS NOT NULL;
"

echo ""
echo "=== ПЕРЕВІРКА РЕЗУЛЬТАТУ ==="
docker exec for-you-admin-panel-postgres-prod psql -U admin -d admin_panel -c "
SELECT 
  COUNT(*) as total_with_ru_description,
  COUNT(CASE WHEN \"descriptionRu\" LIKE '%#####%' THEN 1 END) as with_hashtags,
  COUNT(CASE WHEN \"descriptionRu\" LIKE '%Отделка и материалы%' THEN 1 END) as with_otdelka,
  COUNT(CASE WHEN \"descriptionRu\" LIKE '%Кухня и бытовая техника%' THEN 1 END) as with_kitchen,
  COUNT(CASE WHEN \"descriptionRu\" LIKE '%Меблировка%' THEN 1 END) as with_furnishing,
  COUNT(CASE WHEN \"descriptionRu\" LIKE '%Общие факты о проекте%' THEN 1 END) as with_general_facts
FROM properties
WHERE \"descriptionRu\" IS NOT NULL;
"

echo ""
echo "=== ПРИКЛАДИ ОЧИЩЕНИХ ОПИСІВ ==="
docker exec for-you-admin-panel-postgres-prod psql -U admin -d admin_panel -c "
SELECT 
  name,
  LEFT(\"descriptionRu\", 250) as preview
FROM properties
WHERE \"descriptionRu\" IS NOT NULL
ORDER BY RANDOM()
LIMIT 3;
"

echo ""
echo "✅ Готово!"

ENDSSH

echo ""
echo "✅ Очищення російських описів завершено!"
