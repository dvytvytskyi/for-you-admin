# API Документація для інтеграції з мобільним додатком

## 🔗 API Конфігурація

### Base URL
```
https://foryou-realestate.com/api
```

### Автентифікація
API використовує **JWT токени** для авторизації. Токен передається в заголовку:
```
Authorization: Bearer <token>
```

---

## 📋 Endpoints для авторизації

### 1. Логін
**Endpoint:** `POST /auth/login`

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response (Success - 200):**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "uuid-here",
      "email": "user@example.com",
      "phone": "+380501234567",
      "firstName": "John",
      "lastName": "Doe",
      "role": "CLIENT",
      "status": "ACTIVE",
      "licenseNumber": null,
      "avatar": "https://...",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  }
}
```

**Response (Error - 401):**
```json
{
  "success": false,
  "message": "Invalid credentials"
}
```

**Примітки:**
- Токен дійсний **7 днів**
- Пароль не повертається в відповіді
- Якщо email/password відповідають `ADMIN_EMAIL`/`ADMIN_PASSWORD` з env, повертається ADMIN роль

---

### 2. Реєстрація
**Endpoint:** `POST /auth/register`

**Request Body:**
```json
{
  "email": "user@example.com",
  "phone": "+380501234567",
  "password": "password123",
  "firstName": "John",
  "lastName": "Doe",
  "role": "CLIENT",
  "licenseNumber": "optional-for-broker"
}
```

**Обов'язкові поля:**
- `email` - унікальний email
- `phone` - унікальний телефон
- `password` - мінімум 8 символів
- `firstName` - ім'я
- `lastName` - прізвище
- `role` - одна з: `CLIENT`, `BROKER`, `INVESTOR`, `ADMIN`

**Спеціальні вимоги:**
- Для `BROKER` обов'язкове поле `licenseNumber`
- `CLIENT` автоматично отримує статус `ACTIVE`
- Інші ролі отримують статус `PENDING` (потребують активації через адмін-панель)

**Response (Success - 201):**
```json
{
  "success": true,
  "message": "User created successfully",
  "data": {
    "user": {
      "id": "uuid-here",
      "email": "user@example.com",
      "phone": "+380501234567",
      "firstName": "John",
      "lastName": "Doe",
      "role": "CLIENT",
      "status": "ACTIVE",
      "licenseNumber": null,
      "avatar": null,
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**Response (Error - 400):**
```json
{
  "success": false,
  "message": "All required fields must be provided"
}
```

**Response (Error - 409):**
```json
{
  "success": false,
  "message": "User with this email or phone already exists"
}
```

---

### 3. Отримання поточного користувача
**Endpoint:** `GET /auth/me`

**Headers:**
```
Authorization: Bearer <token>
```

**Response (Success - 200):**
```json
{
  "success": true,
  "message": "Success",
  "data": {
    "id": "uuid-here",
    "email": "user@example.com",
    "phone": "+380501234567",
    "firstName": "John",
    "lastName": "Doe",
    "role": "CLIENT",
    "status": "ACTIVE",
    "licenseNumber": null,
    "avatar": "https://...",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

**Response (Error - 401):**
```json
{
  "success": false,
  "message": "User not found"
}
```

---

### 4. Забули пароль
**Endpoint:** `POST /auth/forgot-password`

**Request Body:**
```json
{
  "email": "user@example.com"
}
```

**Response (Success - 200):**
```json
{
  "success": true,
  "message": "If the email exists, a password reset code has been sent",
  "data": null
}
```

**Примітки:**
- Завжди повертає success (безпека - не розкриває чи існує email)
- Надсилає 6-значний код на email
- Код дійсний 15 хвилин

---

### 5. Перевірка коду скидання пароля
**Endpoint:** `POST /auth/verify-reset-code`

**Request Body:**
```json
{
  "email": "user@example.com",
  "code": "123456"
}
```

**Response (Success - 200):**
```json
{
  "success": true,
  "message": "Success",
  "data": {
    "resetToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**Response (Error - 400):**
```json
{
  "success": false,
  "message": "Invalid or expired code"
}
```

---

### 6. Скидання пароля
**Endpoint:** `POST /auth/reset-password`

**Request Body:**
```json
{
  "resetToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "newPassword": "newpassword123"
}
```

**Вимоги до пароля:**
- Мінімум 8 символів

**Response (Success - 200):**
```json
{
  "success": true,
  "message": "Password reset successfully",
  "data": null
}
```

**Response (Error - 400):**
```json
{
  "success": false,
  "message": "Invalid or expired reset token"
}
```

---

## 👤 Структура User об'єкта

```typescript
interface User {
  id: string;                    // UUID
  email: string;                  // Унікальний email
  phone: string;                  // Унікальний телефон
  firstName: string;              // Ім'я
  lastName: string;               // Прізвище
  role: UserRole;                // Роль користувача
  status: UserStatus;            // Статус користувача
  licenseNumber?: string;        // Номер ліцензії (для BROKER)
  googleId?: string;             // Google ID (для OAuth)
  appleId?: string;               // Apple ID (для OAuth)
  avatar?: string;               // URL аватара
  createdAt: Date;               // Дата створення
  updatedAt: Date;               // Дата оновлення
}
```

### UserRole Enum
```typescript
enum UserRole {
  CLIENT = 'CLIENT',      // Клієнт
  BROKER = 'BROKER',      // Брокер
  INVESTOR = 'INVESTOR',  // Інвестор
  ADMIN = 'ADMIN'         // Адміністратор
}
```

### UserStatus Enum
```typescript
enum UserStatus {
  PENDING = 'PENDING',    // Очікує активації
  ACTIVE = 'ACTIVE',      // Активний
  BLOCKED = 'BLOCKED',    // Заблокований
  REJECTED = 'REJECTED'   // Відхилений
}
```

---

## 🔐 Як працює авторизація

### JWT Token
- **Алгоритм:** HS256
- **Термін дії:** 7 днів
- **Payload:**
  ```json
  {
    "id": "user-uuid",
    "email": "user@example.com",
    "role": "CLIENT"
  }
  ```

### Використання токена
Всі захищені endpoints вимагають заголовок:
```
Authorization: Bearer <token>
```

### Перевірка токена
Якщо токен невалідний або відсутній:
- **401 Unauthorized** - відсутній заголовок або токен
- **403 Forbidden** - токен невалідний або прострочений

---

## 📊 Коди відповідей

| Код | Опис |
|-----|------|
| 200 | Успішний запит |
| 201 | Ресурс створено |
| 400 | Невірний запит (відсутні поля, невалідні дані) |
| 401 | Не авторизовано (відсутній або невалідний токен) |
| 403 | Заборонено (невалідний API ключ, недостатньо прав) |
| 404 | Ресурс не знайдено |
| 409 | Конфлікт (користувач вже існує) |
| 500 | Помилка сервера |

---

## 🔄 Варіанти інтеграції

### Варіант 1: Проксі через ваш Backend (Рекомендовано)
```
Mobile App → Ваш NestJS Backend → Admin Panel API
```

**Переваги:**
- Централізована обробка помилок
- Можливість додати додаткову логіку
- Безпечніше (токени не передаються в мобільний додаток напряму)
- Можливість кешування

**Приклад реалізації в NestJS:**
```typescript
@Post('auth/login')
async login(@Body() loginDto: { email: string; password: string }) {
  const response = await axios.post(
    'https://foryou-realestate.com/api/auth/login',
    loginDto
  );
  return response.data;
}

@Get('auth/me')
@UseGuards(JwtAuthGuard)
async getMe(@Req() req) {
  const token = req.headers.authorization?.split(' ')[1];
  const response = await axios.get(
    'https://foryou-realestate.com/api/auth/me',
    {
      headers: { Authorization: `Bearer ${token}` }
    }
  );
  return response.data;
}
```

---

### Варіант 2: Пряме підключення
```
Mobile App → Admin Panel API (напряму)
```

**Переваги:**
- Простіше реалізувати
- Менше навантаження на ваш backend

**Недоліки:**
- Токени передаються в мобільний додаток
- Складніше обробляти помилки
- Немає можливості додати додаткову логіку

---

## 📝 Приклади запитів

### cURL - Логін
```bash
curl -X POST https://foryou-realestate.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password123"
  }'
```

### cURL - Отримання поточного користувача
```bash
curl -X GET https://foryou-realestate.com/api/auth/me \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### cURL - Реєстрація
```bash
curl -X POST https://foryou-realestate.com/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "newuser@example.com",
    "phone": "+380501234567",
    "password": "password123",
    "firstName": "John",
    "lastName": "Doe",
    "role": "CLIENT"
  }'
```

---

## 🚨 Обробка помилок

### Типові помилки та їх обробка

**1. Невалідні облікові дані (401)**
```json
{
  "success": false,
  "message": "Invalid credentials"
}
```
→ Показати користувачу повідомлення про невірний email/пароль

**2. Користувач не знайдений (404)**
```json
{
  "success": false,
  "message": "User not found"
}
```
→ Перенаправити на екран реєстрації

**3. Користувач вже існує (409)**
```json
{
  "success": false,
  "message": "User with this email or phone already exists"
}
```
→ Показати повідомлення та запропонувати вхід

**4. Невалідний токен (403)**
```json
{
  "message": "Invalid token: ..."
}
```
→ Перенаправити на екран логіну, очистити збережений токен

**5. Помилка сервера (500)**
```json
{
  "success": false,
  "message": "Failed to ..."
}
```
→ Показати загальне повідомлення про помилку, спробувати повторити

---

## ✅ Чек-лист інтеграції

- [ ] Налаштувати Base URL: `https://foryou-realestate.com/api`
- [ ] Реалізувати `/auth/login` endpoint
- [ ] Реалізувати `/auth/register` endpoint
- [ ] Реалізувати `/auth/me` endpoint
- [ ] Зберігати JWT токен після логіну
- [ ] Додавати токен в заголовок `Authorization: Bearer <token>` для захищених запитів
- [ ] Обробляти помилки 401/403 (перенаправлення на логін)
- [ ] Реалізувати refresh token логіку (якщо потрібно)
- [ ] Обробляти статуси користувача (PENDING, BLOCKED, REJECTED)
- [ ] Тестувати всі сценарії (логін, реєстрація, помилки)

---

## 📞 Додаткова інформація

### Health Check
**Endpoint:** `GET /health`

Перевірка доступності API:
```bash
curl https://foryou-realestate.com/api/health
```

### Створення користувачів
- Всі користувачі створюються через `/auth/register` або через адмін-панель
- Користувачі з роллю `CLIENT` автоматично отримують статус `ACTIVE`
- Користувачі з ролями `BROKER` та `INVESTOR` отримують статус `PENDING` (потребують активації через адмін-панель)

### Синхронізація
- Всі користувачі зберігаються в одній базі даних
- Адмін-панель та мобільний додаток використовують одну базу даних
- Зміни в адмін-панелі відображаються в мобільному додатку миттєво

---

**Останнє оновлення:** 2024-11-25
**Версія API:** 1.0

