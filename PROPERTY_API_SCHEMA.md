# Повна схема даних Property API

## Загальна структура відповіді

```typescript
interface ApiResponse {
  success: boolean;
  message: string;
  data: Property;
}
```

---

## Property - Повна схема

### Базові поля (для обох типів)

```typescript
interface PropertyBase {
  // Ідентифікація
  id: string;                    // UUID
  propertyType: 'off-plan' | 'secondary';
  name: string;
  
  // Медіа
  photos: string[];               // Масив URL фото
  
  // Локація (ID)
  countryId: string;              // UUID
  cityId: string;                 // UUID
  areaId: string;                 // UUID
  
  // Координати
  latitude: string;               // Decimal як string: "25.11280000"
  longitude: string;              // Decimal як string: "55.13900000"
  
  // Опис
  description: string;
  
  // Developer (опціонально)
  developerId: string | null;     // UUID або null
  
  // Timestamps
  createdAt: string;              // ISO 8601: "2025-11-27T11:53:31.824Z"
  updatedAt: string;              // ISO 8601: "2025-11-27T11:53:31.966Z"
}
```

### Off-Plan Property (додаткові поля)

```typescript
interface OffPlanProperty extends PropertyBase {
  propertyType: 'off-plan';
  
  // Ціна та розміри (діапазони)
  priceFrom: string;              // Decimal як string: "1200000.00"
  bedroomsFrom: number;           // Integer: 2
  bedroomsTo: number;             // Integer: 4
  bathroomsFrom: number;          // Integer: 2
  bathroomsTo: number;            // Integer: 4
  sizeFrom: string;               // Decimal як string: "150.00"
  sizeTo: string;                 // Decimal як string: "300.00"
  paymentPlan: string | null;      // "60/40 - 60% during construction, 40% on handover"
  
  // Secondary поля завжди null для off-plan
  price: null;
  bedrooms: null;
  bathrooms: null;
  size: null;
  
  // Units (тільки для off-plan)
  units: PropertyUnit[];
}
```

### Secondary Property (додаткові поля)

```typescript
interface SecondaryProperty extends PropertyBase {
  propertyType: 'secondary';
  
  // Ціна та розміри (точні значення)
  price: string;                   // Decimal як string: "750000.00"
  bedrooms: number;               // Integer: 2
  bathrooms: number;              // Integer: 2
  size: string;                    // Decimal як string: "120.00"
  
  // Off-Plan поля завжди null для secondary
  priceFrom: null;
  bedroomsFrom: null;
  bedroomsTo: null;
  bathroomsFrom: null;
  bathroomsTo: null;
  sizeFrom: null;
  sizeTo: null;
  paymentPlan: null;
  
  // Units (можуть бути для secondary теж)
  units: PropertyUnit[];
}
```

---

## PropertyUnit - Схема

```typescript
interface PropertyUnit {
  id: string;                      // UUID
  propertyId: string;              // UUID - ID property
  unitId: string;                   // Унікальний ID юніту: "UNIT-001"
  type: UnitType;                   // 'apartment' | 'villa' | 'penthouse' | 'townhouse' | 'office'
  planImage: string | null;         // URL до плану: "https://images.unsplash.com/..."
  totalSize: string;                // Decimal як string: "120.50" (sqm)
  balconySize: string | null;      // Decimal як string: "15.00" (sqm) або null
  price: string;                     // Decimal як string: "2500000.00" (AED)
  
  // Додаткові поля з бази (не завжди в API, але можуть бути)
  bedrooms?: number;                // Integer
  bathrooms?: number;               // Integer
  size?: number;                    // Decimal
  photos?: string[];                // Масив URL фото
}
```

### UnitType Enum

```typescript
enum UnitType {
  APARTMENT = 'apartment',
  VILLA = 'villa',
  PENTHOUSE = 'penthouse',
  TOWNHOUSE = 'townhouse',
  OFFICE = 'office'
}
```

