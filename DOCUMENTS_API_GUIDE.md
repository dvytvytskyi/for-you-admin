# 📄 Documents API - Complete Guide

## Base URL
```
https://admin.foryou-realestate.com/api/v1/documents
```

## Authentication
Most endpoints require authentication via **JWT Token**:
- Header: `Authorization: Bearer <token>`

**Upload endpoint** requires **BROKER** or **ADMIN** role.

---

## 📋 Document Entity Schema

```typescript
interface Document {
  id: string;                    // UUID
  type: DocumentType;             // Тип документа (enum)
  entityType: DocumentCategory;  // Категорія (PROPERTY, LEAD, USER)
  entityId: string;              // UUID сутності
  fileName: string;              // Назва файлу в Cloudinary
  originalName: string;          // Оригінальна назва файлу
  fileUrl: string;              // URL до файлу
  s3Key?: string;               // Cloudinary public_id
  mimeType: string;             // MIME тип файлу
  fileSize: number;              // Розмір в байтах
  description?: string;          // Опис документа
  isPublic: boolean;            // Чи публічний документ
  isVerified: boolean;           // Чи верифікований (тільки ADMIN)
  uploadedBy: string;           // UUID користувача, який завантажив
  verifiedBy?: string;           // UUID адміна, який верифікував
  verifiedAt?: string;          // Дата верифікації
  createdAt: string;           // ISO 8601 date
  updatedAt: string;            // ISO 8601 date
}
```

---

## 📝 Document Types (DocumentType)

### Property Documents
- `BROCHURE` - Брошура
- `FLOOR_PLAN` - План поверху
- `MASTER_PLAN` - Генеральний план
- `PROPERTY_CONTRACT` - Договір нерухомості
- `PROPERTY_CERTIFICATE` - Сертифікат нерухомості

### Lead Documents
- `LEAD_CONTRACT` - Договір заявки
- `CLIENT_ID` - ID клієнта
- `CLIENT_PASSPORT` - Паспорт клієнта
- `POWER_OF_ATTORNEY` - Довіреність

### User Documents (Broker)
- `BROKER_LICENSE` - Ліцензія брокера
- `BROKER_CERTIFICATE` - Сертифікат брокера

### Other
- `OTHER` - Інше

---

## 📝 Document Categories (DocumentCategory)

- `PROPERTY` - Документи нерухомості
- `LEAD` - Документи заявок
- `USER` - Документи користувачів

---

## 🔍 Endpoints

### 1. POST `/api/v1/documents/upload`
Завантажити документ (тільки BROKER, ADMIN).

**Request:**
```http
POST /api/v1/documents/upload
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

**Form Data:**
- `file` (binary) - файл (обов'язково)
- `type` (string) - тип документа (обов'язково)
- `entityType` (string) - категорія: PROPERTY, LEAD, USER (обов'язково)
- `entityId` (string) - UUID сутності (обов'язково)
- `description` (string, optional) - опис
- `isPublic` (boolean, optional) - чи публічний (default: false)

**Дозволені типи файлів:**
- PDF (`application/pdf`)
- Images: JPEG, PNG, WebP (`image/jpeg`, `image/png`, `image/webp`)
- Word: DOC, DOCX (`application/msword`, `application/vnd.openxmlformats-officedocument.wordprocessingml.document`)
- Excel: XLS, XLSX (`application/vnd.ms-excel`, `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`)

**Максимальний розмір:** 20MB

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "type": "BROCHURE",
    "entityType": "PROPERTY",
    "entityId": "property-uuid",
    "fileName": "cloudinary-file-name",
    "originalName": "document.pdf",
    "fileUrl": "https://res.cloudinary.com/.../document.pdf",
    "mimeType": "application/pdf",
    "fileSize": 1024000,
    "description": "Property brochure",
    "isPublic": false,
    "isVerified": false,
    "uploadedBy": "user-uuid",
    "createdAt": "2025-12-05T12:00:00.000Z",
    "updatedAt": "2025-12-05T12:00:00.000Z"
  }
}
```

