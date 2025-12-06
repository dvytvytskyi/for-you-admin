# 🔐 API Авторизації для Мобільного Додатку

## 📍 Base URL
```
https://admin.foryou-realestate.com/api

```

---

## 🔑 Автентифікація

Всі захищені endpoints вимагають JWT токен в заголовку:
```
Authorization: Bearer <token>
```

**Токен дійсний 7 днів** після логіну/реєстрації.

---

## 📋 Endpoints

### 1. Логін
**POST** `/auth/login`

**Request:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response (200):**
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

**Response (401):**
```json
{
  "success": false,
  "message": "Invalid credentials"
}
```

---

### 2. Реєстрація
**POST** `/auth/register`

**Request:**
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
- Інші ролі (`BROKER`, `INVESTOR`) отримують статус `PENDING` (потребують активації через адмін-панель)

**Response (201):**
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

**Response (400):**
```json
{
  "success": false,
  "message": "All required fields must be provided"
}
```

**Response (409):**
```json
{
  "success": false,
  "message": "User with this email or phone already exists"
}
```

---

### 3. Отримати поточного користувача
**GET** `/auth/me`

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "success": true,
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

**Response (401):**
```json
{
  "success": false,
  "message": "User not found"
}
```

---

### 4. Забули пароль
**POST** `/auth/forgot-password`

**Request:**
```json
{
  "email": "user@example.com"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "If the email exists, a password reset code has been sent"
}
```

**Примітка:** Завжди повертає успіх (безпека - не розкриває, чи існує email).

---

### 5. Перевірити код скидання
**POST** `/auth/verify-reset-code`

**Request:**
```json
{
  "email": "user@example.com",
  "code": "123456"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "resetToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**Response (400):**
```json
{
  "success": false,
  "message": "Invalid or expired code"
}
```

**Примітка:** Код дійсний 15 хвилин.

---

### 6. Скинути пароль
**POST** `/auth/reset-password`

**Request:**
```json
{
  "resetToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "newPassword": "newpassword123"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Password reset successfully"
}
```

**Response (400):**
```json
{
  "success": false,
  "message": "Password must be at least 8 characters long"
}
```

---

## 👥 Ролі користувачів

### Доступні ролі:
- **`CLIENT`** - Звичайний клієнт (автоматично `ACTIVE`)
- **`BROKER`** - Брокер (потребує `licenseNumber`, статус `PENDING` до активації)
- **`INVESTOR`** - Інвестор (статус `PENDING` до активації)
- **`ADMIN`** - Адміністратор (створюється через адмін-панель)

---

## 📊 Статуси користувачів

### Доступні статуси:
- **`PENDING`** - Очікує активації (для `BROKER` та `INVESTOR` після реєстрації)
- **`ACTIVE`** - Активний (для `CLIENT` автоматично, для інших - після активації адміном)
- **`BLOCKED`** - Заблокований
- **`REJECTED`** - Відхилений

---

## 🔒 Обробка помилок

### Стандартні HTTP статуси:
- **200** - Успіх
- **201** - Створено (реєстрація)
- **400** - Помилка валідації
- **401** - Не авторизовано (неправильні credentials або відсутній токен)
- **403** - Заборонено (невалідний токен)
- **404** - Не знайдено
- **409** - Конфлікт (користувач вже існує)
- **500** - Помилка сервера

### Формат помилки:
```json
{
  "success": false,
  "message": "Error message here"
}
```

---

## 💡 Приклади використання

### React Native / Expo приклад:

```typescript
// 1. Логін
const login = async (email: string, password: string) => {
  const response = await fetch('https://admin.foryou-realestate.com/api/auth/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password }),
  });
  
  const data = await response.json();
  
  if (data.success) {
    // Зберегти токен
    await AsyncStorage.setItem('token', data.data.token);
    await AsyncStorage.setItem('user', JSON.stringify(data.data.user));
    return data.data;
  } else {
    throw new Error(data.message);
  }
};

