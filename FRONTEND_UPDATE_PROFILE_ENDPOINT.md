# 📱 Оновлення профілю користувача - Інструкції для фронтенду

## ✅ Статус деплою

**Endpoint успішно задеплоєно та працює!**

- ✅ SSL сертифікат встановлено
- ✅ Endpoint доступний через HTTPS
- ✅ Підтримка обох префіксів: `/api/auth` та `/api/v1/auth`

---

## 🔗 Endpoint URL

### Для мобільного додатку (з префіксом `/v1`):
```
PATCH https://admin.foryou-realestate.com/api/v1/auth/profile
```

### Для адмін панелі (без префіксу `/v1`):
```
PATCH https://admin.foryou-realestate.com/api/auth/profile
```

---

## 📋 Деталі Endpoint

### Метод
`PATCH`

### URL
- **Мобільний додаток:** `https://admin.foryou-realestate.com/api/v1/auth/profile`
- **Адмін панель:** `https://admin.foryou-realestate.com/api/auth/profile`

### Авторизація
**Обов'язкова!** Bearer token в заголовку:
```
Authorization: Bearer <JWT_TOKEN>
```

### Request Body (всі поля опціональні)
```json
{
  "firstName": "string",
  "lastName": "string",
  "email": "string",
  "phone": "string",
  "licenseNumber": "string",
  "avatar": "string"
}
```

### Response (Success - 200)
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "phone": "+1234567890",
      "firstName": "John",
      "lastName": "Doe",
      "role": "CLIENT",
      "status": "ACTIVE",
      "licenseNumber": "12345",
      "avatar": "https://...",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  },
  "message": "Profile updated successfully"
}
```

### Response (Error - 401 Unauthorized)
```json
{
  "message": "Unauthorized: No authorization header"
}
```

### Response (Error - 409 Conflict)
```json
{
  "success": false,
  "message": "Email is already taken"
}
```
або
```json
{
  "success": false,
  "message": "Phone is already taken"
}
```

---

## 💻 Приклад використання в коді

### JavaScript/TypeScript (axios)
```typescript
import axios from 'axios';

const updateProfile = async (profileData: {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  licenseNumber?: string;
  avatar?: string;
}) => {
  const token = localStorage.getItem('token');
  
  try {
    const response = await axios.patch(
      'https://admin.foryou-realestate.com/api/v1/auth/profile',
      profileData,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    return response.data;
  } catch (error) {
    if (error.response?.status === 401) {
      // Redirect to login
      window.location.href = '/login';
    }
    throw error;
  }
};

// Використання
await updateProfile({
  firstName: 'John',
  lastName: 'Doe',
  email: 'john@example.com'
});
```

### Fetch API
```javascript
const updateProfile = async (profileData) => {
  const token = localStorage.getItem('token');
  
  const response = await fetch(
    'https://admin.foryou-realestate.com/api/v1/auth/profile',
    {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(profileData)
    }
  );
  
  if (response.status === 401) {
    window.location.href = '/login';
    return;
  }
  
  return await response.json();
};
```

---

## 🔧 Оновлення в адмін панелі (admin-panel)

### Файл: `admin-panel/src/lib/api.ts`

**Поточний код вже правильний!** Він автоматично визначає URL на основі домену:
- Якщо домен `admin.foryou-realestate.com` → використовує `/api`
- Якщо потрібен `/v1` префікс для мобільного додатку → додайте окремий метод

### Якщо потрібно додати метод для оновлення профілю:

```typescript
// Додайте в admin-panel/src/lib/api.ts

export const updateUserProfile = async (profileData: {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  licenseNumber?: string;
  avatar?: string;
}) => {
  return api.patch('/auth/profile', profileData);
};
```

### Використання в компоненті:

```typescript
import { updateUserProfile } from '@/lib/api';

const handleSave = async () => {
  try {
    const result = await updateUserProfile({
      firstName: formData.firstName,
      lastName: formData.lastName,
      email: formData.email,
      phone: formData.phone,
      licenseNumber: formData.licenseNumber,
      avatar: formData.avatar
    });
    
    console.log('Profile updated:', result.data.user);
    // Показати повідомлення про успіх
  } catch (error) {
    console.error('Error updating profile:', error);
    // Показати повідомлення про помилку
  }
};
```

---

## 📱 Оновлення в мобільному додатку

### Якщо використовується `mobile/api/backend-client.ts`:

```typescript
// Оновіть BASE_URL якщо потрібно
const BASE_URL = 'https://admin.foryou-realestate.com/api/v1';

// Додайте метод
export const updateProfile = async (profileData: {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  licenseNumber?: string;
  avatar?: string;
}) => {
  const token = await getToken(); // Ваш метод отримання токену
  
  const response = await fetch(`${BASE_URL}/auth/profile`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(profileData)
  });
  
  if (!response.ok) {
    if (response.status === 401) {
      // Redirect to login
      await logout();
      return;
    }
    throw new Error('Failed to update profile');
  }
  
  return await response.json();
};
```

---

## ✅ Чек-лист для фронтенду

- [ ] Перевірити, що URL правильний: `https://admin.foryou-realestate.com/api/v1/auth/profile` (для мобільного) або `/api/auth/profile` (для адмін панелі)
- [ ] Додати метод `updateProfile` в API клієнт
- [ ] Переконатися, що токен передається в заголовку `Authorization: Bearer <token>`
- [ ] Обробити помилки 401 (перенаправлення на логін)
- [ ] Обробити помилки 409 (email/phone вже зайняті)
- [ ] Додати валідацію email та phone перед відправкою
- [ ] Показати повідомлення про успіх/помилку після оновлення
- [ ] Оновити дані користувача в UI після успішного оновлення

---

## 🧪 Тестування

### Тест через curl:
```bash
# Отримати токен через логін
TOKEN=$(curl -s -X POST https://admin.foryou-realestate.com/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password"}' | jq -r '.data.token')

# Оновити профіль
curl -X PATCH https://admin.foryou-realestate.com/api/v1/auth/profile \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "John",
    "lastName": "Doe",
    "email": "john@example.com"
  }'
```

---

## 📝 Важливі примітки

1. **Всі поля опціональні** - можна оновлювати тільки потрібні поля
2. **Валідація унікальності** - email та phone перевіряються на унікальність (крім поточного користувача)
3. **Автоматичне оновлення** - поле `updatedAt` оновлюється автоматично
4. **Безпека** - endpoint захищений JWT токеном, без токену повертає 401

---

**Дата оновлення:** 2025-11-29  
**Версія API:** v1  
**Статус:** ✅ Готово до використання

