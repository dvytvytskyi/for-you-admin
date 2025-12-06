#!/bin/bash

# Експорт всіх необхідних даних зі старої БД (тільки off-plan)
# Включає: Countries, Cities, Areas, Developers, Facilities, Properties (off-plan), PropertyUnits, зв'язки

OLD_DB_CONTAINER="for-you-admin-panel-postgres-new"
OLD_DB_NAME="admin_panel"
OLD_DB_USER="admin"
EXPORT_DIR="/Users/vytvytskyi/exported-offplan-data"

# Створити директорію для експорту
mkdir -p $EXPORT_DIR

echo "📦 Експорт даних зі старої БД (тільки off-plan)..."
echo "📁 Збереження в: $EXPORT_DIR"
echo ""

# Перевірити, чи контейнер існує
if ! docker ps -a | grep -q $OLD_DB_CONTAINER; then
    echo "❌ Помилка: Контейнер $OLD_DB_CONTAINER не знайдено"
    echo "Доступні контейнери:"
    docker ps -a | grep postgres
    exit 1
fi

# 1. Експорт Countries (ВСІ - потрібні для off-plan)
echo "1️⃣ Експорт Countries (всі)..."
docker exec $OLD_DB_CONTAINER psql -U $OLD_DB_USER -d $OLD_DB_NAME -t -A -c "
SELECT COALESCE(json_agg(row_to_json(c)), '[]'::json) 
FROM countries c;
" > $EXPORT_DIR/countries.json
if [ $? -eq 0 ]; then
    COUNT=$(cat $EXPORT_DIR/countries.json | jq '. | length' 2>/dev/null || echo "0")
    echo "   ✅ Countries експортовано: $COUNT"
else
    echo "   ❌ Помилка експорту Countries"
fi

# 2. Експорт Cities (ВСІ - потрібні для off-plan)
echo "2️⃣ Експорт Cities (всі)..."
docker exec $OLD_DB_CONTAINER psql -U $OLD_DB_USER -d $OLD_DB_NAME -t -A -c "
SELECT COALESCE(json_agg(row_to_json(c)), '[]'::json) 
FROM cities c;
" > $EXPORT_DIR/cities.json
if [ $? -eq 0 ]; then
    COUNT=$(cat $EXPORT_DIR/cities.json | jq '. | length' 2>/dev/null || echo "0")
    echo "   ✅ Cities експортовано: $COUNT"
else
    echo "   ❌ Помилка експорту Cities"
fi

# 3. Експорт Areas (ВСІ райони)
echo "3️⃣ Експорт Areas (всі райони)..."
docker exec $OLD_DB_CONTAINER psql -U $OLD_DB_USER -d $OLD_DB_NAME -t -A -c "
SELECT COALESCE(json_agg(row_to_json(a)), '[]'::json) 
FROM areas a;
" > $EXPORT_DIR/areas.json
if [ $? -eq 0 ]; then
    COUNT=$(cat $EXPORT_DIR/areas.json | jq '. | length' 2>/dev/null || echo "0")
    echo "   ✅ Areas експортовано: $COUNT"
else
    echo "   ❌ Помилка експорту Areas"
fi

# 4. Експорт Developers (ВСІ)
echo "4️⃣ Експорт Developers (всі)..."
docker exec $OLD_DB_CONTAINER psql -U $OLD_DB_USER -d $OLD_DB_NAME -t -A -c "
SELECT COALESCE(json_agg(row_to_json(d)), '[]'::json) 
FROM developers d;
" > $EXPORT_DIR/developers.json
if [ $? -eq 0 ]; then
    COUNT=$(cat $EXPORT_DIR/developers.json | jq '. | length' 2>/dev/null || echo "0")
    echo "   ✅ Developers експортовано: $COUNT"
else
    echo "   ❌ Помилка експорту Developers"
fi

# 5. Експорт Facilities/Amenities (ВСІ)
echo "5️⃣ Експорт Facilities/Amenities (всі)..."
docker exec $OLD_DB_CONTAINER psql -U $OLD_DB_USER -d $OLD_DB_NAME -t -A -c "
SELECT COALESCE(json_agg(row_to_json(f)), '[]'::json) 
FROM facilities f;
" > $EXPORT_DIR/facilities.json
if [ $? -eq 0 ]; then
    COUNT=$(cat $EXPORT_DIR/facilities.json | jq '. | length' 2>/dev/null || echo "0")
    echo "   ✅ Facilities експортовано: $COUNT"
