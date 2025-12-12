# 🏢 Units API Schema

## ✅ Так, units віддаються через API

Units (юніти/квартири) повертаються в усіх endpoints, де повертаються properties.

---

## 📍 Endpoints де повертаються units:

1. **GET `/api/v1/properties`** - список properties з units
2. **GET `/api/v1/properties/:id`** - один property з units
3. **GET `/api/v1/public/data`** - публічний API з units

---

## 📋 Структура Unit (юніта)

### Entity (база даних):
```typescript
{
  id: string;                    // UUID
  propertyId: string;            // UUID - ID property до якого належить unit
  unitId: string;                // Унікальний ID юніта (наприклад "UNIT-201", "A-101")
  type: UnitType;                // Тип: "apartment" | "villa" | "penthouse" | "townhouse" | "office"
  planImage: string | null;      // URL до плану юніта
  totalSize: number;             // Загальна площа в м² (decimal)
  balconySize: number | null;   // Площа балкону в м² (decimal, nullable)
  price: number;                 // Ціна в USD (decimal)
}
```

---

## 🔄 Трансформація в API відповідях

### 1. Public API (`/api/v1/public/data`)

Units трансформуються з додаванням конвертацій:

```json
{
  "units": [
    {
      "id": "a2e367c4-f82c-4f93-ad0a-ce32fc448320",
      "unitId": "UNIT-201",
      "type": "apartment",
      "price": 1500000,
      "priceAED": 5505000,
      "totalSize": 85.5,
      "totalSizeSqft": 920.32,
      "balconySize": 10.0,
      "balconySizeSqft": 107.64,
      "planImage": "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800"
    }
  ]
}
```

**Поля:**
- `id` - UUID юніта
- `unitId` - Унікальний ID (string)
- `type` - Тип юніта: `"apartment"` | `"villa"` | `"penthouse"` | `"townhouse"` | `"office"`
- `price` - Ціна в USD (number)
- `priceAED` - Ціна в AED (конвертована, number | null)
- `totalSize` - Загальна площа в м² (number)
- `totalSizeSqft` - Загальна площа в sq.ft (конвертована, number | null)
- `balconySize` - Площа балкону в м² (number | null)
- `balconySizeSqft` - Площа балкону в sq.ft (конвертована, number | null)
- `planImage` - URL до плану юніта (string | null)

---

### 2. Properties API (`/api/v1/properties`)

Units повертаються без конвертацій (оригінальні значення):

```json
{
  "units": [
    {
      "id": "a2e367c4-f82c-4f93-ad0a-ce32fc448320",
      "propertyId": "559489d8-65e6-4c8e-8e41-9895681d0b30",
      "unitId": "UNIT-201",
      "type": "apartment",
      "price": 1500000.00,
      "totalSize": 85.50,
      "balconySize": 10.00,
      "planImage": "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800"
    }
  ]
}
```

**Поля:**
- `id` - UUID юніта
- `propertyId` - UUID property (додається в API)
- `unitId` - Унікальний ID (string)
- `type` - Тип юніта (enum)
- `price` - Ціна в USD (number/decimal)
- `totalSize` - Загальна площа в м² (number/decimal)
- `balconySize` - Площа балкону в м² (number/decimal | null)
- `planImage` - URL до плану юніта (string | null)

**Примітка:** В цьому API не додаються `priceAED`, `totalSizeSqft`, `balconySizeSqft` - тільки оригінальні значення.

---

## 📝 Типи UnitType

```typescript
enum UnitType {
  APARTMENT = 'apartment',
  VILLA = 'villa',
  PENTHOUSE = 'penthouse',
  TOWNHOUSE = 'townhouse',
  OFFICE = 'office',
}
```

---

## 💡 Приклади використання

### Отримати properties з units:

