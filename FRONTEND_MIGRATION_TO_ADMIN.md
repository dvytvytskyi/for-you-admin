# 🔄 Міграція на admin.foryou-realestate.com

## ✅ Що зроблено:

### 1. Налаштовано редирект з `foryou-realestate.com` на `admin.foryou-realestate.com`

**Конфігурація Nginx:**
- `foryou-realestate.com` → редирект на `admin.foryou-realestate.com`
- `www.foryou-realestate.com` → редирект на `admin.foryou-realestate.com`

**Результат:** Всі запити з `foryou-realestate.com` автоматично перенаправляються на `admin.foryou-realestate.com`

---

## 📋 Оновлення для фронтенду:

### 1. Оновіть базовий URL для всіх запитів:

**Було:**
```typescript
const BACKEND_API_URL = 'https://foryou-realestate.com/api/v1';
```

**Стало:**
```typescript
const BACKEND_API_URL = 'https://admin.foryou-realestate.com/api/v1';
```

### 2. Оновіть URL для updateProfile:

**Було:**
```typescript
const updateProfile = async (data) => {
  // Спробувати через admin
  try {
    return await fetch('https://admin.foryou-realestate.com/api/v1/auth/profile', {...});
  } catch {
    // Fallback на foryou
    return await fetch('https://foryou-realestate.com/api/v1/auth/profile', {...});
  }
};
```

**Стало:**
```typescript
const updateProfile = async (data) => {
  return await fetch('https://admin.foryou-realestate.com/api/v1/auth/profile', {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(data)
  });
};
```

---

## 🔗 Всі endpoint тепер доступні через:

### Базовий URL:
```
https://admin.foryou-realestate.com/api/v1
```

### Приклади endpoint:

1. **Авторизація:**
   - `POST https://admin.foryou-realestate.com/api/v1/auth/login`
   - `GET https://admin.foryou-realestate.com/api/v1/auth/me`
   - `PATCH https://admin.foryou-realestate.com/api/v1/auth/profile`

2. **Properties:**
   - `GET https://admin.foryou-realestate.com/api/v1/properties`
   - `GET https://admin.foryou-realestate.com/api/v1/properties/:id`

3. **Public API:**
   - `GET https://admin.foryou-realestate.com/api/v1/public/data`

4. **Collections:**
   - `GET https://admin.foryou-realestate.com/api/v1/collections`
   - `POST https://admin.foryou-realestate.com/api/v1/collections`

5. **Favorites:**
   - `GET https://admin.foryou-realestate.com/api/v1/favorites`
   - `POST https://admin.foryou-realestate.com/api/v1/favorites/:propertyId`

---

## 💻 Приклад оновлення коду:

### backend-client.ts (мобільний додаток):

```typescript
// Оновіть базовий URL
const BASE_URL = 'https://admin.foryou-realestate.com/api/v1';

// Або використовуйте змінну оточення
const BASE_URL = process.env.BACKEND_API_URL || 'https://admin.foryou-realestate.com/api/v1';

// Всі методи залишаються без змін, тільки BASE_URL оновлюється
export const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// updateProfile тепер використовує той самий BASE_URL
export const updateProfile = async (profileData: {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  licenseNumber?: string;
  avatar?: string;
}) => {
  const token = await getToken();
  
  return apiClient.patch('/auth/profile', profileData, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });
};
```

### api.ts (адмін панель):

```typescript
// Вже налаштовано правильно
const getApiUrl = () => {
  if (typeof window !== 'undefined') {
    const origin = window.location.origin;
    
    if (origin.includes('admin.foryou-realestate.com')) {
      return origin + '/api'; // https://admin.foryou-realestate.com/api
    }
  }
  
  return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';
};

// Для endpoint з /v1 префіксом
export const apiV1 = axios.create({
  baseURL: getApiUrl().replace('/api', '/api/v1'),
  headers: {
    'Content-Type': 'application/json',
  },
});
```

---

## ✅ Перевірка після оновлення:

### 1. Перевірте базовий URL:
```bash
curl https://admin.foryou-realestate.com/api/v1/auth/profile \
  -X PATCH \
  -H "Content-Type: application/json" \
  -d '{}'
# Має повернути: {"message":"Unauthorized: No authorization header"}
```

### 2. Перевірте редирект:
```bash
curl -I http://foryou-realestate.com/api/v1/auth/profile
# Має повернути: Location: https://admin.foryou-realestate.com/api/v1/auth/profile
```

### 3. Перевірте всі основні endpoint:
- ✅ Login
- ✅ Get user profile
- ✅ Update profile
- ✅ Get properties
- ✅ Get public data

---

## 🎯 Чек-лист для фронтенду:

- [ ] Оновити `BACKEND_API_URL` на `https://admin.foryou-realestate.com/api/v1`
- [ ] Видалити fallback на `foryou-realestate.com` з `updateProfile`
- [ ] Оновити всі виклики API для використання нового URL
- [ ] Перевірити що всі endpoint працюють
- [ ] Оновити документацію/коментарі в коді
- [ ] Протестувати на різних пристроях

---

## 📝 Важливі примітки:

1. **Редирект працює автоматично** - старі URL будуть перенаправлятися на нові
2. **SSL сертифікат** вже встановлено для `admin.foryou-realestate.com`
3. **Всі endpoint доступні** через обидва префікси:
   - `/api/v1/...` (для мобільного додатку)
   - `/api/...` (для адмін панелі)

---

**Дата міграції:** 2025-11-29  
**Статус:** ✅ Готово до використання















