# 🏠 Повний гайд API Properties для мобільного додатку

## 📍 Base URL
```
https://admin.foryou-realestate.com/api
```

---

## 🔑 Автентифікація

Properties API підтримує **два методи автентифікації**:

### 1. JWT Token (для авторизованих користувачів)
```
Authorization: Bearer <token>
```

### 2. API Key + Secret (для публічного доступу)
```
x-api-key: <api-key>
x-api-secret: <api-secret>
```

**Примітка:** Якщо передано обидва заголовки `x-api-key` та `x-api-secret`, використовується API Key автентифікація. Інакше - JWT.

---

## 📋 Endpoints

### 1. 📋 Отримати список properties (з фільтрами та пагінацією)
**GET** `/properties`

**Headers:**
```
Authorization: Bearer <token>
// АБО
x-api-key: <api-key>
x-api-secret: <api-secret>
Content-Type: application/json
```

**Query Parameters:**

| Параметр | Тип | Опис | Приклад |
|----------|-----|------|---------|
| `propertyType` | string | Тип нерухомості: `off-plan` або `secondary` | `?propertyType=off-plan` |
| `developerId` | UUID | ID девелопера | `?developerId=uuid-here` |
| `cityId` | UUID | ID міста | `?cityId=uuid-here` |
| `areaId` | UUID | ID району | `?areaId=uuid-here` |
| `bedrooms` | string | Кількість спалень (можна кілька через кому) | `?bedrooms=1,2,3` |
| `sizeFrom` | number | Мінімальний розмір (м²) | `?sizeFrom=50` |
| `sizeTo` | number | Максимальний розмір (м²) | `?sizeTo=200` |
| `priceFrom` | number | Мінімальна ціна (USD) | `?priceFrom=100000` |
| `priceTo` | number | Максимальна ціна (USD) | `?priceTo=500000` |
| `search` | string | Текстовий пошук (назва, опис) | `?search=dubai` |
| `sortBy` | string | Поле для сортування: `createdAt`, `name`, `price`, `priceFrom`, `size`, `sizeFrom` | `?sortBy=price` |
| `sortOrder` | string | Напрямок: `ASC` або `DESC` | `?sortOrder=ASC` |
| `page` | number | Номер сторінки (починається з 1) | `?page=1` |
| `limit` | number | Кількість на сторінці (макс. 100) | `?limit=20` |

**Приклади запитів:**

```bash
# Отримати всі off-plan properties
GET /api/properties?propertyType=off-plan&page=1&limit=20

# Фільтр по місту та кількості спалень
GET /api/properties?cityId=uuid-here&bedrooms=2,3&page=1&limit=20

# Пошук з сортуванням по ціні
GET /api/properties?search=dubai&sortBy=price&sortOrder=ASC&page=1&limit=20

# Фільтр по ціні та розміру
GET /api/properties?priceFrom=200000&priceTo=500000&sizeFrom=100&sizeTo=200&page=1&limit=20
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "data": [
      {
        "id": "f5f2c418-6cfe-4df6-8e28-9cd822c11861",
        "propertyType": "off-plan",
        "name": "Luxury Residences",
        "description": "Beautiful luxury apartments...",
        "photos": [
          "https://example.com/photo1.jpg",
          "https://example.com/photo2.jpg"
        ],
        "country": {
          "id": "uuid",
          "nameEn": "United Arab Emirates",
          "nameRu": "ОАЭ",
          "nameAr": "الإمارات العربية المتحدة",
          "code": "AE"
        },
        "city": {
          "id": "uuid",
          "nameEn": "Dubai",
          "nameRu": "Дубай",
          "nameAr": "دبي"
        },
        "area": "JVC, Dubai",
        "developer": {
          "id": "uuid",
          "name": "Emaar Properties"
        },
        "latitude": 25.2048,
        "longitude": 55.2708,
        "priceFrom": 500000,
        "priceFromAED": 1836500,
        "bedroomsFrom": 1,
        "bedroomsTo": 3,
        "bathroomsFrom": 1,
        "bathroomsTo": 3,
        "sizeFrom": 50,
        "sizeTo": 150,
        "sizeFromSqft": 538.2,
        "sizeToSqft": 1614.6,
        "paymentPlan": "70/30",
        "units": [
          {
            "id": "uuid",
            "unitId": "A-101",
            "type": "apartment",
            "price": 500000,
            "priceAED": 1836500,
            "totalSize": 50,
            "totalSizeSqft": 538.2,
            "balconySize": 5,
            "balconySizeSqft": 53.82,
            "planImage": "https://example.com/plan.jpg"
          }
        ],
        "facilities": [
          {
            "id": "uuid",
            "nameEn": "Swimming Pool",
            "nameRu": "Бассейн",
            "nameAr": "مسبح",
            "iconName": "pool"
          }
        ],
        "createdAt": "2024-01-01T00:00:00.000Z",
        "updatedAt": "2024-01-01T00:00:00.000Z"
      },
      {
        "id": "b9177578-bcbf-4d6e-8f0e-1aa8977fd4d0",
        "propertyType": "secondary",
        "name": "Modern Apartment",
        "description": "Spacious modern apartment...",
        "photos": [
          "https://example.com/photo3.jpg"
        ],
        "country": {
          "id": "uuid",
          "nameEn": "United Arab Emirates",
          "nameRu": "ОАЭ",
          "nameAr": "الإمارات العربية المتحدة",
          "code": "AE"
        },
        "city": {
          "id": "uuid",
          "nameEn": "Dubai",
          "nameRu": "Дубай",
          "nameAr": "دبي"
        },
        "area": {
          "id": "uuid",
          "nameEn": "Downtown Dubai",
          "nameRu": "Даунтаун Дубай",
          "nameAr": "دبي داون تاون"
        },
        "developer": null,
        "latitude": 25.1972,
        "longitude": 55.2744,
        "price": 750000,
        "priceAED": 2754750,
        "bedrooms": 2,
        "bathrooms": 2,
        "size": 120,
        "sizeSqft": 1291.68,
        "facilities": [
          {
            "id": "uuid",
            "nameEn": "Gym",
            "nameRu": "Спортзал",
            "nameAr": "صالة ألعاب رياضية",
            "iconName": "gym"
          }
        ],
        "createdAt": "2024-01-01T00:00:00.000Z",
        "updatedAt": "2024-01-01T00:00:00.000Z"
      }
    ],
    "pagination": {
      "total": 150,
      "page": 1,
      "limit": 20,
      "totalPages": 8
    }
  }
}
```

