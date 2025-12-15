# 📸 Документація: Як передаються фото Areas через API

## 🔍 Що віддається через API

### Endpoint: `GET /api/public/data`

**Структура відповіді для areas:**

```json
{
  "success": true,
  "data": {
    "areas": [
      {
        "id": "a4602dd0-7577-4bb6-9d2f-d181732f07ac",
        "nameEn": "Al Barari",
        "nameRu": "",
        "nameAr": "",
        "cityId": "191ac941-212a-4136-b305-e38d7e55aea5",
        "city": {
          "id": "...",
          "nameEn": "Dubai",
          ...
        },
        "description": { ... },
        "infrastructure": { ... },
        "images": [
          "https://files.alnair.ae/uploads/2024/10/ef/06/ef0643a74cc6edca13849020b5980e28.jpg",
          "https://files.alnair.ae/uploads/2024/10/27/05/2705f7ff3227c0e9f6fe00f94239a052.jpg",
          ...
        ]
      }
    ]
  }
}
```

## 📊 Формат даних

### В базі даних (PostgreSQL):
- **Тип колонки:** `simple-array` (TypeORM)
- **Формат зберігання:** Кома-розділений рядок
- **Приклад:** `url1,url2,url3`

### TypeORM обробка:
- TypeORM автоматично конвертує кома-розділений рядок в масив JavaScript
- При `.find()` повертає `string[]` або `null`

### В API відповіді:
- **Тип:** `string[] | undefined`
- **Формат:** Масив URL рядків
- **Приклад:** `["url1", "url2", "url3"]`

## 🔧 Обробка на Backend

### Код обробки (`public.routes.ts`):

```typescript
// Parse area images from simple-array format
const areas = areasRaw.map(area => {
  if (area.images) {
    let images: any = area.images;
    
    // TypeORM simple-array should return array, but handle both cases
    if (typeof images === 'string') {
      // Remove outer curly braces if present (PostgreSQL array format)
      let cleaned = images.trim();
      if (cleaned.startsWith('{') && cleaned.endsWith('}')) {
        cleaned = cleaned.slice(1, -1).trim();
      }
      // Split by comma and clean each URL
      images = cleaned
        .split(',')
        .map((url: string) => {
          let urlCleaned = url.trim();
          // Remove any remaining curly braces
          if (urlCleaned.startsWith('{') && urlCleaned.endsWith('}')) {
            urlCleaned = urlCleaned.slice(1, -1).trim();
          }
          return urlCleaned;
        })
        .filter((url: string) => url.length > 0);
    } else if (Array.isArray(images)) {
      // Already an array, just clean each URL
      images = images
        .map((url: any) => {
          if (typeof url !== 'string') return '';
          let urlCleaned = url.trim();
          // Remove any curly braces
          if (urlCleaned.startsWith('{') && urlCleaned.endsWith('}')) {
            urlCleaned = urlCleaned.slice(1, -1).trim();
          }
          return urlCleaned;
        })
        .filter((url: string) => url.length > 0 && (url.startsWith('http://') || url.startsWith('https://')));
    }
    
    area.images = Array.isArray(images) && images.length > 0 ? images : undefined;
  } else {
    area.images = undefined;
  }
  return area;
});
```

## ⚠️ Потенційні проблеми з лінками

### 1. **Проблема: URL не валідні**
**Симптоми:**
- Фото не завантажуються
- 404 помилки в Network tab
- Broken image icons

**Можливі причини:**
- URL починаються не з `http://` або `https://`
- URL містять зайві символи (фігурні дужки, пробіли)
- URL порожні або `null`

**Рішення:**
- Backend фільтрує URL, які не починаються з `http://` або `https://`
- Backend видаляє фігурні дужки
- Backend видаляє порожні URL

### 2. **Проблема: Файли не існують на сервері**
**Симптоми:**
- 404 помилки при завантаженні
- Фото не відображаються

**Можливі причини:**
- Файли видалені з `files.alnair.ae`
- Неправильний шлях до файлу
- Файли переміщені

**Рішення:**
- Перевірити, чи файли існують на сервері
- Оновити URL в базі даних
- Використати fallback зображення на фронтенді

### 3. **Проблема: CORS помилки**
**Симптоми:**
- Помилки в консолі: "CORS policy blocked"
- Фото не завантажуються

**Можливі причини:**
- `files.alnair.ae` не дозволяє завантаження з вашого домену
- CORS headers не налаштовані

**Рішення:**
- Налаштувати CORS на `files.alnair.ae`
- Або використати проксі на вашому сервері