---

## Country - Схема

```typescript
interface Country {
  id: string;                       // UUID
  nameEn: string;                   // "United Arab Emirates"
  nameRu: string;                   // "ОАЭ"
  nameAr: string;                    // "الإمارات العربية المتحدة"
  code: string;                      // "AE" (ISO country code)
}
```

---

## City - Схема

```typescript
interface City {
  id: string;                       // UUID
  countryId: string;                // UUID
  nameEn: string;                    // "Dubai"
  nameRu: string;                   // "Дубай"
  nameAr: string;                    // "دبي"
}
```

---

## Area - Схема

```typescript
interface Area {
  id: string;                       // UUID
  cityId: string;                   // UUID
  nameEn: string;                   // "Palm Jumeirah"
  nameRu: string;                   // "Пальм Джумейра"
  nameAr: string;                    // "نخلة جميرا"
  description: string | null;      // Опис району
  infrastructure: string | null;    // Інфраструктура
  images: string[] | null;          // Масив URL зображень
}
```

---

## Developer - Схема

```typescript
interface Developer {
  id: string;                       // UUID
  name: string;                     // "Emaar Properties"
  logo: string | null;               // URL до логотипу
  description: string | null;       // Опис девелопера
  images: string[] | null;           // Масив URL зображень
  createdAt: string;                // ISO 8601: "2025-11-27T11:57:08.907Z"
}
```

---

## Facility - Схема

```typescript
interface Facility {
  id: string;                       // UUID
  nameEn: string;                    // "Swimming Pool"
  nameRu: string;                   // "Бассейн"
  nameAr: string;                    // "مسبح"
  iconName: string;                  // "pool" (назва іконки)
  createdAt: string;                // ISO 8601: "2025-11-27T17:09:41.838Z"
}
```

---

## Повна структура Property з relations

```typescript
interface PropertyFull {
  // Базові поля
  id: string;
  propertyType: 'off-plan' | 'secondary';
  name: string;
  photos: string[];
  countryId: string;
  cityId: string;
  areaId: string;
  latitude: string;
  longitude: string;
  description: string;
  developerId: string | null;
  createdAt: string;
  updatedAt: string;
  
  // Off-Plan поля (null для secondary)
  priceFrom: string | null;
  bedroomsFrom: number | null;
  bedroomsTo: number | null;
  bathroomsFrom: number | null;
  bathroomsTo: number | null;
  sizeFrom: string | null;
  sizeTo: string | null;
  paymentPlan: string | null;
  
  // Secondary поля (null для off-plan)
  price: string | null;
  bedrooms: number | null;
  bathrooms: number | null;
  size: string | null;
  
  // Relations (завжди присутні)
  country: Country;
  city: City;
  area: Area;
  developer: Developer | null;
  facilities: Facility[];
  units: PropertyUnit[];
}
```

---

## Приклади реальних відповідей

### Off-Plan Property Example

