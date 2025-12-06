# 🔐 Повний гайд API авторизації для мобільного додатку

## 📍 Base URL
```
https://admin.foryou-realestate.com/api
```

---

## 🔑 Основна інформація

### JWT Токен
- **Формат:** `Bearer <token>`
- **Тривалість:** 7 днів
- **Заголовок:** `Authorization: Bearer <token>`

### Content-Type
Всі запити мають заголовок:
```
Content-Type: application/json
```

---

## 📋 Endpoints

### 1. 🔐 Логін
**POST** `/auth/login`

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response (200 - Успіх):**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "f5f2c418-6cfe-4df6-8e28-9cd822c11861",
      "email": "user@example.com",
      "phone": "+971501234568",
      "firstName": "Investor",
      "lastName": "User",
      "role": "INVESTOR",
      "status": "ACTIVE",
      "licenseNumber": null,
      "avatar": null,
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  }
}
```

**Response (401 - Помилка):**
```json
{
  "success": false,
  "message": "Invalid credentials"
}
```

---

### 2. 📝 Реєстрація
**POST** `/auth/register`

**Request Body:**
```json
{
  "email": "user@example.com",
  "phone": "+971501234567",
  "password": "password123",
  "firstName": "John",
  "lastName": "Doe",
  "role": "CLIENT",
  "licenseNumber": "optional-for-broker"
}
```

**Обов'язкові поля:**
- `email` - унікальний email
- `phone` - унікальний телефон (формат: +971XXXXXXXXX)
- `password` - мінімум 8 символів
- `firstName` - ім'я
- `lastName` - прізвище
- `role` - одна з: `CLIENT`, `BROKER`, `INVESTOR`

**Спеціальні вимоги:**
- Для `BROKER` обов'язкове поле `licenseNumber`
- `CLIENT` автоматично отримує статус `ACTIVE`
- `BROKER` та `INVESTOR` отримують статус `PENDING` (потребують активації через адмін-панель)

**Response (201 - Успіх):**
```json
{
  "success": true,
  "message": "User created successfully",
  "data": {
    "user": {
      "id": "uuid-here",
      "email": "user@example.com",
      "phone": "+971501234567",
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

**Response (400 - Помилка валідації):**
```json
{
  "success": false,
  "message": "All required fields must be provided"
}
```

**Response (409 - Користувач вже існує):**
```json
{
  "success": false,
  "message": "User with this email or phone already exists"
}
```

---

### 3. 👤 Отримати поточного користувача
**GET** `/auth/me`

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Response (200 - Успіх):**
```json
{
  "success": true,
  "data": {
    "id": "f5f2c418-6cfe-4df6-8e28-9cd822c11861",
    "email": "user@example.com",
    "phone": "+971501234568",
    "firstName": "Investor",
    "lastName": "User",
    "role": "INVESTOR",
    "status": "ACTIVE",
    "licenseNumber": null,
    "avatar": null,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

**Response (401 - Не авторизовано):**
```json
{
  "success": false,
  "message": "User not found"
}
```

---

### 4. 🔑 Забули пароль
**POST** `/auth/forgot-password`

**Request Body:**
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

### 5. ✅ Перевірити код скидання
**POST** `/auth/verify-reset-code`

**Request Body:**
```json
{
  "email": "user@example.com",
  "code": "123456"
}
```

**Response (200 - Успіх):**
```json
{
  "success": true,
  "data": {
    "resetToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**Response (400 - Помилка):**
```json
{
  "success": false,
  "message": "Invalid or expired code"
}
```

**Примітка:** Код дійсний 15 хвилин.

---

### 6. 🔄 Скинути пароль
**POST** `/auth/reset-password`

**Request Body:**
```json
{
  "resetToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "newPassword": "newpassword123"
}
```

**Response (200 - Успіх):**
```json
{
  "success": true,
  "message": "Password reset successfully"
}
```

**Response (400 - Помилка):**
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

**Важливо:** Тільки користувачі зі статусом `ACTIVE` можуть використовувати додаток!

---

## 🧪 Тестові облікові дані

### INVESTOR (Інвестор)
```
Email: investor@foryou-realestate.com
Password: Investor123!
ID: f5f2c418-6cfe-4df6-8e28-9cd822c11861
Role: INVESTOR
Status: ACTIVE
```

### BROKER (Брокер)
```
Email: broker@foryou-realestate.com
Password: Broker123!
ID: b9177578-bcbf-4d6e-8f0e-1aa8977fd4d0
Role: BROKER
Status: ACTIVE
```

### ADMIN (Адміністратор)
```
Email: admin@foryou-realestate.com
Password: REDACTED_ADMIN_PASSWORD
Role: ADMIN
Status: ACTIVE
```

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

## 💻 Приклади коду

### React Native / Expo

```typescript
// Константи
const API_BASE_URL = 'https://admin.foryou-realestate.com/api';

// Типи
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

// 1. Логін
export const login = async (email: string, password: string): Promise<LoginResponse> => {
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password }),
  });
  
  const data = await response.json();
  
  if (!data.success) {
    throw new Error(data.message || 'Login failed');
  }
  
  // Зберегти токен
  await AsyncStorage.setItem('token', data.data.token);
  await AsyncStorage.setItem('user', JSON.stringify(data.data.user));
  
  return data;
};

// 2. Реєстрація
export const register = async (userData: {
  email: string;
  phone: string;
  password: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  licenseNumber?: string;
}): Promise<any> => {
  const response = await fetch(`${API_BASE_URL}/auth/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(userData),
  });
  
  const data = await response.json();
  
  if (!data.success) {
    throw new Error(data.message || 'Registration failed');
  }
  
  // Зберегти токен
  if (data.data.accessToken) {
    await AsyncStorage.setItem('token', data.data.accessToken);
  }
  await AsyncStorage.setItem('user', JSON.stringify(data.data.user));
  
  return data;
};

// 3. Отримати поточного користувача
export const getCurrentUser = async (): Promise<User> => {
  const token = await AsyncStorage.getItem('token');
  
  if (!token) {
    throw new Error('No token found');
  }
  
  const response = await fetch(`${API_BASE_URL}/auth/me`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
  
  const data = await response.json();
  
  if (!data.success) {
    throw new Error(data.message || 'Failed to fetch user');
  }
  
  return data.data;
};

// 4. Забули пароль
export const forgotPassword = async (email: string): Promise<any> => {
  const response = await fetch(`${API_BASE_URL}/auth/forgot-password`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email }),
  });
  
  return await response.json();
};

