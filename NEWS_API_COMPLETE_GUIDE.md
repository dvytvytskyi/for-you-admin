# 📰 Повний гайд API News для мобільного додатку

## 📍 Base URL
```
https://admin.foryou-realestate.com/api
```

---

## 🔑 Автентифікація

News API підтримує **два методи автентифікації**:

### 1. JWT Token (для авторизованих користувачів)
```
Authorization: Bearer <token>
```

### 2. API Key (для публічного доступу)
```
x-api-key: <api-key>
```

**Примітка:** Для публічного API (`/api/public/news`) потрібні обидва заголовки:
```
x-api-key: <api-key>
x-api-secret: <api-secret>
```

---

## 📋 Endpoints

### 1. 📋 Отримати список всіх новин (Admin API)

**GET** `/api/news`

**Автентифікація:** JWT Token або API Key

**Headers:**
```
Authorization: Bearer <token>
// АБО
x-api-key: <api-key>
Content-Type: application/json
```

**Response (200 - Успіх):**
```json
{
  "success": true,
  "data": [
    {
      "id": "123e4567-e89b-12d3-a456-426614174000",
      "title": "Real Estate Market Update",
      "description": "Latest updates on Dubai real estate market trends and opportunities",
      "imageUrl": "https://example.com/news-image.jpg",
      "isPublished": true,
      "publishedAt": "2024-01-15T10:00:00.000Z",
      "contents": [
        {
          "id": "123e4567-e89b-12d3-a456-426614174001",
          "type": "text",
          "title": "Market Overview",
          "description": "Full article content here...",
          "imageUrl": null,
          "videoUrl": null,
          "order": 1
        },
        {
          "id": "123e4567-e89b-12d3-a456-426614174002",
          "type": "image",
          "title": "Market Statistics",
          "description": null,
          "imageUrl": "https://example.com/chart.jpg",
          "videoUrl": null,
          "order": 2
        }
      ],
      "createdAt": "2024-01-15T10:00:00.000Z",
      "updatedAt": "2024-01-15T10:00:00.000Z"
    }
  ]
}
```

**Примітки:**
- Повертає **всі** новини (включно з неопублікованими)
- Включає повний контент (`contents`)
- Сортування не застосовується (всі новини)

---

### 2. 📄 Отримати одну новину за ID (Admin API)

**GET** `/api/news/:id`

**Автентифікація:** JWT Token або API Key

**Headers:**
```
Authorization: Bearer <token>
// АБО
x-api-key: <api-key>
Content-Type: application/json
```

**URL Parameters:**
- `id` (UUID) - ID новини

**Response (200 - Успіх):**
```json
{
  "success": true,
  "data": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "title": "Real Estate Market Update",
    "description": "Latest updates on Dubai real estate market",
    "imageUrl": "https://example.com/news-image.jpg",
    "isPublished": true,
    "publishedAt": "2024-01-15T10:00:00.000Z",
    "contents": [
      {
        "id": "123e4567-e89b-12d3-a456-426614174001",
        "type": "text",
        "title": "Market Overview",
        "description": "Full article content...",
        "imageUrl": null,
        "videoUrl": null,
        "order": 1
      }
    ],
    "createdAt": "2024-01-15T10:00:00.000Z",
    "updatedAt": "2024-01-15T10:00:00.000Z"
  }
}
```

**Response (404 - Не знайдено):**
```json
{
  "success": true,
  "data": null
}
```

---

### 3. ➕ Створити новину (Admin API)

**POST** `/api/news`

**Автентифікація:** JWT Token або API Key

**Headers:**
```
Authorization: Bearer <token>
// АБО
x-api-key: <api-key>
Content-Type: application/json
```