```json
{
  "success": true,
  "message": "Success",
  "data": {
    "id": "510ffd3c-f648-424a-994f-7a32f7ea93d4",
    "propertyType": "off-plan",
    "name": "Beachfront Residences Palm Jumeirah",
    "photos": [
      "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800",
      "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800",
      "https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=800"
    ],
    "countryId": "25997cc8-1dc1-415a-9376-a7281b3cb093",
    "cityId": "40da35bb-ad01-44ec-abdf-94d86c1203fb",
    "areaId": "2936aa08-c043-4750-a02d-88664ae2d8b2",
    "latitude": "25.11280000",
    "longitude": "55.13900000",
    "description": "Exclusive beachfront development on the iconic Palm Jumeirah...",
    "developerId": "34621b88-5c87-4509-9faa-e2e0f00972b0",
    "priceFrom": "1200000.00",
    "bedroomsFrom": 2,
    "bedroomsTo": 4,
    "bathroomsFrom": 2,
    "bathroomsTo": 4,
    "sizeFrom": "150.00",
    "sizeTo": "300.00",
    "paymentPlan": "60/40 - 60% during construction, 40% on handover",
    "price": null,
    "bedrooms": null,
    "bathrooms": null,
    "size": null,
    "createdAt": "2025-11-27T11:53:31.824Z",
    "updatedAt": "2025-11-27T11:53:31.966Z",
    "country": {
      "id": "25997cc8-1dc1-415a-9376-a7281b3cb093",
      "nameEn": "United Arab Emirates",
      "nameRu": "ОАЭ",
      "nameAr": "الإمارات العربية المتحدة",
      "code": "AE"
    },
    "city": {
      "id": "40da35bb-ad01-44ec-abdf-94d86c1203fb",
      "countryId": "25997cc8-1dc1-415a-9376-a7281b3cb093",
      "nameEn": "Dubai",
      "nameRu": "Дубай",
      "nameAr": "دبي"
    },
    "area": {
      "id": "2936aa08-c043-4750-a02d-88664ae2d8b2",
      "cityId": "40da35bb-ad01-44ec-abdf-94d86c1203fb",
      "nameEn": "Palm Jumeirah",
      "nameRu": "Пальм Джумейра",
      "nameAr": "نخلة جميرا",
      "description": null,
      "infrastructure": null,
      "images": null
    },
    "developer": {
      "id": "34621b88-5c87-4509-9faa-e2e0f00972b0",
      "name": "Emaar Properties",
      "logo": null,
      "description": null,
      "images": null,
      "createdAt": "2025-11-27T11:57:08.907Z"
    },
    "facilities": [
      {
        "id": "25106521-513c-45c3-82a3-d38a48c307c3",
        "nameEn": "Swimming Pool",
        "nameRu": "Бассейн",
        "nameAr": "مسبح",
        "iconName": "pool",
        "createdAt": "2025-11-27T17:09:41.838Z"
      }
      // ... інші facilities
    ],
    "units": [
      {
        "id": "7890eb5f-9ed0-40c3-8182-7d5c115973d2",
        "propertyId": "510ffd3c-f648-424a-994f-7a32f7ea93d4",
        "unitId": "UNIT-001",
        "type": "apartment",
        "planImage": "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800",
        "totalSize": "120.50",
        "balconySize": "15.00",
        "price": "2500000.00"
      }
      // ... інші units
    ]
  }
}
```

### Secondary Property Example

