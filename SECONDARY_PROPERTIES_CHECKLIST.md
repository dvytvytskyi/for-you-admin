# ✅ Чеклист перевірки Secondary Properties

Цей документ описує всі перевірки, які потрібно зробити для secondary properties на бекенді.

---

## 📋 1. Endpoint `/api/properties?propertyType=secondary`

### ✅ Перевірки:

#### 1.1. Базовий запит
```bash
curl -X GET "https://admin.foryou-realestate.com/api/properties?propertyType=secondary&page=1&limit=10" \
  -H "X-API-Key: YOUR_API_KEY"
```

**Очікуваний результат:**
- ✅ Повертає secondary properties
- ✅ Структура відповіді: `{ success: true, data: { data: [...], pagination: {...} } }`
- ✅ `pagination.total` - загальна кількість secondary properties
- ✅ `pagination.page` = 1
- ✅ `pagination.limit` = 10

---

#### 1.2. Підтримка фільтрів

**Фільтр по bedrooms:**
```bash
curl -X GET "https://admin.foryou-realestate.com/api/properties?propertyType=secondary&bedrooms=2&page=1&limit=10" \
  -H "X-API-Key: YOUR_API_KEY"
```
- ✅ Повертає тільки secondary properties з `bedrooms = 2`
- ✅ Для secondary перевіряється точне значення `bedrooms` (не діапазон)

**Фільтр по size:**
```bash
curl -X GET "https://admin.foryou-realestate.com/api/properties?propertyType=secondary&sizeFrom=50&sizeTo=150&page=1&limit=10" \
  -H "X-API-Key: YOUR_API_KEY"
```
- ✅ Фільтрує по полю `size` (не `sizeFrom`/`sizeTo`)
- ✅ Повертає properties з розміром між 50 та 150 м²

**Фільтр по price:**
```bash
curl -X GET "https://admin.foryou-realestate.com/api/properties?propertyType=secondary&priceFrom=100000&priceTo=500000&page=1&limit=10" \
  -H "X-API-Key: YOUR_API_KEY"
```
- ✅ Фільтрує по полю `price` (не `priceFrom`)
- ✅ Повертає properties з ціною між 100000 та 500000 USD

**Фільтр по area:**
```bash
curl -X GET "https://admin.foryou-realestate.com/api/properties?propertyType=secondary&areaId=UUID&page=1&limit=10" \
  -H "X-API-Key: YOUR_API_KEY"
```
- ✅ Повертає secondary properties в конкретному районі

**Фільтр по developer:**
```bash
curl -X GET "https://admin.foryou-realestate.com/api/properties?propertyType=secondary&developerId=UUID&page=1&limit=10" \
  -H "X-API-Key: YOUR_API_KEY"
```
- ✅ Повертає secondary properties конкретного девелопера

**Пошук (search):**
```bash
curl -X GET "https://admin.foryou-realestate.com/api/properties?propertyType=secondary&search=apartment&page=1&limit=10" \
  -H "X-API-Key: YOUR_API_KEY"
```
- ✅ Пошук по полям `name` та `description` (case-insensitive)

---

#### 1.3. Сортування

**Сортування по ціні (ASC):**
```bash
curl -X GET "https://admin.foryou-realestate.com/api/properties?propertyType=secondary&sortBy=price&sortOrder=ASC&page=1&limit=10" \
  -H "X-API-Key: YOUR_API_KEY"
```
- ✅ Повертає properties від найдешевших до найдорожчих

**Сортування по ціні (DESC):**
```bash
curl -X GET "https://admin.foryou-realestate.com/api/properties?propertyType=secondary&sortBy=price&sortOrder=DESC&page=1&limit=10" \
  -H "X-API-Key: YOUR_API_KEY"
```
- ✅ Повертає properties від найдорожчих до найдешевших

**Сортування по назві:**
```bash
curl -X GET "https://admin.foryou-realestate.com/api/properties?propertyType=secondary&sortBy=name&sortOrder=ASC&page=1&limit=10" \
  -H "X-API-Key: YOUR_API_KEY"
```
- ✅ Сортує по алфавіту

---

#### 1.4. Автентифікація через API Key/Secret

**З API Key та Secret:**
```bash
curl -X GET "https://admin.foryou-realestate.com/api/properties?propertyType=secondary&page=1&limit=10" \
  -H "X-API-Key: YOUR_API_KEY" \
  -H "X-API-Secret: YOUR_API_SECRET"
```
- ✅ Працює з API Key/Secret

