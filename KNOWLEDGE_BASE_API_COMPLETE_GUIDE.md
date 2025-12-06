# 📚 Повний гайд API Knowledge Base (Courses) для мобільного додатку

## 📍 Base URL
```
https://admin.foryou-realestate.com/api
```

---

## 🔑 Автентифікація

Knowledge Base API підтримує **два методи автентифікації**:

### 1. JWT Token (для авторизованих користувачів)
```
Authorization: Bearer <token>
```

### 2. API Key (для публічного доступу)
```
x-api-key: <api-key>
```

**Примітка:** Для публічного API (`/api/public/courses`) потрібні обидва заголовки:
```
x-api-key: <api-key>
x-api-secret: <api-secret>
```

---

## 📋 Endpoints

### 1. 📋 Отримати список всіх курсів (Admin API)

**GET** `/api/courses`

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
      "title": "Real Estate Investment Guide",
      "description": "Complete guide to real estate investment in Dubai",
      "order": 1,
      "contents": [
        {
          "id": "123e4567-e89b-12d3-a456-426614174001",
          "type": "text",
          "title": "Introduction",
          "description": "Welcome to the real estate investment guide...",
          "imageUrl": null,
          "videoUrl": null,
          "order": 1
        },
        {
          "id": "123e4567-e89b-12d3-a456-426614174002",
          "type": "image",
          "title": "Market Overview",
          "description": null,
          "imageUrl": "https://example.com/chart.jpg",
          "videoUrl": null,
          "order": 2
        }
      ],
      "links": [
        {
          "id": "123e4567-e89b-12d3-a456-426614174003",
          "title": "External Resource",
          "url": "https://example.com/resource",
          "order": 1
        }
      ],
      "createdAt": "2024-01-15T10:00:00.000Z",
      "updatedAt": "2024-01-15T10:00:00.000Z"
    }
  ]
}
```

**Примітки:**
- Повертає всі курси
- Включає повний контент (`contents`) та посилання (`links`)
- Сортування не застосовується (всі курси)

---

### 2. 📄 Отримати один курс за ID (Admin API)

**GET** `/api/courses/:id`

**Автентифікація:** JWT Token або API Key

**Headers:**
```
Authorization: Bearer <token>
// АБО
x-api-key: <api-key>
Content-Type: application/json
```

**URL Parameters:**
- `id` (UUID) - ID курсу

**Response (200 - Успіх):**
```json
{
  "success": true,
  "data": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "title": "Real Estate Investment Guide",
    "description": "Complete guide to real estate investment",
    "order": 1,
    "contents": [
      {
        "id": "123e4567-e89b-12d3-a456-426614174001",
        "type": "text",
        "title": "Introduction",
        "description": "Welcome to the guide...",
        "imageUrl": null,
        "videoUrl": null,
        "order": 1
      }
    ],
    "links": [
      {
        "id": "123e4567-e89b-12d3-a456-426614174003",
        "title": "External Resource",
        "url": "https://example.com/resource",
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

### 3. ➕ Створити курс (Admin API)

**POST** `/api/courses`

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
  "title": "New Course Title",
  "description": "Course description",
  "order": 1,
  "contents": [
    {
      "type": "text",
      "title": "Introduction",
      "description": "Course introduction text...",
      "imageUrl": null,
      "videoUrl": null,
      "order": 1
    },
    {
      "type": "image",
      "title": "Chart",
      "description": null,
      "imageUrl": "https://example.com/chart.jpg",
      "videoUrl": null,
      "order": 2
    },
    {
      "type": "video",
      "title": "Video Tutorial",
      "description": null,
      "imageUrl": null,
      "videoUrl": "https://example.com/video.mp4",
      "order": 3
    }
  ],
  "links": [
    {
      "title": "External Resource",
      "url": "https://example.com/resource",
      "order": 1
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
    "title": "New Course Title",
    "description": "Course description",
    "order": 1,
    "contents": [
      {
        "id": "123e4567-e89b-12d3-a456-426614174001",
        "type": "text",
        "title": "Introduction",
        "description": "Course introduction text...",
        "imageUrl": null,
        "videoUrl": null,
        "order": 1
      }
    ],
    "links": [
      {
        "id": "123e4567-e89b-12d3-a456-426614174002",
        "title": "External Resource",
        "url": "https://example.com/resource",
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
  "message": "Failed to create course"
}
```

**Примітки:**
- `contents` - масив об'єктів контенту (опціонально)
- `links` - масив посилань (опціонально)
- `type` може бути: `"text"`, `"image"`, `"video"`
- `order` - порядок відображення (число)

---

### 4. ✏️ Оновити курс (Admin API)

**PATCH** `/api/courses/:id`

**Автентифікація:** JWT Token або API Key

**Headers:**
```
Authorization: Bearer <token>
// АБО
x-api-key: <api-key>
Content-Type: application/json
```

**URL Parameters:**
- `id` (UUID) - ID курсу

**Request Body:**
```json
{
  "title": "Updated Title",
  "order": 2
}
```

**Примітки:**
- Можна оновити будь-які поля частково
- `contents` та `links` не оновлюються через PATCH (потрібно окремо)

**Response (200 - Успіх):**
```json
{
  "success": true,
  "data": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "title": "Updated Title",
    "description": "Course description",
    "order": 2,
    "contents": [...],
    "links": [...],
    "createdAt": "2024-01-15T10:00:00.000Z",
    "updatedAt": "2024-01-15T11:00:00.000Z"
  }
}
```

---

### 5. 🗑️ Видалити курс (Admin API)

**DELETE** `/api/courses/:id`

**Автентифікація:** JWT Token або API Key

**Headers:**
```
Authorization: Bearer <token>
// АБО
x-api-key: <api-key>
Content-Type: application/json
```

**URL Parameters:**
- `id` (UUID) - ID курсу

**Response (200 - Успіх):**
```json
{
  "success": true,
  "message": "Course deleted",
  "data": null
}
```

**Примітки:**
- Видаляє курс та всі пов'язані `contents` та `links` (CASCADE)

---

### 6. 📋 Отримати список всіх курсів (Public API)

**GET** `/api/public/courses`

**Автентифікація:** API Key + Secret (обов'язково)

**Headers:**
```
x-api-key: <api-key>
x-api-secret: <api-secret>
Content-Type: application/json
```

**Response (200 - Успіх):**
```json
{
  "success": true,
  "data": [
    {
      "id": "123e4567-e89b-12d3-a456-426614174000",
      "title": "Real Estate Investment Guide",
      "description": "Complete guide to real estate investment",
      "order": 1,
      "contents": [
        {
          "id": "123e4567-e89b-12d3-a456-426614174001",
          "type": "text",
          "title": "Introduction",
          "description": "Welcome to the guide...",
          "imageUrl": null,
          "videoUrl": null,
          "order": 1
        }
      ],
      "links": [
        {
          "id": "123e4567-e89b-12d3-a456-426614174003",
          "title": "External Resource",
          "url": "https://example.com/resource",
          "order": 1
        }
      ],
      "createdAt": "2024-01-15T10:00:00.000Z",
      "updatedAt": "2024-01-15T10:00:00.000Z"
    }
  ]
}
```

**Примітки:**
- Повертає всі курси
- Сортування: за `order ASC` (від меншого до більшого)
- Включає повний контент (`contents`) та посилання (`links`)
- `contents` та `links` відсортовані за `order ASC`

---

### 7. 📄 Отримати один курс за ID (Public API)

**GET** `/api/public/courses/:id`

**Автентифікація:** API Key + Secret (обов'язково)

**Headers:**
```
x-api-key: <api-key>
x-api-secret: <api-secret>
Content-Type: application/json
```

**URL Parameters:**
- `id` (UUID) - ID курсу

**Response (200 - Успіх):**
```json
{
  "success": true,
  "data": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "title": "Real Estate Investment Guide",
    "description": "Complete guide to real estate investment",
    "order": 1,
    "contents": [
      {
        "id": "123e4567-e89b-12d3-a456-426614174001",
        "type": "text",
        "title": "Introduction",
        "description": "Welcome to the guide...",
        "imageUrl": null,
        "videoUrl": null,
        "order": 1
      }
    ],
    "links": [
      {
        "id": "123e4567-e89b-12d3-a456-426614174003",
        "title": "External Resource",
        "url": "https://example.com/resource",
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
  "success": false,
  "message": "Course not found"
}
```

**Примітки:**
- Повертає повний курс з усіма `contents` та `links`
- `contents` та `links` відсортовані за `order ASC`

---

## 📊 Структура даних

### Course (Курс)

```typescript
interface Course {
  id: string;                    // UUID
  title: string;                 // Заголовок курсу
  description: string;           // Опис курсу
  order: number;                 // Порядок відображення
  contents: CourseContent[];     // Масив контенту
  links: CourseLink[];          // Масив посилань
  createdAt: Date;              // Дата створення (ISO 8601)
  updatedAt: Date;              // Дата оновлення (ISO 8601)
}
```

### CourseContent (Контент курсу)

```typescript
interface CourseContent {
  id: string;                    // UUID
  courseId: string;             // ID курсу
  type: 'text' | 'image' | 'video';  // Тип контенту
  title: string;                 // Заголовок блоку
  description: string | null;    // Текстовий опис
  imageUrl: string | null;      // URL зображення (для type='image')
  videoUrl: string | null;      // URL відео (для type='video')
  order: number;                 // Порядок відображення
}
```

### CourseLink (Посилання курсу)

```typescript
interface CourseLink {
  id: string;                    // UUID
  courseId: string;             // ID курсу
  title: string;                // Назва посилання
  url: string;                  // URL посилання
  order: number;                // Порядок відображення
}
```

---

## 🔍 Типи контенту (ContentType)

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

// 1. Отримати список курсів (Public API)
async function getCourses() {
  const response = await fetch(`${API_BASE_URL}/public/courses`, {
    method: 'GET',
    headers: {
      'x-api-key': API_KEY,
      'x-api-secret': API_SECRET,
      'Content-Type': 'application/json',
    },
  });
  
  const data = await response.json();
  return data;
}

// 2. Отримати один курс за ID (Public API)
async function getCourseById(courseId: string) {
  const response = await fetch(`${API_BASE_URL}/public/courses/${courseId}`, {
    method: 'GET',
    headers: {
      'x-api-key': API_KEY,
      'x-api-secret': API_SECRET,
      'Content-Type': 'application/json',
    },
  });
  
  const data = await response.json();
  return data;
}

// 3. Отримати всі курси (Admin API з JWT)
async function getAllCourses(token: string) {
  const response = await fetch(`${API_BASE_URL}/courses`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
  
  const data = await response.json();
  return data;
}

// 4. Створити курс (Admin API)
async function createCourse(token: string, courseData: any) {
  const response = await fetch(`${API_BASE_URL}/courses`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(courseData),
  });
  
  const data = await response.json();
  return data;
}

// 5. Оновити курс (Admin API)
async function updateCourse(token: string, courseId: string, updates: any) {
  const response = await fetch(`${API_BASE_URL}/courses/${courseId}`, {
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

// 6. Видалити курс (Admin API)
async function deleteCourse(token: string, courseId: string) {
  const response = await fetch(`${API_BASE_URL}/courses/${courseId}`, {
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

// Отримати список курсів
export const getCourses = async () => {
  try {
    const response = await apiClient.get('/public/courses');
    return response.data;
  } catch (error) {
    console.error('Error fetching courses:', error);
    throw error;
  }
};

// Отримати один курс
export const getCourseById = async (courseId: string) => {
  try {
    const response = await apiClient.get(`/public/courses/${courseId}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching course:', error);
    throw error;
  }
};
```

---

### Flutter (Dart)

```dart
import 'package:http/http.dart' as http;
import 'dart:convert';

class KnowledgeBaseAPI {
  static const String baseUrl = 'https://admin.foryou-realestate.com/api';
  static const String apiKey = 'your-api-key';
  static const String apiSecret = 'your-api-secret';

  // Отримати список курсів
  static Future<Map<String, dynamic>> getCourses() async {
    final url = Uri.parse('$baseUrl/public/courses');
    
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
      throw Exception('Failed to load courses');
    }
  }

  // Отримати один курс
  static Future<Map<String, dynamic>> getCourseById(String courseId) async {
    final url = Uri.parse('$baseUrl/public/courses/$courseId');
    
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
      throw Exception('Failed to load course');
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
   - **Public API** (`/api/public/courses`) - всі курси, потребує API Key + Secret
   - **Admin API** (`/api/courses`) - всі курси, потребує JWT або API Key

2. **Сортування:**
   - Public API: за `order ASC` (від меншого до більшого)
   - Admin API: без сортування (всі курси)
   - `contents` та `links` завжди відсортовані за `order ASC`

3. **Контент (contents):**
   - Сортується за `order` (ASC)
   - Може містити різні типи: `text`, `image`, `video`
   - Кожен блок має свій `order` для правильного відображення

4. **Посилання (links):**
   - Сортується за `order` (ASC)
   - Кожне посилання має `title`, `url`, та `order`

5. **Порядок відображення:**
   - Курси відсортовані за `order` (ASC)
   - Контент всередині курсу відсортований за `order` (ASC)
   - Посилання всередині курсу відсортовані за `order` (ASC)

---

## 🧪 Тестування

### cURL приклади

```bash
# 1. Отримати список курсів (Public API)
curl -X GET "https://admin.foryou-realestate.com/api/public/courses" \
  -H "x-api-key: your-api-key" \
  -H "x-api-secret: your-api-secret" \
  -H "Content-Type: application/json"

# 2. Отримати один курс за ID
curl -X GET "https://admin.foryou-realestate.com/api/public/courses/123e4567-e89b-12d3-a456-426614174000" \
  -H "x-api-key: your-api-key" \
  -H "x-api-secret: your-api-secret" \
  -H "Content-Type: application/json"

# 3. Отримати всі курси (Admin API з JWT)
curl -X GET "https://admin.foryou-realestate.com/api/courses" \
  -H "Authorization: Bearer your-jwt-token" \
  -H "Content-Type: application/json"

# 4. Створити курс (Admin API)
curl -X POST "https://admin.foryou-realestate.com/api/courses" \
  -H "Authorization: Bearer your-jwt-token" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "New Course",
    "description": "Course description",
    "order": 1,
    "contents": [
      {
        "type": "text",
        "title": "Introduction",
        "description": "Course introduction...",
        "order": 1
      }
    ],
    "links": [
      {
        "title": "Resource",
        "url": "https://example.com",
        "order": 1
      }
    ]
  }'
```

---

**Дата оновлення:** 2025-12-04  
**Версія API:** 1.0  
**Base URL:** `https://admin.foryou-realestate.com/api`