**Важливі відмінності між off-plan та secondary:**

- **Off-plan:**
  - `area` - рядок у форматі `"areaName, cityName"` (наприклад: `"JVC, Dubai"`)
  - Використовує `priceFrom`, `bedroomsFrom`, `bedroomsTo`, `sizeFrom`, `sizeTo`
  - Може мати `units` (одиниці)
  - Може мати `paymentPlan`

- **Secondary:**
  - `area` - об'єкт з `id`, `nameEn`, `nameRu`, `nameAr`
  - Використовує `price`, `bedrooms`, `bathrooms`, `size` (одне значення)
  - Не має `units`
  - Не має `paymentPlan`

**Конвертації валют та одиниць:**
- `priceAED` = `price` або `priceFrom` × 3.673 (USD → AED)
- `sizeSqft` = `size` або `sizeFrom` × 10.764 (м² → sqft)

---

### 2. 🏠 Отримати property за ID
**GET** `/properties/:id`

**Headers:**
```
Authorization: Bearer <token>
// АБО
x-api-key: <api-key>
x-api-secret: <api-secret>
Content-Type: application/json
```

**Приклад:**
```bash
GET /api/properties/f5f2c418-6cfe-4df6-8e28-9cd822c11861
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "f5f2c418-6cfe-4df6-8e28-9cd822c11861",
    "propertyType": "off-plan",
    "name": "Luxury Residences",
    "description": "Beautiful luxury apartments...",
    "photos": [
      "https://example.com/photo1.jpg",
      "https://example.com/photo2.jpg"
    ],
    "country": {
      "id": "uuid",
      "nameEn": "United Arab Emirates",
      "nameRu": "ОАЭ",
      "nameAr": "الإمارات العربية المتحدة",
      "code": "AE"
    },
    "city": {
      "id": "uuid",
      "nameEn": "Dubai",
      "nameRu": "Дубай",
      "nameAr": "دبي"
    },
    "area": {
      "id": "uuid",
      "nameEn": "JVC",
      "nameRu": "ДЖВК",
      "nameAr": "جفك"
    },
    "developer": {
      "id": "uuid",
      "name": "Emaar Properties",
      "logo": "https://example.com/logo.jpg",
      "description": "Leading developer..."
    },
    "latitude": 25.2048,
    "longitude": 55.2708,
    "priceFrom": 500000,
    "bedroomsFrom": 1,
    "bedroomsTo": 3,
    "bathroomsFrom": 1,
    "bathroomsTo": 3,
    "sizeFrom": 50,
    "sizeTo": 150,
    "paymentPlan": "70/30",
    "units": [
      {
        "id": "uuid",
        "unitId": "A-101",
        "type": "apartment",
        "price": 500000,
        "totalSize": 50,
        "balconySize": 5,
        "planImage": "https://example.com/plan.jpg"
      }
    ],
    "facilities": [
      {
        "id": "uuid",
        "nameEn": "Swimming Pool",
        "nameRu": "Бассейн",
        "nameAr": "مسبح",
        "iconName": "pool"
      }
    ],
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

**Response (404):**
```json
{
  "success": false,
  "message": "Property not found"
}
```

---

### 3. 📊 Отримати статистику properties
**GET** `/properties/stats`

**Headers:**
```
Authorization: Bearer <token>
// АБО
x-api-key: <api-key>
x-api-secret: <api-secret>
Content-Type: application/json
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "totalProperties": 150,
    "offPlanProperties": 100,
    "secondaryProperties": 50,
    "minPrice": 100000,
    "maxPrice": 5000000,
    "topCities": [
      {
        "name": "Dubai",
        "count": 80
      },
      {
        "name": "Abu Dhabi",
        "count": 50
      }
    ],
    "bedroomsDistribution": [
      {
        "name": "1-2 Beds",
        "count": 30
      },
      {
        "name": "3-4 Beds",
        "count": 50
      }
    ],
    "unitTypesDistribution": [
      {
        "name": "Apartment",
        "count": 60
      },
      {
        "name": "Villa",
        "count": 40
      }
    ]
  }
}
```

---

### 4. 📦 Отримати всі дані (properties + довідники)
**GET** `/public/data`

**Headers:**
```
x-api-key: <api-key>
x-api-secret: <api-secret>
Content-Type: application/json
```

**Примітка:** Цей endpoint повертає **всі** properties та довідники (countries, cities, areas, developers, facilities, courses) одним запитом. Використовується для початкового завантаження додатку.

**Response (200):**
```json
{
  "success": true,
  "data": {
    "properties": [
      // ... масив properties (формат такий самий як у GET /properties)
    ],
    "countries": [
      {
        "id": "uuid",
        "nameEn": "United Arab Emirates",
        "nameRu": "ОАЭ",
        "nameAr": "الإمارات العربية المتحدة",
        "code": "AE"
      }
    ],
    "cities": [
      {
        "id": "uuid",
        "nameEn": "Dubai",
        "nameRu": "Дубай",
        "nameAr": "دبي",
        "countryId": "uuid",
        "country": {
          "id": "uuid",
          "nameEn": "United Arab Emirates",
          "code": "AE"
        }
      }
    ],
    "areas": [
      {
        "id": "uuid",
        "nameEn": "Downtown Dubai",
        "nameRu": "Даунтаун Дубай",
        "nameAr": "دبي داون تاون",
        "cityId": "uuid",
        "city": {
          "id": "uuid",
          "nameEn": "Dubai",
          "country": {
            "id": "uuid",
            "nameEn": "United Arab Emirates",
            "code": "AE"
          }
        },
        "description": "Area description...",
        "infrastructure": "Infrastructure info...",
        "images": ["https://example.com/area1.jpg"]
      }
    ],
    "developers": [
      {
        "id": "uuid",
        "name": "Emaar Properties",
        "logo": "https://example.com/logo.jpg",
        "description": "Leading developer...",
        "createdAt": "2024-01-01T00:00:00.000Z"
      }
    ],
    "facilities": [
      {
        "id": "uuid",
        "nameEn": "Swimming Pool",
        "nameRu": "Бассейн",
        "nameAr": "مسبح",
        "iconName": "pool",
        "createdAt": "2024-01-01T00:00:00.000Z"
      }
    ],
    "courses": [
      {
        "id": "uuid",
        "title": "Real Estate Basics",
        "description": "Learn the basics...",
        "order": 1,
        "contents": [
          {
            "id": "uuid",
            "type": "text",
            "title": "Introduction",
            "description": "Content description...",
            "imageUrl": null,
            "videoUrl": null,
            "order": 1
          }
        ],
        "links": [
          {
            "id": "uuid",
            "title": "External Link",
            "url": "https://example.com",
            "order": 1
          }
        ],
        "createdAt": "2024-01-01T00:00:00.000Z",
        "updatedAt": "2024-01-01T00:00:00.000Z"
      }
    ],
    "meta": {
      "totalProperties": 150,
      "totalSecondaryProperties": 50,
      "totalOffPlanProperties": 100,
      "totalCountries": 1,
      "totalCities": 2,
      "totalAreas": 10,
      "totalDevelopers": 5,
      "totalFacilities": 20,
      "totalCourses": 3,
      "lastUpdated": "2024-01-01T00:00:00.000Z"
    }
  }
}
```

---

## 📝 Типи даних

### PropertyType
```typescript
enum PropertyType {
  OFF_PLAN = 'off-plan',
  SECONDARY = 'secondary',
}
```

### Property (Off-Plan)
```typescript
interface OffPlanProperty {
  id: string;
  propertyType: 'off-plan';
  name: string;
  description: string;
  photos: string[];
  country: Country;
  city: City;
  area: string; // "areaName, cityName"
  developer: Developer | null;
  latitude: number;
  longitude: number;
  priceFrom: number;
  priceFromAED: number;
  bedroomsFrom: number;
  bedroomsTo: number;
  bathroomsFrom: number;
  bathroomsTo: number;
  sizeFrom: number;
  sizeTo: number;
  sizeFromSqft: number;
  sizeToSqft: number;
  paymentPlan: string | null;
  units: PropertyUnit[];
  facilities: Facility[];
  createdAt: string;
  updatedAt: string;
}
```

### Property (Secondary)
```typescript
interface SecondaryProperty {
  id: string;
  propertyType: 'secondary';
  name: string;
  description: string;
  photos: string[];
  country: Country;
  city: City;
  area: {
    id: string;
    nameEn: string;
    nameRu: string;
    nameAr: string;
  };
  developer: null;
  latitude: number;
  longitude: number;
  price: number;
  priceAED: number;
  bedrooms: number;
  bathrooms: number;
  size: number;
  sizeSqft: number;
  facilities: Facility[];
  createdAt: string;
  updatedAt: string;
}
```

### Country
```typescript
interface Country {
  id: string;
  nameEn: string;
  nameRu: string;
  nameAr: string;
  code: string;
}
```

### City
```typescript
interface City {
  id: string;
  nameEn: string;
  nameRu: string;
  nameAr: string;
  countryId: string;
  country?: Country;
}
```

### Area
```typescript
interface Area {
  id: string;
  nameEn: string;
  nameRu: string;
  nameAr: string;
  cityId: string;
  city?: City;
  description?: string | null;
  infrastructure?: string | null;
  images?: string[] | null;
}
```

### Developer
```typescript
interface Developer {
  id: string;
  name: string;
  logo: string | null;
  description: string | null;
  createdAt: string;
}
```

### Facility
```typescript
interface Facility {
  id: string;
  nameEn: string;
  nameRu: string;
  nameAr: string;
  iconName: string;
}
```

### PropertyUnit
```typescript
interface PropertyUnit {
  id: string;
  unitId: string;
  type: string;
  price: number;
  priceAED: number;
  totalSize: number;
  totalSizeSqft: number;
  balconySize: number | null;
  balconySizeSqft: number | null;
  planImage: string | null;
}
```

---

## 💻 Приклади коду

### React Native / Expo

```typescript
// Константи
const API_BASE_URL = 'https://admin.foryou-realestate.com/api';