**Request Body:**
```json
{
  "title": "New Real Estate Trends",
  "description": "Description of the news article",
  "imageUrl": "https://example.com/image.jpg",
  "isPublished": false,
  "publishedAt": null,
  "contents": [
    {
      "type": "text",
      "title": "Introduction",
      "description": "Article introduction text...",
      "imageUrl": null,
      "videoUrl": null,
      "order": 1
    },
    {
      "type": "image",
      "title": "Market Chart",
      "description": null,
      "imageUrl": "https://example.com/chart.jpg",
      "videoUrl": null,
      "order": 2
    },
    {
      "type": "video",
      "title": "Market Analysis Video",
      "description": null,
      "imageUrl": null,
      "videoUrl": "https://example.com/video.mp4",
      "order": 3
    }
  ]
}
```

**Response (200 - Успіх):**
```json
{
  "success": true,
  "data": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "title": "New Real Estate Trends",
    "description": "Description of the news article",
    "imageUrl": "https://example.com/image.jpg",
    "isPublished": false,
    "publishedAt": null,
    "contents": [
      {
        "id": "123e4567-e89b-12d3-a456-426614174001",
        "type": "text",
        "title": "Introduction",
        "description": "Article introduction text...",
        "imageUrl": null,
        "videoUrl": null,
        "order": 1
      }
    ],
    "createdAt": "2024-01-15T10:00:00.000Z",
    "updatedAt": "2024-01-15T10:00:00.000Z"
  }
}
```

**Response (500 - Помилка):**
```json
{
  "success": false,
  "message": "Failed to create news"
}
```

**Примітки:**
- `contents` - масив об'єктів контенту (опціонально)
- `type` може бути: `"text"`, `"image"`, `"video"`
- `order` - порядок відображення контенту (число)
- `publishedAt` - дата публікації (null якщо не опубліковано)

---

### 4. ✏️ Оновити новину (Admin API)

**PATCH** `/api/news/:id`

**Автентифікація:** JWT Token або API Key

**Headers:**
```
Authorization: Bearer <token>
// АБО
x-api-key: <api-key>
Content-Type: application/json
```

**URL Parameters:**
- `id` (UUID) - ID новини

**Request Body:**
```json
{
  "title": "Updated Title",
  "isPublished": true,
  "publishedAt": "2024-01-15T10:00:00.000Z"
}
```

**Примітки:**
- Можна оновити будь-які поля частково
- `contents` не оновлюються через PATCH (потрібно окремо)

**Response (200 - Успіх):**
```json
{
  "success": true,
  "data": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "title": "Updated Title",
    "description": "Description of the news article",
    "imageUrl": "https://example.com/image.jpg",
    "isPublished": true,
    "publishedAt": "2024-01-15T10:00:00.000Z",
    "contents": [...],
    "createdAt": "2024-01-15T10:00:00.000Z",
    "updatedAt": "2024-01-15T11:00:00.000Z"
  }
}
```

---

### 5. 🗑️ Видалити новину (Admin API)

**DELETE** `/api/news/:id`

**Автентифікація:** JWT Token або API Key

**Headers:**
```
Authorization: Bearer <token>
// АБО
x-api-key: <api-key>
Content-Type: application/json
```

**URL Parameters:**
- `id` (UUID) - ID новини

**Response (200 - Успіх):**
```json
{
  "success": true,
  "message": "News deleted",
  "data": null
}
```

**Примітки:**
- Видаляє новину та всі пов'язані `contents` (CASCADE)

---

### 6. 📋 Отримати список опублікованих новин (Public API)

**GET** `/api/public/news`