```json
{
  "success": true,
  "message": "Success",
  "data": {
    "id": "559489d8-65e6-4c8e-8e41-9895681d0b30",
    "propertyType": "secondary",
    "name": "Modern Apartment in Downtown",
    "photos": [
      "https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?w=800",
      "https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=800"
    ],
    "countryId": "25997cc8-1dc1-415a-9376-a7281b3cb093",
    "cityId": "40da35bb-ad01-44ec-abdf-94d86c1203fb",
    "areaId": "511a7d7a-44b2-40b5-adb0-d2efd3bbbaae",
    "latitude": "25.20480000",
    "longitude": "55.27080000",
    "description": "Beautifully renovated modern apartment...",
    "developerId": null,
    "priceFrom": null,
    "bedroomsFrom": null,
    "bedroomsTo": null,
    "bathroomsFrom": null,
    "bathroomsTo": null,
    "sizeFrom": null,
    "sizeTo": null,
    "paymentPlan": null,
    "price": "750000.00",
    "bedrooms": 2,
    "bathrooms": 2,
    "size": "120.00",
    "createdAt": "2025-11-27T11:53:31.824Z",
    "updatedAt": "2025-11-27T11:53:31.966Z",
    "country": {
      "id": "25997cc8-1dc1-415a-9376-a7281b3cb093",
      "nameEn": "United Arab Emirates",
      "nameRu": "ОАЭ",
      "nameAr": "الإمارات العربية المتحدة",
      "code": "AE"
    },
    "city": {
      "id": "40da35bb-ad01-44ec-abdf-94d86c1203fb",
      "countryId": "25997cc8-1dc1-415a-9376-a7281b3cb093",
      "nameEn": "Dubai",
      "nameRu": "Дубай",
      "nameAr": "دبي"
    },
    "area": {
      "id": "511a7d7a-44b2-40b5-adb0-d2efd3bbbaae",
      "cityId": "40da35bb-ad01-44ec-abdf-94d86c1203fb",
      "nameEn": "Downtown Dubai",
      "nameRu": "Даунтаун Дубай",
      "nameAr": "دبي داون تاون",
      "description": null,
      "infrastructure": null,
      "images": null
    },
    "developer": null,
    "facilities": [
      {
        "id": "25106521-513c-45c3-82a3-d38a48c307c3",
        "nameEn": "Swimming Pool",
        "nameRu": "Бассейн",
        "nameAr": "مسبح",
        "iconName": "pool",
        "createdAt": "2025-11-27T17:09:41.838Z"
      }
      // ... інші facilities
    ],
    "units": [
      {
        "id": "a2e367c4-f82c-4f93-ad0a-ce32fc448320",
        "propertyId": "559489d8-65e6-4c8e-8e41-9895681d0b30",
        "unitId": "UNIT-201",
        "type": "apartment",
        "planImage": "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800",
        "totalSize": "85.00",
        "balconySize": "10.00",
        "price": "1500000.00"
      }
      // ... інші units
    ]
  }
}
```

---

## Важливі примітки

### Типи даних

1. **Decimal поля як string**: 
   - `priceFrom`, `price`, `sizeFrom`, `sizeTo`, `size`, `totalSize`, `balconySize` - всі повертаються як string
   - Приклад: `"1200000.00"` замість `1200000.00`
   - Це зроблено для точності та уникнення втрати даних при серіалізації

2. **Integer поля як number**:
   - `bedroomsFrom`, `bedroomsTo`, `bedrooms`, `bathroomsFrom`, `bathroomsTo`, `bathrooms` - повертаються як number
   - Приклад: `2` замість `"2"`

3. **Null значення**:
   - Для off-plan: `price`, `bedrooms`, `bathrooms`, `size` завжди `null`
   - Для secondary: `priceFrom`, `bedroomsFrom`, `bedroomsTo`, `bathroomsFrom`, `bathroomsTo`, `sizeFrom`, `sizeTo`, `paymentPlan` завжди `null`
   - `developerId` та `developer` можуть бути `null` для обох типів

4. **Масиви**:
   - `photos` - завжди масив (може бути порожнім `[]`)
   - `facilities` - завжди масив (може бути порожнім `[]`)
   - `units` - завжди масив (може бути порожнім `[]`)

5. **Relations**:
   - `country`, `city`, `area` - завжди присутні (не null)
   - `developer` - може бути `null`
   - `facilities` - завжди масив (може бути порожнім)
   - `units` - завжди масив (може бути порожнім)

### Координати

- `latitude`: Decimal(10,8) - від -90 до 90
- `longitude`: Decimal(11,8) - від -180 до 180
- Повертаються як string: `"25.11280000"`

### Timestamps

- Всі timestamps в форматі ISO 8601: `"2025-11-27T11:53:31.824Z"`
- `createdAt` - дата створення
- `updatedAt` - дата останнього оновлення

---

## TypeScript типи для використання