// Типи
export interface Property {
  id: string;
  propertyType: 'off-plan' | 'secondary';
  name: string;
  description: string;
  photos: string[];
  country: Country;
  city: City;
  area: string | Area;
  developer: Developer | null;
  latitude: number;
  longitude: number;
  // Off-plan fields
  priceFrom?: number;
  priceFromAED?: number;
  bedroomsFrom?: number;
  bedroomsTo?: number;
  bathroomsFrom?: number;
  bathroomsTo?: number;
  sizeFrom?: number;
  sizeTo?: number;
  sizeFromSqft?: number;
  sizeToSqft?: number;
  paymentPlan?: string | null;
  units?: PropertyUnit[];
  // Secondary fields
  price?: number;
  priceAED?: number;
  bedrooms?: number;
  bathrooms?: number;
  size?: number;
  sizeSqft?: number;
  facilities: Facility[];
  createdAt: string;
  updatedAt: string;
}

export interface PropertiesResponse {
  success: boolean;
  data: {
    data: Property[];
    pagination: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    };
  };
}

// 1. Отримати список properties
export const getProperties = async (
  filters: {
    propertyType?: 'off-plan' | 'secondary';
    developerId?: string;
    cityId?: string;
    areaId?: string;
    bedrooms?: string; // "1,2,3"
    sizeFrom?: number;
    sizeTo?: number;
    priceFrom?: number;
    priceTo?: number;
    search?: string;
    sortBy?: string;
    sortOrder?: 'ASC' | 'DESC';
    page?: number;
    limit?: number;
  },
  token?: string
): Promise<PropertiesResponse> => {
  const queryParams = new URLSearchParams();
  
  if (filters.propertyType) queryParams.append('propertyType', filters.propertyType);
  if (filters.developerId) queryParams.append('developerId', filters.developerId);
  if (filters.cityId) queryParams.append('cityId', filters.cityId);
  if (filters.areaId) queryParams.append('areaId', filters.areaId);
  if (filters.bedrooms) queryParams.append('bedrooms', filters.bedrooms);
  if (filters.sizeFrom) queryParams.append('sizeFrom', filters.sizeFrom.toString());
  if (filters.sizeTo) queryParams.append('sizeTo', filters.sizeTo.toString());
  if (filters.priceFrom) queryParams.append('priceFrom', filters.priceFrom.toString());
  if (filters.priceTo) queryParams.append('priceTo', filters.priceTo.toString());
  if (filters.search) queryParams.append('search', filters.search);
  if (filters.sortBy) queryParams.append('sortBy', filters.sortBy);
  if (filters.sortOrder) queryParams.append('sortOrder', filters.sortOrder);
  queryParams.append('page', (filters.page || 1).toString());
  queryParams.append('limit', (filters.limit || 20).toString());

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}/properties?${queryParams.toString()}`, {
    method: 'GET',
    headers,
  });

  const data = await response.json();

  if (!data.success) {
    throw new Error(data.message || 'Failed to fetch properties');
  }

  return data;
};

// 2. Отримати property за ID
export const getPropertyById = async (
  id: string,
  token?: string
): Promise<{ success: boolean; data: Property }> => {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}/properties/${id}`, {
    method: 'GET',
    headers,
  });

  const data = await response.json();

  if (!data.success) {
    throw new Error(data.message || 'Property not found');
  }

  return data;
};