**Автентифікація:** API Key + Secret (обов'язково)

**Headers:**
```
x-api-key: <api-key>
x-api-secret: <api-secret>
Content-Type: application/json
```

**Query Parameters:**

| Параметр | Тип | Опис | Приклад | За замовчуванням |
|----------|-----|------|---------|-------------------|
| `page` | number | Номер сторінки | `?page=1` | `1` |
| `limit` | number | Кількість новин на сторінці (макс. 100) | `?limit=20` | `20` |

**Response (200 - Успіх):**
```json
{
  "success": true,
  "data": {
    "data": [
      {
        "id": "123e4567-e89b-12d3-a456-426614174000",
        "slug": "real-estate-market-update",
        "title": "Real Estate Market Update",
        "titleRu": null,
        "description": "Latest updates on Dubai real estate market",
        "descriptionRu": null,
        "image": "https://example.com/news-image.jpg",
        "publishedAt": "2024-01-15T10:00:00.000Z"
      }
    ],
    "total": 50,
    "page": 1,
    "limit": 20,
    "totalPages": 3
  }
}
```

**Примітки:**
- Повертає **тільки опубліковані** новини (`isPublished = true`)
- Тільки новини з `publishedAt <= now`
- Сортування: за `publishedAt DESC` (найновіші спочатку)
- Генерує `slug` з `title` автоматично
- Не включає `contents` (тільки базову інформацію)

---

### 7. 📄 Отримати одну опубліковану новину за slug або ID (Public API)

**GET** `/api/public/news/:slug`

**Автентифікація:** API Key + Secret (обов'язково)

**Headers:**
```
x-api-key: <api-key>
x-api-secret: <api-secret>
Content-Type: application/json
```

**URL Parameters:**
- `slug` (string) - Slug новини або UUID

**Приклади:**
- `/api/public/news/real-estate-market-update`
- `/api/public/news/123e4567-e89b-12d3-a456-426614174000`

**Response (200 - Успіх):**
```json
{
  "success": true,
  "data": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "slug": "real-estate-market-update",
    "title": "Real Estate Market Update",
    "titleRu": null,
    "description": "Latest updates on Dubai real estate market",
    "descriptionRu": null,
    "image": "https://example.com/news-image.jpg",
    "publishedAt": "2024-01-15T10:00:00.000Z",
    "contents": [
      {
        "type": "text",
        "title": "Market Overview",
        "description": "Full article content...",
        "imageUrl": null,
        "videoUrl": null,
        "order": 1
      },
      {
        "type": "image",
        "title": "Market Statistics",
        "description": null,
        "imageUrl": "https://example.com/chart.jpg",
        "videoUrl": null,
        "order": 2
      },
      {
        "type": "video",
        "title": "Market Analysis Video",
        "description": null,
        "imageUrl": null,
        "videoUrl": "https://example.com/video.mp4",
        "order": 3
      }
    ]
  }
}
```

**Response (404 - Не знайдено):**
```json
{
  "success": false,
  "message": "News not found"
}
```

**Примітки:**
- Повертає **тільки опубліковані** новини
- Може шукати за UUID або slug
- Slug генерується з `title` автоматично
- Включає повний `contents` (відсортований за `order`)
- `contents` містить: `type`, `title`, `description`, `imageUrl`, `videoUrl`, `order`

---

## 📊 Структура даних

### News (Новина)

```typescript
interface News {
  id: string;                    // UUID
  title: string;                 // Заголовок
  description: string;           // Короткий опис
  imageUrl: string | null;      // URL головного зображення
  isPublished: boolean;          // Чи опубліковано
  publishedAt: Date | null;      // Дата публікації (ISO 8601)
  contents: NewsContent[];       // Масив контенту
  createdAt: Date;               // Дата створення (ISO 8601)
  updatedAt: Date;               // Дата оновлення (ISO 8601)
}
```

### NewsContent (Контент новини)

```typescript
interface NewsContent {
  id: string;                    // UUID
  newsId: string;                // ID новини
  type: 'text' | 'image' | 'video';  // Тип контенту
  title: string;                 // Заголовок блоку
  description: string | null;    // Текстовий опис
  imageUrl: string | null;      // URL зображення (для type='image')
  videoUrl: string | null;      // URL відео (для type='video')
  order: number;                 // Порядок відображення
}
```

---

## 🔍 Типи контенту (NewsContentType)

### 1. TEXT (`"text"`)
- Використовується для текстового контенту
- Обов'язкові поля: `title`, `description`
- `imageUrl` та `videoUrl` = `null`

### 2. IMAGE (`"image"`)
- Використовується для зображень
- Обов'язкові поля: `title`, `imageUrl`
- `description` може бути `null`
- `videoUrl` = `null`

### 3. VIDEO (`"video"`)
- Використовується для відео
- Обов'язкові поля: `title`, `videoUrl`
- `description` може бути `null`
- `imageUrl` може бути `null` (thumbnail)

---

## 📝 Приклади використання

### JavaScript/TypeScript (Fetch API)

```typescript
const API_BASE_URL = 'https://admin.foryou-realestate.com/api';
const API_KEY = 'your-api-key';
const API_SECRET = 'your-api-secret';

// 1. Отримати список опублікованих новин (Public API)
async function getPublishedNews(page = 1, limit = 20) {
  const response = await fetch(
    `${API_BASE_URL}/public/news?page=${page}&limit=${limit}`,
    {
      method: 'GET',
      headers: {
        'x-api-key': API_KEY,
        'x-api-secret': API_SECRET,
        'Content-Type': 'application/json',
      },
    }
  );
  
  const data = await response.json();
  return data;
}

// 2. Отримати одну новину за slug (Public API)
async function getNewsBySlug(slug: string) {
  const response = await fetch(
    `${API_BASE_URL}/public/news/${slug}`,
    {
      method: 'GET',
      headers: {
        'x-api-key': API_KEY,
        'x-api-secret': API_SECRET,
        'Content-Type': 'application/json',
      },
    }
  );
  
  const data = await response.json();
  return data;
}

// 3. Отримати всі новини (Admin API з JWT)
async function getAllNews(token: string) {
  const response = await fetch(`${API_BASE_URL}/news`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
  
  const data = await response.json();
  return data;
}

// 4. Створити новину (Admin API)
async function createNews(token: string, newsData: any) {
  const response = await fetch(`${API_BASE_URL}/news`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(newsData),
  });
  
  const data = await response.json();
  return data;
}

// 5. Оновити новину (Admin API)
async function updateNews(token: string, newsId: string, updates: any) {
  const response = await fetch(`${API_BASE_URL}/news/${newsId}`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(updates),
  });
  
  const data = await response.json();
  return data;
}

// 6. Видалити новину (Admin API)
async function deleteNews(token: string, newsId: string) {
  const response = await fetch(`${API_BASE_URL}/news/${newsId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
  
  const data = await response.json();
  return data;
}
```

---

### React Native (Axios)

```typescript
import axios from 'axios';

const API_BASE_URL = 'https://admin.foryou-realestate.com/api';
const API_KEY = 'your-api-key';
const API_SECRET = 'your-api-secret';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': API_KEY,
    'x-api-secret': API_SECRET,
  },
});