```typescript
// Базовий тип
type PropertyType = 'off-plan' | 'secondary';

// Unit типи
type UnitType = 'apartment' | 'villa' | 'penthouse' | 'townhouse' | 'office';

// Country
interface Country {
  id: string;
  nameEn: string;
  nameRu: string;
  nameAr: string;
  code: string;
}

// City
interface City {
  id: string;
  countryId: string;
  nameEn: string;
  nameRu: string;
  nameAr: string;
}

// Area
interface Area {
  id: string;
  cityId: string;
  nameEn: string;
  nameRu: string;
  nameAr: string;
  description: string | null;
  infrastructure: string | null;
  images: string[] | null;
}

// Developer
interface Developer {
  id: string;
  name: string;
  logo: string | null;
  description: string | null;
  images: string[] | null;
  createdAt: string;
}

// Facility
interface Facility {
  id: string;
  nameEn: string;
  nameRu: string;
  nameAr: string;
  iconName: string;
  createdAt: string;
}

// PropertyUnit
interface PropertyUnit {
  id: string;
  propertyId: string;
  unitId: string;
  type: UnitType;
  planImage: string | null;
  totalSize: string;
  balconySize: string | null;
  price: string;
}

// Property (повна схема)
interface Property {
  id: string;
  propertyType: PropertyType;
  name: string;
  photos: string[];
  countryId: string;
  cityId: string;
  areaId: string;
  latitude: string;
  longitude: string;
  description: string;
  developerId: string | null;
  createdAt: string;
  updatedAt: string;
  
  // Off-Plan fields
  priceFrom: string | null;
  bedroomsFrom: number | null;
  bedroomsTo: number | null;
  bathroomsFrom: number | null;
  bathroomsTo: number | null;
  sizeFrom: string | null;
  sizeTo: string | null;
  paymentPlan: string | null;
  
  // Secondary fields
  price: string | null;
  bedrooms: number | null;
  bathrooms: number | null;
  size: string | null;
  
  // Relations
  country: Country;
  city: City;
  area: Area;
  developer: Developer | null;
  facilities: Facility[];
  units: PropertyUnit[];
}

// API Response
interface PropertyApiResponse {
  success: boolean;
  message: string;
  data: Property;
}
```

---

## Перетворення даних

### Decimal string → Number

```typescript
const price = parseFloat(property.priceFrom); // "1200000.00" → 1200000.00
const size = parseFloat(property.sizeFrom);    // "150.00" → 150.00
```

### Number → Decimal string

```typescript
const priceStr = price.toFixed(2);            // 1200000.00 → "1200000.00"
const sizeStr = size.toFixed(2);               // 150.00 → "150.00"
```

### Перевірка типу property

```typescript
const isOffPlan = property.propertyType === 'off-plan';
const isSecondary = property.propertyType === 'secondary';

// Використання
if (isOffPlan) {
  const price = property.priceFrom;  // string | null
  const bedrooms = property.bedroomsFrom; // number | null
} else {
  const price = property.price;      // string | null
  const bedrooms = property.bedrooms; // number | null
}
```

---

## Endpoints

### GET /api/properties/:id

Отримати property за ID з усіма relations.

**Response**: `PropertyApiResponse`

**Приклад**:
```bash
GET /api/properties/510ffd3c-f648-424a-994f-7a32f7ea93d4
Authorization: Bearer <token>
```

### GET /api/properties

Отримати список properties з пагінацією.

**Response**:
```typescript
{
  success: boolean;
  message: string;
  data: {
    data: Property[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  };
}
```

---

## Валідація

### Обов'язкові поля для Off-Plan:
- `name`, `photos`, `countryId`, `cityId`, `areaId`
- `latitude`, `longitude`, `description`
- `priceFrom`, `bedroomsFrom`, `bedroomsTo`
- `bathroomsFrom`, `bathroomsTo`, `sizeFrom`, `sizeTo`

### Обов'язкові поля для Secondary:
- `name`, `photos`, `countryId`, `cityId`, `areaId`
- `latitude`, `longitude`, `description`
- `price`, `bedrooms`, `bathrooms`, `size`

### Опціональні поля:
- `developerId` / `developer`
- `paymentPlan` (тільки для off-plan)
- `facilities` (масив, може бути порожнім)
- `units` (масив, може бути порожнім)