// 3. Отримати статистику
export const getPropertiesStats = async (
  token?: string
): Promise<any> => {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}/properties/stats`, {
    method: 'GET',
    headers,
  });

  const data = await response.json();

  if (!data.success) {
    throw new Error(data.message || 'Failed to fetch stats');
  }

  return data.data;
};

// 4. Отримати всі дані (з API Key)
export const getAllData = async (
  apiKey: string,
  apiSecret: string
): Promise<any> => {
  const response = await fetch(`${API_BASE_URL}/public/data`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'x-api-secret': apiSecret,
    },
  });

  const data = await response.json();

  if (!data.success) {
    throw new Error(data.message || 'Failed to fetch data');
  }

  return data.data;
};
```

---

## 🎯 Важливі моменти

1. **Пагінація:** Завжди використовуйте `page` та `limit` для отримання properties. Максимальний `limit` = 100.

2. **Фільтр bedrooms:** Можна передати кілька значень через кому: `?bedrooms=1,2,3`

3. **Off-plan vs Secondary:**
   - Off-plan: `area` - рядок, використовує `priceFrom`, `bedroomsFrom/To`, `sizeFrom/To`
   - Secondary: `area` - об'єкт, використовує `price`, `bedrooms`, `size`

4. **Конвертації:** API автоматично додає `priceAED` та `sizeSqft` для зручності.

5. **Автентифікація:** 
   - JWT для авторизованих користувачів
   - API Key/Secret для публічного доступу

6. **Infinite Scroll:** Використовуйте пагінацію для реалізації infinite scroll:
   ```typescript
   let page = 1;
   const loadMore = async () => {
     const response = await getProperties({ page, limit: 20 }, token);
     // Додати до списку
     page++;
   };
   ```

---

## ✅ Чек-лист для інтеграції

- [ ] Налаштувати Base URL: `https://admin.foryou-realestate.com/api`
- [ ] Реалізувати автентифікацію (JWT або API Key/Secret)
- [ ] Реалізувати GET `/properties` з фільтрами
- [ ] Реалізувати GET `/properties/:id` для деталей
- [ ] Реалізувати пагінацію (infinite scroll)
- [ ] Обробити різницю між off-plan та secondary properties
- [ ] Використовувати конвертації валют (AED) та одиниць (sqft)
- [ ] Реалізувати фільтри (city, area, bedrooms, price, size)
- [ ] Реалізувати пошук (search)
- [ ] Реалізувати сортування
- [ ] Обробити помилки (404, 401, 500)

---

**Готово до використання! 🚀**