else
    echo "   ❌ Помилка експорту Facilities"
fi

# 6. Експорт Properties (тільки off-plan)
echo "6️⃣ Експорт Properties (тільки off-plan)..."
docker exec $OLD_DB_CONTAINER psql -U $OLD_DB_USER -d $OLD_DB_NAME -t -A -c "
SELECT COALESCE(json_agg(row_to_json(p)), '[]'::json) 
FROM (
  SELECT * FROM properties 
  WHERE \"propertyType\" = 'off-plan'
) p;
" > $EXPORT_DIR/properties-offplan.json
if [ $? -eq 0 ]; then
    COUNT=$(cat $EXPORT_DIR/properties-offplan.json | jq '. | length' 2>/dev/null || echo "0")
    echo "   ✅ Off-plan Properties експортовано: $COUNT"
else
    echo "   ❌ Помилка експорту Properties"
fi

# 7. Експорт PropertyUnits (тільки для off-plan)
echo "7️⃣ Експорт PropertyUnits (для off-plan)..."
docker exec $OLD_DB_CONTAINER psql -U $OLD_DB_USER -d $OLD_DB_NAME -t -A -c "
SELECT COALESCE(json_agg(row_to_json(u)), '[]'::json) 
FROM property_units u
WHERE u.\"propertyId\" IN (
  SELECT id FROM properties WHERE \"propertyType\" = 'off-plan'
);
" > $EXPORT_DIR/property-units-offplan.json
if [ $? -eq 0 ]; then
    COUNT=$(cat $EXPORT_DIR/property-units-offplan.json | jq '. | length' 2>/dev/null || echo "0")
    echo "   ✅ PropertyUnits експортовано: $COUNT"
else
    echo "   ❌ Помилка експорту PropertyUnits"
fi

# 8. Експорт зв'язків Property-Facility (тільки для off-plan)
echo "8️⃣ Експорт Property-Facility зв'язків (для off-plan)..."
docker exec $OLD_DB_CONTAINER psql -U $OLD_DB_USER -d $OLD_DB_NAME -t -A -c "
SELECT COALESCE(json_agg(row_to_json(pf)), '[]'::json) 
FROM (
  SELECT pf.* 
  FROM properties_facilities_facilities pf
  INNER JOIN properties p ON p.id = pf.\"propertiesId\"
  WHERE p.\"propertyType\" = 'off-plan'
) pf;
" > $EXPORT_DIR/properties-facilities-offplan.json
if [ $? -eq 0 ]; then
    COUNT=$(cat $EXPORT_DIR/properties-facilities-offplan.json | jq '. | length' 2>/dev/null || echo "0")
    echo "   ✅ Property-Facility зв'язки експортовано: $COUNT"
else
    echo "   ⚠️  Можливо таблиця properties_facilities_facilities не існує або має іншу назву"
fi

# Статистика
echo ""
echo "📊 Статистика експорту:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
for file in countries.json cities.json areas.json developers.json facilities.json properties-offplan.json property-units-offplan.json; do
    if [ -f "$EXPORT_DIR/$file" ]; then
        COUNT=$(cat $EXPORT_DIR/$file | jq '. | length' 2>/dev/null || echo "0")
        SIZE=$(ls -lh $EXPORT_DIR/$file | awk '{print $5}')
        echo "   $(basename $file .json): $COUNT записів ($SIZE)"
    fi
done

if [ -f "$EXPORT_DIR/properties-facilities-offplan.json" ]; then
    COUNT=$(cat $EXPORT_DIR/properties-facilities-offplan.json | jq '. | length' 2>/dev/null || echo "0")
    SIZE=$(ls -lh $EXPORT_DIR/properties-facilities-offplan.json | awk '{print $5}')
    echo "   properties-facilities: $COUNT зв'язків ($SIZE)"
fi

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "✅ Експорт завершено!"
echo "📁 Всі файли збережено в: $EXPORT_DIR"
echo ""
echo "📋 Наступні кроки:"
echo "   1. Перевірити файли в $EXPORT_DIR"
echo "   2. Скопіювати папку exported-offplan-data в новий проект"
echo "   3. Запустити скрипт імпорту в новому проекті"