// 2. Реєстрація
const register = async (userData: {
  email: string;
  phone: string;
  password: string;
  firstName: string;
  lastName: string;
  role: 'CLIENT' | 'BROKER' | 'INVESTOR';
  licenseNumber?: string;
}) => {
  const response = await fetch('https://admin.foryou-realestate.com/api/auth/register', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(userData),
  });
  
  const data = await response.json();
  
  if (data.success) {
    await AsyncStorage.setItem('token', data.data.accessToken);
    await AsyncStorage.setItem('user', JSON.stringify(data.data.user));
    return data.data;
  } else {
    throw new Error(data.message);
  }
};

// 3. Отримати поточного користувача
const getCurrentUser = async () => {
  const token = await AsyncStorage.getItem('token');
  
  if (!token) {
    throw new Error('No token found');
  }
  
  const response = await fetch('https://admin.foryou-realestate.com/api/auth/me', {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
  
  const data = await response.json();
  
  if (data.success) {
    return data.data;
  } else {
    throw new Error(data.message);
  }
};

// 4. Забули пароль
const forgotPassword = async (email: string) => {
  const response = await fetch('https://admin.foryou-realestate.com/api/auth/forgot-password', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email }),
  });
  
  const data = await response.json();
  return data;
};

// 5. Перевірити код
const verifyResetCode = async (email: string, code: string) => {
  const response = await fetch('https://admin.foryou-realestate.com/api/auth/verify-reset-code', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, code }),
  });
  
  const data = await response.json();
  
  if (data.success) {
    return data.data.resetToken;
  } else {
    throw new Error(data.message);
  }
};

// 6. Скинути пароль
const resetPassword = async (resetToken: string, newPassword: string) => {
  const response = await fetch('https://admin.foryou-realestate.com/api/auth/reset-password', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ resetToken, newPassword }),
  });
  
  const data = await response.json();
  
  if (data.success) {
    return true;
  } else {
    throw new Error(data.message);
  }
};
```

---

## 🎯 Важливі моменти

1. **Токен зберігайте безпечно** (AsyncStorage, SecureStore, Keychain)
2. **Додавайте токен до всіх захищених запитів** в заголовку `Authorization: Bearer <token>`
3. **Перевіряйте статус користувача** - тільки `ACTIVE` користувачі можуть використовувати додаток
4. **Обробляйте 401 помилки** - якщо токен невалідний, перенаправляйте на логін
5. **Для BROKER обов'язкове поле `licenseNumber`** при реєстрації
6. **CLIENT автоматично активний**, інші ролі потребують активації через адмін-панель

---

## 📱 Типи для TypeScript

```typescript
export enum UserRole {
  CLIENT = 'CLIENT',
  BROKER = 'BROKER',
  INVESTOR = 'INVESTOR',
  ADMIN = 'ADMIN',
}

export enum UserStatus {
  PENDING = 'PENDING',
  ACTIVE = 'ACTIVE',
  BLOCKED = 'BLOCKED',
  REJECTED = 'REJECTED',
}

export interface User {
  id: string;
  email: string;
  phone: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  status: UserStatus;
  licenseNumber?: string | null;
  avatar?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface LoginResponse {
  success: boolean;
  message: string;
  data: {
    token: string;
    user: User;
  };
}

export interface RegisterResponse {
  success: boolean;
  message: string;
  data: {
    user: User;
    accessToken: string;
  };
}
```

---

## ✅ Чек-лист для інтеграції

- [ ] Налаштувати Base URL
- [ ] Реалізувати логін з збереженням токена
- [ ] Реалізувати реєстрацію з валідацією полів
- [ ] Додати токен до всіх захищених запитів
- [ ] Реалізувати `/auth/me` для перевірки токена
- [ ] Обробити помилки 401 (перенаправлення на логін)
- [ ] Реалізувати forgot/reset password flow
- [ ] Перевіряти статус користувача (`ACTIVE` для доступу)
- [ ] Обробити різні ролі (`CLIENT`, `BROKER`, `INVESTOR`, `ADMIN`)
- [ ] Додати валідацію для `licenseNumber` для `BROKER`