// Отримати список новин
export const getNews = async (page = 1, limit = 20) => {
  try {
    const response = await apiClient.get('/public/news', {
      params: { page, limit },
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching news:', error);
    throw error;
  }
};

// Отримати одну новину
export const getNewsBySlug = async (slug: string) => {
  try {
    const response = await apiClient.get(`/public/news/${slug}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching news detail:', error);
    throw error;
  }
};
```

---

### Flutter (Dart)

```dart
import 'package:http/http.dart' as http;
import 'dart:convert';

class NewsAPI {
  static const String baseUrl = 'https://admin.foryou-realestate.com/api';
  static const String apiKey = 'your-api-key';
  static const String apiSecret = 'your-api-secret';

  // Отримати список новин
  static Future<Map<String, dynamic>> getNews({
    int page = 1,
    int limit = 20,
  }) async {
    final url = Uri.parse('$baseUrl/public/news?page=$page&limit=$limit');
    
    final response = await http.get(
      url,
      headers: {
        'x-api-key': apiKey,
        'x-api-secret': apiSecret,
        'Content-Type': 'application/json',
      },
    );

    if (response.statusCode == 200) {
      return json.decode(response.body);
    } else {
      throw Exception('Failed to load news');
    }
  }

  // Отримати одну новину
  static Future<Map<String, dynamic>> getNewsBySlug(String slug) async {
    final url = Uri.parse('$baseUrl/public/news/$slug');
    
    final response = await http.get(
      url,
      headers: {
        'x-api-key': apiKey,
        'x-api-secret': apiSecret,
        'Content-Type': 'application/json',
      },
    );

    if (response.statusCode == 200) {
      return json.decode(response.body);
    } else {
      throw Exception('Failed to load news');
    }
  }
}
```

---

## ⚠️ Помилки та обробка

### Статус коди

| Код | Опис |
|-----|------|
| `200` | Успіх |
| `400` | Невірний запит |
| `401` | Не авторизовано (JWT недійсний) |
| `403` | Заборонено (API Key недійсний) |
| `404` | Не знайдено |
| `500` | Помилка сервера |

### Формат помилки

```json
{
  "success": false,
  "message": "Error message here"
}
```

---

## 🔐 Безпека

### Рекомендації:

1. **Ніколи не зберігайте API ключі в коді клієнта**
   - Використовуйте серверний проксі для публічних додатків
   - Або використовуйте JWT токени для авторизованих користувачів

2. **Використовуйте HTTPS**
   - Всі запити мають бути через HTTPS
   - Base URL вже використовує HTTPS

3. **Обробка помилок**
   - Завжди обробляйте помилки мережі
   - Перевіряйте статус коди відповідей
   - Логуйте помилки для діагностики

---

## 📌 Важливі примітки

1. **Public API vs Admin API:**
   - **Public API** (`/api/public/news`) - тільки опубліковані новини, потребує API Key + Secret
   - **Admin API** (`/api/news`) - всі новини, потребує JWT або API Key

2. **Slug генерація:**
   - Slug генерується автоматично з `title`
   - Формат: lowercase, пробіли замінюються на `-`, видаляються спецсимволи
   - Приклад: `"Real Estate Market Update"` → `"real-estate-market-update"`

3. **Пагінація (Public API):**
   - Максимальний `limit`: 100
   - Мінімальний `limit`: 1
   - За замовчуванням: `page=1`, `limit=20`

4. **Сортування:**
   - Public API: за `publishedAt DESC` (найновіші спочатку)
   - Admin API: без сортування (всі новини)

5. **Контент (contents):**
   - Сортується за `order` (ASC)
   - Може містити різні типи: `text`, `image`, `video`
   - Кожен блок має свій `order` для правильного відображення

---

## 🧪 Тестування

### cURL приклади

```bash
# 1. Отримати список новин (Public API)
curl -X GET "https://admin.foryou-realestate.com/api/public/news?page=1&limit=20" \
  -H "x-api-key: your-api-key" \
  -H "x-api-secret: your-api-secret" \
  -H "Content-Type: application/json"

# 2. Отримати одну новину за slug
curl -X GET "https://admin.foryou-realestate.com/api/public/news/real-estate-market-update" \
  -H "x-api-key: your-api-key" \
  -H "x-api-secret: your-api-secret" \
  -H "Content-Type: application/json"

# 3. Отримати всі новини (Admin API з JWT)
curl -X GET "https://admin.foryou-realestate.com/api/news" \
  -H "Authorization: Bearer your-jwt-token" \
  -H "Content-Type: application/json"

# 4. Створити новину (Admin API)
curl -X POST "https://admin.foryou-realestate.com/api/news" \
  -H "Authorization: Bearer your-jwt-token" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "New Article",
    "description": "Article description",
    "imageUrl": "https://example.com/image.jpg",
    "isPublished": false
  }'
```

---

**Дата оновлення:** 2025-12-04  
**Версія API:** 1.0  
**Base URL:** `https://admin.foryou-realestate.com/api`


