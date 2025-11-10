# Фінальна схема Off-Plan Property (API Response)

## Повна структура відповіді API для Off-Plan Property

### Endpoint: `GET /api/public/data` або `GET /api/properties?propertyType=off-plan`

```typescript
interface OffPlanPropertyResponse {
  // Базові поля
  id: string;                          // UUID
  propertyType: "off-plan";            // Тип нерухомості
  name: string;                        // Назва проекту
  description: string;                 // Опис проекту (HTML/text)
  
  // Фото (масив URL рядків)
  photos: string[];                   // Масив URL фото (наприклад: ["https://...", "https://..."])
  
  // Локація
  country: {
    id: string;                       // UUID
    nameEn: string;                   // Назва англійською
    nameRu: string;                   // Назва російською
    nameAr: string;                   // Назва арабською
    code: string;                     // Код країни (наприклад, "AE")
  } | null;
  
  city: {
    id: string;                       // UUID
    nameEn: string;                   // Назва англійською
    nameRu: string;                   // Назва російською
    nameAr: string;                   // Назва арабською
  } | null;
  
  area: string | null;                // Для off-plan: рядок "areaName, cityName" (наприклад "Dubai Marina, Dubai")
  
  // Координати
  latitude: number;                   // Широта (decimal, precision: 10, scale: 8)
  longitude: number;                  // Довгота (decimal, precision: 11, scale: 8)
  
  // Developer
  developer: {
    id: string;                       // UUID
    name: string;                     // Назва девелопера
  } | null;
  
  // Off-Plan специфічні поля
  priceFrom: number | null;           // Ціна від (USD, decimal, precision: 15, scale: 2)
  priceFromAED: number | null;        // Ціна від в AED (конвертована автоматично)
  
  bedroomsFrom: number | null;        // Кількість спалень від (int)
  bedroomsTo: number | null;          // Кількість спалень до (int)
  
  bathroomsFrom: number | null;       // Кількість ванних від (int)
  bathroomsTo: number | null;         // Кількість ванних до (int)
  
  sizeFrom: number | null;            // Площа від (м², decimal, precision: 10, scale: 2)
  sizeTo: number | null;               // Площа до (м², decimal, precision: 10, scale: 2)
  sizeFromSqft: number | null;        // Площа від в sqft (конвертована автоматично)
  sizeToSqft: number | null;           // Площа до в sqft (конвертована автоматично)
  
  paymentPlan: string | null;         // План оплати (text)
  
  // Units (опціонально, якщо є)
  units: Array<{
    id: string;                       // UUID
    unitId: string;                   // ID юніту
    type: "apartment" | "villa" | "penthouse" | "townhouse" | "office";
    price: number;                    // Ціна (USD)
    totalSize: number;                // Загальна площа (м²)
    balconySize: number | null;       // Площа балкону (м²)
    planImage: string | null;         // URL плану юніту
  }> | null;
  
  // Facilities (опціонально, якщо є)
  facilities: Array<{
    id: string;                       // UUID
    nameEn: string;                   // Назва англійською
    nameRu: string;                   // Назва російською
    nameAr: string;                   // Назва арабською
    iconName: string | null;          // Назва іконки
  }> | [];
  
  // Метадані
  createdAt: string;                  // ISO date string
  updatedAt: string;                  // ISO date string
}
```

## Приклад реальної відповіді API

```json
{
  "success": true,
  "data": {
    "data": [
      {
        "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
        "propertyType": "off-plan",
        "name": "Emaar Beachfront",
        "description": "<p>Luxury waterfront development in Dubai...</p>",
        "photos": [
          "https://files.alnair.ae/uploads/gallery_photo/2025/7/27/1e/271e3c997873c5eb3c047085278446ba.png",
          "https://files.alnair.ae/uploads/gallery_photo/2024/8/1a/b6/1ab683947fe031e0995e4bca43a13402.jpg",
          "https://files.alnair.ae/uploads/gallery_photo/2024/8/25/cb/25cb8963181562b2a72f58eb15630acd.jpg"
        ],
        "country": {
          "id": "uae-uuid",
          "nameEn": "United Arab Emirates",
          "nameRu": "Объединенные Арабские Эмираты",
          "nameAr": "الإمارات العربية المتحدة",
          "code": "AE"
        },
        "city": {
          "id": "dubai-uuid",
          "nameEn": "Dubai",
          "nameRu": "Дубай",
          "nameAr": "دبي"
        },
        "area": "Dubai Marina, Dubai",
        "latitude": 25.0772,
        "longitude": 55.1394,
        "developer": {
          "id": "emaar-uuid",
          "name": "Emaar Properties"
        },
        "priceFrom": 500000,
        "priceFromAED": 1836500,
        "bedroomsFrom": 1,
        "bedroomsTo": 4,
        "bathroomsFrom": 1,
        "bathroomsTo": 3,
        "sizeFrom": 50.5,
        "sizeTo": 200.0,
        "sizeFromSqft": 543.75,
        "sizeToSqft": 2152.78,
        "paymentPlan": "80/20 - 10% down payment, 70% during construction, 20% on handover",
        "units": [
          {
            "id": "unit-uuid-1",
            "unitId": "A-101",
            "type": "apartment",
            "price": 550000,
            "totalSize": 75.5,
            "balconySize": 10.0,
            "planImage": "https://files.alnair.ae/uploads/plans/unit-a101.jpg"
          }
        ],
        "facilities": [
          {
            "id": "facility-uuid-1",
            "nameEn": "Swimming Pool",
            "nameRu": "Бассейн",
            "nameAr": "مسبح",
            "iconName": "pool"
          },
          {
            "id": "facility-uuid-2",
            "nameEn": "Gym",
            "nameRu": "Спортзал",
            "nameAr": "صالة رياضية",
            "iconName": "gym"
          }
        ],
        "createdAt": "2025-01-15T10:30:00.000Z",
        "updatedAt": "2025-11-10T14:20:00.000Z"
      }
    ],
    "total": 959,
    "page": 1,
    "limit": 20
  }
}
```