### 4. **Проблема: Повільне завантаження**
**Симптоми:**
- Фото завантажуються дуже довго
- Timeout помилки

**Можливі причини:**
- Сервер `files.alnair.ae` повільний
- Великі розміри файлів
- Проблеми з мережею

**Рішення:**
- Використати CDN (наприклад, Cloudinary)
- Оптимізувати розміри зображень
- Додати lazy loading

### 5. **Проблема: Неправильний формат в базі**
**Симптоми:**
- `images` повертається як `null` або порожній масив
- Фото не відображаються

**Можливі причини:**
- В базі зберігається порожній рядок `""`
- В базі зберігається `NULL`
- Неправильний формат (не кома-розділений)

**Рішення:**
- Backend обробляє обидва випадки (рядок та масив)
- Backend повертає `undefined` якщо images порожні

### 6. **Проблема: Більше 8 фото**
**Симптоми:**
- Деякі фото не відображаються

**Можливі причини:**
- В базі більше 8 URL
- Frontend обмежує до 8 фото

**Рішення:**
- Backend не обмежує кількість (повертає всі)
- Frontend може обмежити до 8 при відображенні

## 📋 Приклади валідних та невалідних URL

### ✅ Валідні URL:
```
https://files.alnair.ae/uploads/2024/10/ef/06/ef0643a74cc6edca13849020b5980e28.jpg
http://files.alnair.ae/uploads/2024/10/ef/06/ef0643a74cc6edca13849020b5980e28.jpg
```

### ❌ Невалідні URL (будуть відфільтровані):
```
files.alnair.ae/uploads/... (без http/https)
{https://files.alnair.ae/...} (з фігурними дужками)
"" (порожній рядок)
null
```

## 🔍 Як перевірити, що віддається

### 1. Перевірити в базі даних:
```sql
SELECT id, "nameEn", images 
FROM areas 
WHERE images IS NOT NULL 
LIMIT 5;
```

### 2. Перевірити через API:
```bash
curl -X GET "https://admin.foryou-realestate.com/api/public/data" \
  -H "x-api-key: YOUR_API_KEY" \
  -H "x-api-secret: YOUR_API_SECRET" \
  | jq '.data.areas[0].images'
```

### 3. Перевірити в коді:
```typescript
const response = await fetch('/api/public/data', {
  headers: {
    'x-api-key': 'YOUR_API_KEY',
    'x-api-secret': 'YOUR_API_SECRET'
  }
});
const data = await response.json();
const areas = data.data.areas;

areas.forEach(area => {
  console.log('Area:', area.nameEn);
  console.log('Images:', area.images);
  console.log('Images type:', typeof area.images);
  console.log('Is array:', Array.isArray(area.images));
  if (area.images && area.images.length > 0) {
    console.log('First image:', area.images[0]);
  }
});
```

## 🐛 Типові проблеми та рішення

### Проблема: `images` повертається як `null`
**Причина:** В базі `images` = `NULL` або порожній рядок
**Рішення:** Backend повертає `undefined` замість `null`

### Проблема: `images` повертається як рядок замість масиву
**Причина:** TypeORM не конвертував simple-array
**Рішення:** Backend обробляє обидва випадки (рядок та масив)

### Проблема: URL містять фігурні дужки
**Причина:** PostgreSQL array format `{url1,url2}`
**Рішення:** Backend видаляє фігурні дужки

### Проблема: Деякі URL невалідні
**Причина:** URL не починаються з `http://` або `https://`
**Рішення:** Backend фільтрує невалідні URL

## 📊 Статистика

**Поточний стан:**
- Всього areas: 144
- Areas з фото: 59
- Areas без фото: 85

**Формат URL:**
- Всі URL з `files.alnair.ae`
- Формат: `https://files.alnair.ae/uploads/YYYY/MM/XX/XX/XXXXXXXX.jpg`
- Максимум 8 фото на area (в базі може бути більше)

## ✅ Висновок

**Що віддається:**
- `images: string[] | undefined` - масив URL або undefined
- Масив містить тільки валідні URL (що починаються з `http://` або `https://`)
- Фігурні дужки видаляються автоматично
- Порожні URL відфільтровуються

**Потенційні проблеми:**
1. Файли не існують на `files.alnair.ae` (404)
2. CORS помилки (якщо домен не дозволяє)
3. Повільне завантаження (великі файли)
4. Деякі areas не мають фото (`images: undefined`)

**Рекомендації:**
- Додати fallback зображення на фронтенді
- Перевірити доступність файлів на `files.alnair.ae`
- Розглянути міграцію на CDN (Cloudinary) для кращої продуктивності
