#!/bin/bash

# Скрипт для отримання підрахунку off-plan проектів по areas

SERVER_IP="135.181.201.185"
SERVER_USER="root"
SERVER_PASSWORD="FNrtVkfCRwgW"

echo "🔍 Отримання даних з бази даних..."

# Виконуємо SQL запит
DATA=$(sshpass -p "${SERVER_PASSWORD}" ssh -o StrictHostKeyChecking=no ${SERVER_USER}@${SERVER_IP} \
  "docker exec for-you-admin-panel-postgres-prod psql -U admin -d admin_panel -t -A -F '|' -c \"SELECT a.id, a.\\\"nameEn\\\", COUNT(p.id)::text FROM areas a LEFT JOIN properties p ON p.\\\"areaId\\\" = a.id AND p.\\\"propertyType\\\" = 'off-plan' GROUP BY a.id, a.\\\"nameEn\\\" HAVING COUNT(p.id) > 0 ORDER BY COUNT(p.id) DESC;\"" 2>&1)

# Перевіряємо, чи є дані
if [ -z "$DATA" ] || echo "$DATA" | grep -q "ERROR"; then
  echo "❌ Помилка отримання даних"
  echo "$DATA"
  exit 1
fi

# Формуємо markdown файл
OUTPUT_FILE="area-projects.md"

echo "# Підрахунок off-plan проектів по areas" > "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"

# Підраховуємо загальну кількість
TOTAL_AREAS=$(echo "$DATA" | grep -v "^$" | wc -l | tr -d ' ')
TOTAL_PROJECTS=$(echo "$DATA" | grep -v "^$" | cut -d'|' -f3 | awk '{sum+=$1} END {print sum}')

echo "**Загальна кількість areas з off-plan проектами:** $TOTAL_AREAS" >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"
echo "**Загальна кількість off-plan проектів:** $TOTAL_PROJECTS" >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"
echo "---" >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"
echo "| Area ID | Area Name | Кількість проектів |" >> "$OUTPUT_FILE"
echo "|---------|-----------|---------------------|" >> "$OUTPUT_FILE"

# Додаємо дані в таблицю
echo "$DATA" | grep -v "^$" | while IFS='|' read -r id name count; do
  if [ ! -z "$id" ] && [ ! -z "$name" ] && [ ! -z "$count" ]; then
    echo "| \`$id\` | $name | **$count** |" >> "$OUTPUT_FILE"
  fi
done

echo "" >> "$OUTPUT_FILE"
echo "---" >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"
echo "## Топ-20 areas за кількістю off-plan проектів" >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"

# Додаємо топ-20
counter=1
echo "$DATA" | grep -v "^$" | head -20 | while IFS='|' read -r id name count; do
  if [ ! -z "$id" ] && [ ! -z "$name" ] && [ ! -z "$count" ]; then
    echo "$counter. **$name** - $count проектів" >> "$OUTPUT_FILE"
    counter=$((counter + 1))
  fi
done

echo ""
echo "✅ Файл створено: $OUTPUT_FILE"
echo "📊 Загальна кількість areas: $TOTAL_AREAS"
echo "📊 Загальна кількість проектів: $TOTAL_PROJECTS"

