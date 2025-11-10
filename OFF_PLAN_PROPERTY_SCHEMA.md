# Схема Off-Plan Property

## Повна структура даних для Off-Plan Property

```typescript
interface OffPlanProperty {
  // Базові поля
  id: string;                    // UUID
  propertyType: "off-plan";     // Тип нерухомості
  name: string;                  // Назва проекту
  description: string;          // Опис проекту (HTML/text)
  
  // Локація
  country: {
    id: string;                 // UUID
    nameEn: string;             // Назва англійською
    nameRu: string;             // Назва російською
    nameAr: string;             // Назва арабською
    code: string;               // Код країни (наприклад, "AE")
  };
  
  city: {
    id: string;                 // UUID
    nameEn: string;             // Назва англійською
    nameRu: string;             // Назва російською
    nameAr: string;             // Назва арабською
    countryId: string;          // UUID країни
  };
  
  area: string;                 // Для off-plan: "areaName, cityName" (наприклад "JVC, Dubai")
  // Або як об'єкт (якщо потрібно):
  // area: {
  //   id: string;               // UUID
  //   nameEn: string;          // Назва англійською
  //   nameRu: string;          // Назва російською
  //   nameAr: string;          // Назва арабською
  //   cityId: string;          // UUID міста
  //   description?: {          // Опціонально
  //     title?: string;
  //     description?: string;
  //   };
  //   infrastructure?: {       // Опціонально
  //     title?: string;
  //     description?: string;
  //   };
  //   images?: string[];        // Масив URL фото району
  // };
  
  // Координати
  latitude: number;             // Широта (decimal, precision: 10, scale: 8)
  longitude: number;            // Довгота (decimal, precision: 11, scale: 8)
  
  // Developer
  developer: {
    id: string;                 // UUID
    name: string;               // Назва девелопера
    logo?: string | null;       // URL логотипу
    description?: string | null; // Опис девелопера
    images?: string[] | null;   // Масив URL фото девелопера
  } | null;
  
  // Фото проекту (детальна структура)
  photos: Array<{
    id: number;                 // ID фото (якщо є)
    src: string;                // URL фото (обов'язково)
    type: "photo" | "video";    // Тип медіа
    logo?: string | null;        // URL логотипу (якщо є)
    alt?: string;                // Alt текст
    title?: string;              // Заголовок фото
    category?: string;           // Категорія фото
  }>;
  
  // Off-Plan специфічні поля
  priceFrom: number;            // Ціна від (USD, decimal, precision: 15, scale: 2)
  priceFromAED?: number;        // Ціна від в AED (конвертована)
  
  bedroomsFrom?: number;         // Кількість спалень від (int)
  bedroomsTo?: number;          // Кількість спалень до (int)
  
  bathroomsFrom?: number;       // Кількість ванних від (int)
  bathroomsTo?: number;         // Кількість ванних до (int)
  
  sizeFrom?: number;            // Площа від (м², decimal, precision: 10, scale: 2)
  sizeTo?: number;              // Площа до (м², decimal, precision: 10, scale: 2)
  sizeFromSqft?: number;       // Площа від в sqft (конвертована)
  sizeToSqft?: number;         // Площа до в sqft (конвертована)
  
  paymentPlan?: string | null;  // План оплати (text)
  
  // Units (опціонально, якщо є)
  units?: Array<{
    id: string;                 // UUID
    unitId: string;             // ID юніту
    type: "apartment" | "villa" | "penthouse" | "townhouse" | "office";
    price: number;              // Ціна (USD, decimal, precision: 15, scale: 2)
    priceAED?: number;          // Ціна в AED (конвертована)
    totalSize: number;          // Загальна площа (м², decimal, precision: 10, scale: 2)
    totalSizeSqft?: number;    // Загальна площа в sqft (конвертована)
    balconySize?: number | null; // Площа балкону (м²)
    balconySizeSqft?: number | null; // Площа балкону в sqft (конвертована)
    planImage?: string | null;  // URL плану юніту
  }>;
  
  // Facilities (опціонально, якщо є)
  facilities?: Array<{
    id: string;                 // UUID
    nameEn: string;             // Назва англійською
    nameRu: string;             // Назва російською
    nameAr: string;             // Назва арабською
    iconName?: string;          // Назва іконки
  }>;
  
  // Метадані
  createdAt: string;            // ISO date string
  updatedAt: string;            // ISO date string
}
```

## Приклад повної відповіді

```json
{
  "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "propertyType": "off-plan",
  "name": "Emaar Beachfront",
  "description": "<p>Luxury waterfront development in Dubai...</p>",
  
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
    "nameAr": "دبي",
    "countryId": "uae-uuid"
  },
  
  "area": "Dubai Marina, Dubai",
  
  "latitude": 25.0772,
  "longitude": 55.1394,
  
  "developer": {
    "id": "emaar-uuid",
    "name": "Emaar Properties",
    "logo": "https://files.alnair.ae/uploads/2025/7/ad/01/logo.jpg",
    "description": "Leading developer in Dubai...",
    "images": [
      "https://files.alnair.ae/uploads/2025/7/ad/01/image1.jpg"
    ]
  },
  
  "photos": [
    {
      "id": 329136,
      "src": "https://files.alnair.ae/uploads/gallery_photo/2025/3/25/01/2501244f39e02046cc6ccbacedaf9c24.jpg",
      "type": "photo",
      "logo": null,
      "alt": "Emaar Beachfront exterior",
      "title": "Main Building",
      "category": "exterior"
    },
    {
      "id": 329137,
      "src": "https://files.alnair.ae/uploads/gallery_photo/2025/3/25/02/image2.jpg",
      "type": "photo",
      "logo": null,
      "alt": "Interior view",
      "title": "Luxury Interior",
      "category": "interior"
    }
  ],
  
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
      "priceAED": 2020150,
      "totalSize": 75.5,
      "totalSizeSqft": 812.85,
      "balconySize": 10.0,
      "balconySizeSqft": 107.64,
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
```

## Важливі примітки

### 1. Photos структура
- **Поточна реалізація в БД**: `photos` зберігається як `simple-array` (string[])
- **Очікувана структура для API**: масив об'єктів з детальною інформацією
- **Рекомендація**: Якщо photos в БД зберігаються як рядки, потрібно трансформувати їх в об'єкти при поверненні з API

### 2. Area для off-plan
- **Поточна реалізація**: повертається як рядок `"areaName, cityName"`
- **Альтернатива**: можна повертати як об'єкт з повною інформацією про район

### 3. Обов'язкові поля для off-plan
- `id`, `propertyType`, `name`, `description`
- `country`, `city`, `area`
- `latitude`, `longitude`
- `priceFrom` (обов'язково для off-plan)
- `photos` (масив, може бути порожнім)

### 4. Опціональні поля
- `developer` (може бути null)
- `bedroomsFrom/To`, `bathroomsFrom/To` (діапазони)
- `sizeFrom/To` (діапазони площі)
- `paymentPlan`
- `units` (масив юнітів)
- `facilities` (масив зручностей)

### 5. Конвертації
- `priceFromAED` = `priceFrom * 3.673` (USD to AED)
- `sizeFromSqft` = `sizeFrom * 10.764` (м² to sqft)
- `sizeToSqft` = `sizeTo * 10.764` (м² to sqft)

## API Endpoints

### GET /api/properties?propertyType=off-plan
Повертає список off-plan properties з пагінацією

### GET /api/properties/:id
Повертає детальну інформацію про конкретний off-plan property з усіма полями