## Важливі деталі реалізації

### 1. Photos
- **В БД**: зберігається як `simple-array` (TypeORM) - текст з комами як роздільниками
- **В API**: повертається як `string[]` - масив URL рядків
- **Приклад в БД**: `"url1,url2,url3"` (текст)
- **Приклад в API**: 
  ```json
  [
    "https://files.alnair.ae/uploads/gallery_photo/2025/7/27/1e/271e3c997873c5eb3c047085278446ba.png",
    "https://files.alnair.ae/uploads/gallery_photo/2024/8/1a/b6/1ab683947fe031e0995e4bca43a13402.jpg",
    "https://files.alnair.ae/uploads/gallery_photo/2024/8/25/cb/25cb8963181562b2a72f58eb15630acd.jpg"
  ]
  ```
- **TypeORM автоматично конвертує** текст з комами в масив при читанні з БД

### 2. Area
- **В БД**: зберігається як `areaId` (UUID) з зв'язком до таблиці `areas`
- **В API для off-plan**: повертається як **рядок** у форматі `"areaName, cityName"`
- **В API для secondary**: повертається як об'єкт з `id`, `nameEn`, `nameRu`, `nameAr`
- **Приклад для off-plan**: `"Dubai Marina, Dubai"`
- **Приклад для secondary**: 
  ```json
  {
    "id": "area-uuid",
    "nameEn": "Dubai Marina",
    "nameRu": "Дубай Марина",
    "nameAr": "دبي مارينا"
  }
  ```

### 3. Автоматичні конвертації
API автоматично додає конвертовані значення:
- **priceFromAED** = `priceFrom * 3.673` (USD → AED)
- **sizeFromSqft** = `sizeFrom * 10.764` (м² → sqft)
- **sizeToSqft** = `sizeTo * 10.764` (м² → sqft)

### 4. Обов'язкові поля для off-plan
- ✅ `id`, `propertyType`, `name`, `description`
- ✅ `country`, `city`, `area` (об'єкти або null)
- ✅ `latitude`, `longitude`
- ✅ `priceFrom` (обов'язково для off-plan)
- ✅ `photos` (масив, може бути порожнім)

### 5. Опціональні поля
- `developer` (може бути `null`)
- `bedroomsFrom/To`, `bathroomsFrom/To` (діапазони, можуть бути `null`)
- `sizeFrom/To` (діапазони площі, можуть бути `null`)
- `paymentPlan` (може бути `null`)
- `units` (масив юнітів, може бути `null` або порожнім)
- `facilities` (масив зручностей, може бути порожнім `[]`)

### 6. Типи даних в БД
- `id`: UUID (string)
- `propertyType`: enum ('off-plan' | 'secondary')
- `name`: varchar
- `description`: text
- `photos`: simple-array (string[])
- `latitude`: decimal(10,8)
- `longitude`: decimal(11,8)
- `priceFrom`: decimal(15,2) nullable
- `bedroomsFrom/To`: int nullable
- `bathroomsFrom/To`: int nullable
- `sizeFrom/To`: decimal(10,2) nullable
- `paymentPlan`: text nullable

## API Endpoints

### GET /api/public/data?propertyType=off-plan
Повертає список off-plan properties з пагінацією:
- `page` (query param): номер сторінки (default: 1)
- `limit` (query param): кількість на сторінці (default: 20, max: 100)

**Response:**
```json
{
  "success": true,
  "data": {
    "data": [...properties...],
    "total": 959,
    "page": 1,
    "limit": 20
  }
}
```

### GET /api/properties/:id
Повертає детальну інформацію про конкретний off-plan property з усіма полями

## Фільтрація та сортування

### Доступні фільтри (query params):
- `propertyType=off-plan` - фільтр по типу
- `cityId=uuid` - фільтр по місту
- `areaId=uuid` - фільтр по району
- `developerId=uuid` - фільтр по девелоперу
- `bedroomsFrom=1` - мінімальна кількість спалень
- `bedroomsTo=4` - максимальна кількість спалень
- `priceFrom=100000` - мінімальна ціна
- `priceTo=1000000` - максимальна ціна

### Сортування:
- За замовчуванням: за `createdAt DESC` (новіші спочатку)

## Статистика

**Поточна кількість off-plan properties в БД:** 959

**Розподіл по areas:** 70 різних areas

**Всі дані мають:**
- ✅ Правильні areas (зв'язані з таблицею areas)
- ✅ Фото (масив URL)
- ✅ Координати (latitude, longitude)
- ✅ Developers (якщо є)
- ✅ Всі обов'язкові поля

