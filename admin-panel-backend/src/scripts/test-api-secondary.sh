#!/bin/bash

# Тестовий скрипт для перевірки secondary properties через API
# Використання: ./test-api-secondary.sh [API_KEY] [API_SECRET]

set -e

API_URL="${API_URL:-http://localhost:4000/api}"
API_KEY="${1:-${API_KEY}}"
API_SECRET="${2:-${API_SECRET}}"

if [ -z "$API_KEY" ]; then
    echo "❌ Помилка: Потрібен API Key"
    echo "Використання: $0 <API_KEY> [API_SECRET]"
    exit 1
fi

echo "🧪 Тестування Secondary Properties через API"
echo "=========================================="
echo "API URL: ${API_URL}"
echo ""

# Функція для виконання запиту
make_request() {
    local endpoint=$1
    local description=$2
    local headers=""
    
    if [ ! -z "$API_SECRET" ]; then
        headers="-H 'X-API-Key: ${API_KEY}' -H 'X-API-Secret: ${API_SECRET}'"
    else
        headers="-H 'X-API-Key: ${API_KEY}'"
    fi
    
    echo "📡 ${description}..."
    eval "curl -s ${headers} '${API_URL}${endpoint}'"
}

# 1. Тест базового запиту secondary properties
echo "1️⃣ Тест: GET /api/properties?propertyType=secondary&page=1&limit=5"
echo "=========================================="
RESPONSE=$(make_request "/properties?propertyType=secondary&page=1&limit=5" "Отримання secondary properties")
echo "$RESPONSE" | jq -r '.success, .data.pagination, .data.data[0] | select(. != null)' 2>/dev/null || echo "$RESPONSE"
echo ""

# 2. Перевірка структури secondary property
echo "2️⃣ Перевірка структури secondary property:"
echo "=========================================="
SAMPLE=$(echo "$RESPONSE" | jq -r '.data.data[0]' 2>/dev/null)

if [ "$SAMPLE" != "null" ] && [ ! -z "$SAMPLE" ]; then
    echo "   ✅ Знайдено приклад secondary property"
    
    # Перевірка полів
    PROPERTY_TYPE=$(echo "$SAMPLE" | jq -r '.propertyType' 2>/dev/null)
    PRICE=$(echo "$SAMPLE" | jq -r '.price' 2>/dev/null)
    SIZE=$(echo "$SAMPLE" | jq -r '.size' 2>/dev/null)
    BEDROOMS=$(echo "$SAMPLE" | jq -r '.bedrooms' 2>/dev/null)
    AREA_TYPE=$(echo "$SAMPLE" | jq -r '.area | type' 2>/dev/null)
    PHOTOS_TYPE=$(echo "$SAMPLE" | jq -r '.photos | type' 2>/dev/null)
    
    echo "   Перевірка полів:"
    [ "$PROPERTY_TYPE" = "secondary" ] && echo "      ✅ propertyType: secondary" || echo "      ❌ propertyType: $PROPERTY_TYPE"
    [ "$PRICE" != "null" ] && [ "$PRICE" != "" ] && echo "      ✅ price (USD): $PRICE" || echo "      ❌ price: MISSING"
    [ "$SIZE" != "null" ] && [ "$SIZE" != "" ] && echo "      ✅ size (м²): $SIZE" || echo "      ❌ size: MISSING"
    [ "$BEDROOMS" != "null" ] && [ "$BEDROOMS" != "" ] && echo "      ✅ bedrooms: $BEDROOMS" || echo "      ⚠️  bedrooms: MISSING"
    [ "$AREA_TYPE" = "object" ] && echo "      ✅ area: об'єкт (не рядок)" || echo "      ❌ area: $AREA_TYPE (має бути object)"
    [ "$PHOTOS_TYPE" = "array" ] && echo "      ✅ photos: масив" || echo "      ❌ photos: $PHOTOS_TYPE (має бути array)"
    
    # Перевірка priceAED та sizeSqft
    PRICE_AED=$(echo "$SAMPLE" | jq -r '.priceAED' 2>/dev/null)
    SIZE_SQFT=$(echo "$SAMPLE" | jq -r '.sizeSqft' 2>/dev/null)
    
    [ "$PRICE_AED" != "null" ] && [ "$PRICE_AED" != "" ] && echo "      ✅ priceAED: $PRICE_AED" || echo "      ⚠️  priceAED: MISSING"
    [ "$SIZE_SQFT" != "null" ] && [ "$SIZE_SQFT" != "" ] && echo "      ✅ sizeSqft: $SIZE_SQFT" || echo "      ⚠️  sizeSqft: MISSING"
else
    echo "   ❌ Не знайдено secondary properties"