**Тільки з API Key:**
```bash
curl -X GET "https://admin.foryou-realestate.com/api/properties?propertyType=secondary&page=1&limit=10" \
  -H "X-API-Key: YOUR_API_KEY"
```
- ✅ Працює тільки з API Key (якщо Secret не обов'язковий)

---

## 📋 2. Структура даних Secondary Property

### ✅ Перевірка структури відповіді:

```json
{
  "success": true,
  "data": {
    "data": [
      {
        "id": "uuid",
        "propertyType": "secondary",  // ✅ Має бути "secondary"
        
        // Обов'язкові поля для secondary
        "price": 250000,              // ✅ Обов'язкове (USD)
        "priceAED": 917500,            // ✅ Автоматично розраховане (price * 3.67)
        "size": 120,                   // ✅ Обов'язкове (м²)
        "sizeSqft": 1291.68,           // ✅ Автоматично розраховане (size * 10.764)
        "bedrooms": 2,                 // ✅ Число (не діапазон)
        "bathrooms": 2,                // ✅ Число
        
        // Area - об'єкт (не рядок!)
        "area": {                      // ✅ Має бути об'єктом для secondary
          "id": "uuid",
          "nameEn": "Dubai Marina",
          "nameRu": "Дубай Марина",
          "nameAr": "دبي مارينا"
        },
        
        // Photos - масив
        "photos": [                    // ✅ Масив URL
          "https://...",
          "https://..."
        ],
        
        // Інші поля
        "name": "Luxury Apartment",
        "description": "...",
        "country": { /* ... */ },
        "city": { /* ... */ },
        "developer": { /* ... */ },
        "facilities": [ /* ... */ ],
        
        // Off-plan поля мають бути null або відсутні
        "priceFrom": null,             // ✅ null для secondary
        "bedroomsFrom": null,           // ✅ null для secondary
        "bedroomsTo": null,             // ✅ null для secondary
        "sizeFrom": null,               // ✅ null для secondary
        "sizeTo": null,                 // ✅ null для secondary
        "units": []                     // ✅ Порожній масив для secondary
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 1234,
      "totalPages": 124
    }
  }
}
```

### ✅ Ключові перевірки:

1. **propertyType:** Має бути `"secondary"` (не `"off-plan"`)
2. **price:** Обов'язкове поле, число в USD
3. **priceAED:** Автоматично розраховане (`price * 3.67`)
4. **size:** Обов'язкове поле, число в м²
5. **sizeSqft:** Автоматично розраховане (`size * 10.764`)
6. **bedrooms:** Число (не діапазон, не `bedroomsFrom`/`bedroomsTo`)
7. **bathrooms:** Число
8. **area:** Об'єкт з `{id, nameEn, nameRu, nameAr}` (НЕ рядок!)
9. **photos:** Масив рядків (URL)
10. **units:** Порожній масив `[]` (units тільки для off-plan)

---

## 📋 3. Підрахунок у Areas

### ✅ Endpoint `/api/public/areas`

```bash
curl -X GET "https://admin.foryou-realestate.com/api/public/areas" \
  -H "X-API-Key: YOUR_API_KEY" \
  -H "X-API-Secret: YOUR_API_SECRET"
```

**Очікувана структура відповіді:**

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "nameEn": "Dubai Marina",
      "nameRu": "Дубай Марина",
      "nameAr": "دبي مارينا",
      "cityId": "uuid",
      "city": { /* ... */ },
      "projectsCount": {
        "total": 150,           // ✅ Загальна кількість properties
        "offPlan": 100,         // ✅ Кількість off-plan properties
        "secondary": 50        // ✅ Кількість secondary properties
      }
    }
  ]
}
```

### ✅ Перевірки:

1. **projectsCount.secondary:** Має містити кількість secondary properties в районі
2. **projectsCount.offPlan:** Має містити кількість off-plan properties в районі
3. **projectsCount.total:** Має дорівнювати `offPlan + secondary`
4. **Підрахунок правильний:** Кількість має відповідати реальній кількості в БД

---

## 🧪 Як протестувати

### Варіант 1: Через тестовий скрипт (рекомендовано)

**На сервері:**
```bash
cd /opt/admin-panel/admin-panel-backend
npm run test:secondary
```

**Через API (локально або на сервері):**
```bash
cd admin-panel-backend
./src/scripts/test-api-secondary.sh YOUR_API_KEY YOUR_API_SECRET
```

---

### Варіант 2: Вручну через curl

**1. Базовий тест:**
```bash
curl -X GET "https://admin.foryou-realestate.com/api/properties?propertyType=secondary&page=1&limit=5" \
  -H "X-API-Key: YOUR_API_KEY" | jq '.'