**Status Codes:**
- `200` - Success
- `400` - Bad Request (invalid file type, missing fields)
- `401` - Unauthorized
- `403` - Forbidden (not BROKER or ADMIN)
- `500` - Internal server error

---

### 2. GET `/api/v1/documents/entity/:entityType/:entityId`
Отримати документи для сутності.

**Request:**
```http
GET /api/v1/documents/entity/PROPERTY/property-uuid
Authorization: Bearer <token> (optional)
```

**Parameters:**
- `entityType` - PROPERTY, LEAD, або USER
- `entityId` - UUID сутності

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "type": "BROCHURE",
      "entityType": "PROPERTY",
      "entityId": "property-uuid",
      "fileName": "file-name",
      "originalName": "document.pdf",
      "fileUrl": "https://...",
      "mimeType": "application/pdf",
      "fileSize": 1024000,
      "description": "Property brochure",
      "isPublic": true,
      "isVerified": false,
      "uploadedBy": "user-uuid",
      "createdAt": "2025-12-05T12:00:00.000Z",
      "updatedAt": "2025-12-05T12:00:00.000Z"
    }
  ]
}
```

**Примітки:**
- Якщо не авторизований, повертаються тільки публічні документи
- Якщо авторизований, повертаються всі документи (включно з приватними)

**Status Codes:**
- `200` - Success
- `400` - Bad Request (invalid entityType)
- `500` - Internal server error

---

### 3. GET `/api/v1/documents/:id`
Отримати документ по ID.

**Request:**
```http
GET /api/v1/documents/document-uuid
Authorization: Bearer <token> (optional)
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "type": "BROCHURE",
    "entityType": "PROPERTY",
    "entityId": "property-uuid",
    "fileName": "file-name",
    "originalName": "document.pdf",
    "fileUrl": "https://...",
    "mimeType": "application/pdf",
    "fileSize": 1024000,
    "description": "Property brochure",
    "isPublic": false,
    "isVerified": false,
    "uploadedBy": "user-uuid",
    "createdAt": "2025-12-05T12:00:00.000Z",
    "updatedAt": "2025-12-05T12:00:00.000Z"
  }
}
```

**Примітки:**
- Публічні документи доступні всім
- Приватні документи доступні тільки власнику або ADMIN

**Status Codes:**
- `200` - Success
- `403` - Access denied
- `404` - Document not found
- `500` - Internal server error

---

### 4. PATCH `/api/v1/documents/:id`
Оновити метадані документа.

**Request:**
```http
PATCH /api/v1/documents/document-uuid
Authorization: Bearer <token>
Content-Type: application/json
```

**Body:**
```json
{
  "description": "Updated description"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "description": "Updated description",
    ...
  }
}
```

**Примітки:**
- Доступ тільки для власника документа або ADMIN

**Status Codes:**
- `200` - Success
- `403` - Access denied
- `404` - Document not found
- `500` - Internal server error

---

### 5. DELETE `/api/v1/documents/:id`
Видалити документ.

**Request:**
```http
DELETE /api/v1/documents/document-uuid
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "message": "Document deleted successfully",
  "data": null
}
```

**Примітки:**
- Доступ тільки для власника документа або ADMIN
- Файл видаляється з Cloudinary та з БД

**Status Codes:**
- `200` - Success
- `403` - Access denied
- `404` - Document not found
- `500` - Internal server error

---

### 6. POST `/api/v1/documents/:id/verify`
Верифікувати документ (тільки ADMIN).

**Request:**
```http
POST /api/v1/documents/document-uuid/verify
Authorization: Bearer <admin-token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "isVerified": true,
    "verifiedBy": "admin-uuid",
    "verifiedAt": "2025-12-05T12:00:00.000Z",
    ...
  }
}
```

**Status Codes:**
- `200` - Success
- `401` - Unauthorized
- `403` - Forbidden (not ADMIN)
- `404` - Document not found
- `500` - Internal server error

---

### 7. GET `/api/v1/documents`
Всі документи з фільтрами (тільки ADMIN).

**Request:**
```http
GET /api/v1/documents?entityType=PROPERTY&type=BROCHURE&isVerified=true&page=1&limit=20
Authorization: Bearer <admin-token>
```

**Query Parameters:**
- `entityType` (optional) - PROPERTY, LEAD, USER
- `type` (optional) - Тип документа
- `isVerified` (optional) - true/false
- `page` (optional) - Номер сторінки (default: 1)
- `limit` (optional) - Кількість на сторінці (default: 20)

**Response:**
```json
{
  "success": true,
  "data": {
    "data": [
      {
        "id": "uuid",
        "type": "BROCHURE",
        ...
      }
    ],
    "total": 100,
    "page": 1,
    "totalPages": 5
  }
}
```

**Status Codes:**
- `200` - Success
- `401` - Unauthorized
- `403` - Forbidden (not ADMIN)
- `500` - Internal server error

---

## 🔧 Usage Examples

### JavaScript/TypeScript (Fetch API)

```typescript
// Завантажити документ
async function uploadDocument(file: File, type: string, entityType: string, entityId: string) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('type', type);
  formData.append('entityType', entityType);
  formData.append('entityId', entityId);
  formData.append('description', 'Property brochure');
  formData.append('isPublic', 'false');

  const response = await fetch('https://admin.foryou-realestate.com/api/v1/documents/upload', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`
    },
    body: formData
  });

  return await response.json();
}

// Отримати документи для нерухомості
async function getPropertyDocuments(propertyId: string) {
  const response = await fetch(
    `https://admin.foryou-realestate.com/api/v1/documents/entity/PROPERTY/${propertyId}`,
    {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    }
  );

  return await response.json();
}
```

### cURL

```bash
# Завантажити документ
curl -X POST "https://admin.foryou-realestate.com/api/v1/documents/upload" \
  -H "Authorization: Bearer <token>" \
  -F "file=@document.pdf" \
  -F "type=BROCHURE" \
  -F "entityType=PROPERTY" \
  -F "entityId=property-uuid" \
  -F "description=Property brochure" \
  -F "isPublic=false"