// 5. Перевірити код
export const verifyResetCode = async (email: string, code: string): Promise<string> => {
  const response = await fetch(`${API_BASE_URL}/auth/verify-reset-code`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, code }),
  });
  
  const data = await response.json();
  
  if (!data.success) {
    throw new Error(data.message || 'Invalid code');
  }
  
  return data.data.resetToken;
};

// 6. Скинути пароль
export const resetPassword = async (resetToken: string, newPassword: string): Promise<void> => {
  const response = await fetch(`${API_BASE_URL}/auth/reset-password`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ resetToken, newPassword }),
  });
  
  const data = await response.json();
  
  if (!data.success) {
    throw new Error(data.message || 'Password reset failed');
  }
};

// 7. Утиліта для захищених запитів
export const authenticatedFetch = async (url: string, options: RequestInit = {}): Promise<any> => {
  const token = await AsyncStorage.getItem('token');
  
  if (!token) {
    throw new Error('No token found');
  }
  
  const response = await fetch(`${API_BASE_URL}${url}`, {
    ...options,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  
  // Якщо 401 - токен невалідний, перенаправляємо на логін
  if (response.status === 401) {
    await AsyncStorage.removeItem('token');
    await AsyncStorage.removeItem('user');
    // Перенаправлення на екран логіну
    throw new Error('Unauthorized');
  }
  
  return await response.json();
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
7. **Токен дійсний 7 днів** - після цього потрібно повторний логін

---

## ✅ Чек-лист для інтеграції

- [ ] Налаштувати Base URL: `https://admin.foryou-realestate.com/api`
- [ ] Реалізувати логін з збереженням токена
- [ ] Реалізувати реєстрацію з валідацією полів
- [ ] Додати токен до всіх захищених запитів
- [ ] Реалізувати `/auth/me` для перевірки токена
- [ ] Обробити помилки 401 (перенаправлення на логін)
- [ ] Реалізувати forgot/reset password flow
- [ ] Перевіряти статус користувача (`ACTIVE` для доступу)
- [ ] Обробити різні ролі (`CLIENT`, `BROKER`, `INVESTOR`, `ADMIN`)
- [ ] Додати валідацію для `licenseNumber` для `BROKER`
- [ ] Обробити статус `PENDING` (показати повідомлення про очікування активації)

---

## 📱 Приклад використання в компоненті

```typescript
import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Button, Alert } from 'react-native';
import { login, getCurrentUser } from './api/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const LoginScreen = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    try {
      setLoading(true);
      const response = await login(email, password);
      
      // Перевірка статусу
      if (response.data.user.status !== 'ACTIVE') {
        Alert.alert(
          'Акаунт не активний',
          'Ваш акаунт очікує активації. Будь ласка, зверніться до адміністратора.'
        );
        return;
      }
      
      // Успішний логін - перенаправлення на головний екран
      Alert.alert('Успіх', 'Ви успішно увійшли!');
      // navigation.navigate('Home');
      
    } catch (error: any) {
      Alert.alert('Помилка', error.message || 'Не вдалося увійти');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View>
      <TextInput
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />
      <TextInput
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />
      <Button title="Увійти" onPress={handleLogin} disabled={loading} />
    </View>
  );
};
```

---

## 🔗 Додаткові ресурси

- **Health Check:** `GET /health` - перевірка стану API
- **Base URL:** `https://admin.foryou-realestate.com/api`

---

**Готово до використання! 🚀**