```

**2. Перевірка структури:**
```bash
curl -X GET "https://admin.foryou-realestate.com/api/properties?propertyType=secondary&page=1&limit=1" \
  -H "X-API-Key: YOUR_API_KEY" | jq '.data.data[0] | {
    propertyType,
    price,
    priceAED,
    size,
    sizeSqft,
    bedrooms,
    area: (.area | type),
    photos: (.photos | type)
  }'
```

**3. Перевірка areas:**
```bash
curl -X GET "https://admin.foryou-realestate.com/api/public/areas" \
  -H "X-API-Key: YOUR_API_KEY" \
  -H "X-API-Secret: YOUR_API_SECRET" | jq '.data[] | select(.projectsCount.secondary > 0) | {
    nameEn,
    projectsCount
  }' | head -10
```

---

## 📝 Чеклист перевірки

### Endpoint `/api/properties`

- [ ] Повертає secondary properties при `propertyType=secondary`
- [ ] Підтримує фільтр `bedrooms` (точне значення для secondary)
- [ ] Підтримує фільтр `sizeFrom`/`sizeTo` (по полю `size`)
- [ ] Підтримує фільтр `priceFrom`/`priceTo` (по полю `price`)
- [ ] Підтримує фільтр `areaId`
- [ ] Підтримує фільтр `developerId`
- [ ] Підтримує пошук `search`
- [ ] Підтримує сортування `sortBy` та `sortOrder`
- [ ] Працює з API Key/Secret
- [ ] Повертає пагінацію

### Структура даних

- [ ] `propertyType` = `"secondary"`
- [ ] `price` присутнє та не null
- [ ] `priceAED` автоматично розраховане
- [ ] `size` присутнє та не null
- [ ] `sizeSqft` автоматично розраховане
- [ ] `bedrooms` - число (не діапазон)
- [ ] `bathrooms` - число
- [ ] `area` - об'єкт (не рядок!)
- [ ] `area.id` присутнє
- [ ] `area.nameEn` присутнє
- [ ] `photos` - масив
- [ ] Off-plan поля (`priceFrom`, `bedroomsFrom`, etc.) = null

### Підрахунок в Areas

- [ ] `projectsCount.secondary` присутнє
- [ ] `projectsCount.secondary` правильне значення
- [ ] `projectsCount.total` = `offPlan + secondary`

---

## 🔧 Якщо щось не працює

### Проблема: area повертається як рядок замість об'єкта

**Причина:** Логіка в `properties.routes.ts` перетворює area в рядок для off-plan, але має залишати об'єктом для secondary.

**Рішення:** Перевірте код на рядках 207-213 в `properties.routes.ts`:
```typescript
let areaField: any = p.area;
if (p.area && p.propertyType === 'off-plan') {
  // Тільки для off-plan перетворюємо в рядок
  areaField = `${areaName}, ${cityName}`;
}
// Для secondary залишається об'єктом
```

---

### Проблема: projectsCount.secondary = 0 для areas з secondary properties

**Причина:** SQL запит не правильно рахує secondary properties.

**Рішення:** Перевірте код на рядках 469-471 в `public.routes.ts`:
```typescript
.addSelect(
  "SUM(CASE WHEN property.propertyType = 'secondary' THEN 1 ELSE 0 END)",
  'secondary'
)
```

---

### Проблема: Фільтри не працюють для secondary

**Причина:** Фільтри можуть перевіряти неправильні поля.

**Рішення:** Перевірте:
- `bedrooms` - має перевіряти `property.bedrooms` для secondary (рядок 106)
- `sizeFrom`/`sizeTo` - має перевіряти `property.size` для secondary (рядки 126, 135)
- `priceFrom`/`priceTo` - має перевіряти `property.price` для secondary (рядки 145, 154)

---

## 📚 Додаткові ресурси

- **API документація:** `API_DOCUMENTATION.md`
- **Тестовий скрипт:** `admin-panel-backend/src/scripts/test-secondary-properties.ts`
- **API тестовий скрипт:** `admin-panel-backend/src/scripts/test-api-secondary.sh`

---

**Останнє оновлення:** 2024-11-07