# Отримати документи
curl -X GET "https://admin.foryou-realestate.com/api/v1/documents/entity/PROPERTY/property-uuid" \
  -H "Authorization: Bearer <token>"

# Видалити документ
curl -X DELETE "https://admin.foryou-realestate.com/api/v1/documents/document-uuid" \
  -H "Authorization: Bearer <token>"
```

---

## ⚠️ Важливі примітки

1. **Завантаження доступне тільки для BROKER та ADMIN**

2. **Максимальний розмір файлу: 20MB**

3. **Дозволені типи файлів:**
   - PDF
   - Images (JPEG, PNG, WebP)
   - Word (DOC, DOCX)
   - Excel (XLS, XLSX)

4. **Публічні документи** доступні всім (навіть без авторизації)

5. **Приватні документи** доступні тільки власнику або ADMIN

6. **Верифікація** доступна тільки для ADMIN

7. **Файли зберігаються на Cloudinary** в папці `documents/{entityType}/{entityId}/`

---

## 🐛 Можливі проблеми

### Проблема: "Invalid file type"

**Рішення:** Перевірте що файл має один з дозволених MIME типів

### Проблема: "File size exceeds 20MB limit"

**Рішення:** Зменшіть розмір файлу або стисніть його

### Проблема: "Forbidden: Broker or Admin access required"

**Рішення:** Переконайтеся що користувач має роль BROKER або ADMIN

### Проблема: "Access denied"

**Рішення:** Перевірте що ви є власником документа або маєте роль ADMIN

---

## 📚 Додаткові ресурси

- [Cloudinary Documentation](https://cloudinary.com/documentation)
- [Multer Documentation](https://github.com/expressjs/multer)
- [Express.js Documentation](https://expressjs.com/)

---

**Останнє оновлення:** Грудень 2025