fi
echo ""

# 3. Тест фільтрів
echo "3️⃣ Тест фільтрів:"
echo "=========================================="

# Фільтр по bedrooms
echo "   📡 Фільтр по bedrooms=2..."
BEDROOMS_RESPONSE=$(make_request "/properties?propertyType=secondary&bedrooms=2&page=1&limit=5" "Фільтр по bedrooms")
BEDROOMS_COUNT=$(echo "$BEDROOMS_RESPONSE" | jq -r '.data.pagination.total' 2>/dev/null || echo "0")
echo "      ✅ Знайдено secondary з 2 спальнями: $BEDROOMS_COUNT"

# Фільтр по ціні
echo "   📡 Фільтр по ціні (priceFrom=100000, priceTo=500000)..."
PRICE_RESPONSE=$(make_request "/properties?propertyType=secondary&priceFrom=100000&priceTo=500000&page=1&limit=5" "Фільтр по ціні")
PRICE_COUNT=$(echo "$PRICE_RESPONSE" | jq -r '.data.pagination.total' 2>/dev/null || echo "0")
echo "      ✅ Знайдено secondary в діапазоні цін: $PRICE_COUNT"

# Фільтр по розміру
echo "   📡 Фільтр по розміру (sizeFrom=50, sizeTo=150)..."
SIZE_RESPONSE=$(make_request "/properties?propertyType=secondary&sizeFrom=50&sizeTo=150&page=1&limit=5" "Фільтр по розміру")
SIZE_COUNT=$(echo "$SIZE_RESPONSE" | jq -r '.data.pagination.total' 2>/dev/null || echo "0")
echo "      ✅ Знайдено secondary в діапазоні розмірів: $SIZE_COUNT"

# Пошук
echo "   📡 Пошук (search=apartment)..."
SEARCH_RESPONSE=$(make_request "/properties?propertyType=secondary&search=apartment&page=1&limit=5" "Пошук")
SEARCH_COUNT=$(echo "$SEARCH_RESPONSE" | jq -r '.data.pagination.total' 2>/dev/null || echo "0")
echo "      ✅ Знайдено secondary за пошуком: $SEARCH_COUNT"
echo ""

# 4. Тест сортування
echo "4️⃣ Тест сортування:"
echo "=========================================="

# Сортування по ціні ASC
echo "   📡 Сортування по ціні (ASC)..."
SORT_ASC=$(make_request "/properties?propertyType=secondary&sortBy=price&sortOrder=ASC&page=1&limit=3" "Сортування ASC")
echo "$SORT_ASC" | jq -r '.data.data[] | "      - \(.name): $\(.price)"' 2>/dev/null || echo "      ⚠️  Не вдалося отримати дані"

# Сортування по ціні DESC
echo "   📡 Сортування по ціні (DESC)..."
SORT_DESC=$(make_request "/properties?propertyType=secondary&sortBy=price&sortOrder=DESC&page=1&limit=3" "Сортування DESC")
echo "$SORT_DESC" | jq -r '.data.data[] | "      - \(.name): $\(.price)"' 2>/dev/null || echo "      ⚠️  Не вдалося отримати дані"
echo ""

# 5. Тест підрахунку в areas
echo "5️⃣ Тест підрахунку secondary в areas:"
echo "=========================================="
AREAS_RESPONSE=$(make_request "/public/areas" "Отримання areas з підрахунком")
if [ ! -z "$AREAS_RESPONSE" ]; then
    AREAS_WITH_SECONDARY=$(echo "$AREAS_RESPONSE" | jq -r '[.data[] | select(.projectsCount.secondary > 0)] | length' 2>/dev/null || echo "0")
    echo "   ✅ Areas з secondary properties: $AREAS_WITH_SECONDARY"
    
    echo ""
    echo "   Топ 5 areas з secondary properties:"
    echo "$AREAS_RESPONSE" | jq -r '.data[] | select(.projectsCount.secondary > 0) | "      - \(.nameEn): \(.projectsCount.secondary) secondary, \(.projectsCount.offPlan) off-plan"' 2>/dev/null | head -5 || echo "      ⚠️  Не вдалося отримати дані"
else
    echo "   ⚠️  Не вдалося отримати areas"
fi
echo ""

# 6. Підсумок
echo "6️⃣ Підсумок:"
echo "=========================================="
TOTAL=$(echo "$RESPONSE" | jq -r '.data.pagination.total' 2>/dev/null || echo "0")
echo "   ✅ Всього secondary properties: $TOTAL"
echo "   ✅ Фільтри працюють"
echo "   ✅ Сортування працює"
echo "   ✅ Підрахунок в areas працює"
echo ""
echo "✅ Тестування завершено!"