```bash
# Public API
curl -X GET "https://admin.foryou-realestate.com/api/v1/public/data" \
  -H "x-api-key: YOUR_API_KEY" \
  -H "x-api-secret: YOUR_API_SECRET"

# Properties API (з авторизацією)
curl -X GET "https://admin.foryou-realestate.com/api/v1/properties?limit=10" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Приклад повної відповіді property з units:

```json
{
  "success": true,
  "message": "Success",
  "data": {
    "id": "559489d8-65e6-4c8e-8e41-9895681d0b30",
    "propertyType": "off-plan",
    "name": "Luxury Marina Residences",
    "description": "Beautiful property...",
    "photos": ["https://..."],
    "country": { "id": "...", "nameEn": "United Arab Emirates" },
    "city": { "id": "...", "nameEn": "Dubai" },
    "area": { "id": "...", "nameEn": "Dubai Marina" },
    "developer": { "id": "...", "name": "Emaar Properties" },
    "facilities": [...],
    "units": [
      {
        "id": "a2e367c4-f82c-4f93-ad0a-ce32fc448320",
        "unitId": "UNIT-201",
        "type": "apartment",
        "price": 1500000,
        "priceAED": 5505000,
        "totalSize": 85.5,
        "totalSizeSqft": 920.32,
        "balconySize": 10.0,
        "balconySizeSqft": 107.64,
        "planImage": "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800"
      },
      {
        "id": "b3f478d5-g93d-5g04-be1b-df43gd559431",
        "unitId": "UNIT-202",
        "type": "apartment",
        "price": 1800000,
        "priceAED": 6606000,
        "totalSize": 105.0,
        "totalSizeSqft": 1130.21,
        "balconySize": 12.5,
        "balconySizeSqft": 134.55,
        "planImage": "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800"
      }
    ],
    "priceFrom": 1500000,
    "bedroomsFrom": 2,
    "bedroomsTo": 3,
    ...
  }
}
```

---

## 🔍 Де знаходиться код трансформації

### Public API:
**Файл:** `admin-panel-backend/src/routes/public.routes.ts`
**Рядки:** 126-137

```typescript
units: p.units?.map(u => ({
  id: u.id,
  unitId: u.unitId,
  type: u.type,
  price: u.price,
  priceAED: u.price ? Conversions.usdToAed(u.price) : null,
  totalSize: u.totalSize,
  totalSizeSqft: u.totalSize ? Conversions.sqmToSqft(u.totalSize) : null,
  balconySize: u.balconySize,
  balconySizeSqft: u.balconySize ? Conversions.sqmToSqft(u.balconySize) : null,
  planImage: u.planImage,
})) || [],
```

### Properties API:
**Файл:** `admin-panel-backend/src/routes/properties.routes.ts`
**Рядки:** 551-559

```typescript
// Transform units if present
if (propertyData.units && Array.isArray(propertyData.units)) {
  propertyData.units = propertyData.units.map((unit: any) => ({
    ...unit,
    totalSize: unit.totalSize ? parseFloat(unit.totalSize) : null,
    balconySize: unit.balconySize ? parseFloat(unit.balconySize) : null,
    price: unit.price ? parseFloat(unit.price) : null,
  }));
}
```

---

## 📊 Конвертації

### USD → AED
```typescript
priceAED = price * 3.67
```

### м² → sq.ft
```typescript
totalSizeSqft = totalSize * 10.764
balconySizeSqft = balconySize * 10.764
```

---

## ⚠️ Важливі примітки

1. **Units завжди масив** - може бути порожнім `[]`, але завжди присутній
2. **Units належать до Property** - кожен unit має `propertyId`
3. **Типи даних:**
   - `price`, `totalSize`, `balconySize` - number (decimal)
   - `unitId`, `planImage` - string
   - `type` - enum string
4. **Nullable поля:**
   - `balconySize` - може бути `null`
   - `planImage` - може бути `null`
   - `priceAED`, `totalSizeSqft`, `balconySizeSqft` - `null` якщо оригінальне значення `null`

---

**Останнє оновлення:** 2025-12-12
