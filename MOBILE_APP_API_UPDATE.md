# 📱 Оновлення API URL для мобільного додатку

## 🔍 Ситуація після міграції на новий сервер

### Що змінилося:
- **Старий сервер:** `88.99.38.25` (більше не працює)
- **Новий сервер:** `135.181.201.185` (поточний)
- **Домен:** `admin.foryou-realestate.com` (залишився той самий ✅)

---

## ✅ Коли НЕ потрібно нічого міняти:

### Якщо додаток використовує домен (рекомендовано):
```typescript
// ✅ ПРАВИЛЬНО - використовує домен
const API_BASE_URL = 'https://admin.foryou-realestate.com/api';
// або
const API_BASE_URL = 'https://admin.foryou-realestate.com/api/v1';
```

**Чому не потрібно міняти:**
- Домен `admin.foryou-realestate.com` залишився той самий
- DNS автоматично вказує на новий сервер
- Всі endpoint працюють так само

---

## ⚠️ Коли ПОТРІБНО оновити:

### 1. Якщо додаток використовував прямий IP адресу:

**Було (не працює):**
```typescript
// ❌ НЕПРАВИЛЬНО - використовує старий IP
const API_BASE_URL = 'http://88.99.38.25:4000/api';
// або
const API_BASE_URL = 'https://88.99.38.25/api';
```

**Стало (правильно):**
```typescript
// ✅ ПРАВИЛЬНО - використовує домен
const API_BASE_URL = 'https://admin.foryou-realestate.com/api';
// або
const API_BASE_URL = 'https://admin.foryou-realestate.com/api/v1';
```

---

### 2. Якщо додаток використовував старий домен без `admin.`:

**Було (може не працювати):**
```typescript
// ⚠️ МОЖЛИВО НЕ ПРАЦЮЄ - старий домен
const API_BASE_URL = 'https://foryou-realestate.com/api';
// або
const API_BASE_URL = 'https://foryou-realestate.com/api/v1';
```

**Стало (правильно):**
```typescript
// ✅ ПРАВИЛЬНО - новий домен з admin.
const API_BASE_URL = 'https://admin.foryou-realestate.com/api';
// або
const API_BASE_URL = 'https://admin.foryou-realestate.com/api/v1';
```

**Примітка:** Старий домен `foryou-realestate.com` може мати редирект, але краще використовувати `admin.foryou-realestate.com` напряму.

---

## 🔧 Як перевірити, який URL використовує додаток:

### 1. Перевірте файли конфігурації:

**Шукайте в коді:**
```bash
# У проекті мобільного додатку шукайте:
grep -r "88.99.38.25" .
grep -r "foryou-realestate.com" .
grep -r "API_BASE_URL\|BASE_URL\|API_URL" .
```

**Типові місця:**
- `src/config/api.ts`
- `src/services/api.ts`
- `src/lib/api.ts`
- `.env` файли
- `constants.ts` або `config.ts`

---

### 2. Перевірте, який URL використовується:

**Приклад для React Native:**
```typescript
// src/config/api.ts
export const API_BASE_URL = 'https://admin.foryou-realestate.com/api';
```

**Приклад для Flutter:**
```dart
// lib/config/api_config.dart
const String API_BASE_URL = 'https://admin.foryou-realestate.com/api';
```

**Приклад для iOS (Swift):**
```swift
// Config.swift
let API_BASE_URL = "https://admin.foryou-realestate.com/api"
```

**Приклад для Android (Kotlin):**
```kotlin
// ApiConfig.kt
const val API_BASE_URL = "https://admin.foryou-realestate.com/api"
```

---

## 📋 Правильні URL для використання:

### Варіант 1: Без префіксу `/v1` (рекомендовано)
```typescript
const API_BASE_URL = 'https://admin.foryou-realestate.com/api';
```

**Endpoints:**
- `POST ${API_BASE_URL}/auth/login`
- `GET ${API_BASE_URL}/auth/me`
- `GET ${API_BASE_URL}/properties`
- `GET ${API_BASE_URL}/public/data`

---

### Варіант 2: З префіксом `/v1`
```typescript
const API_BASE_URL = 'https://admin.foryou-realestate.com/api/v1';
```

**Endpoints:**
- `POST ${API_BASE_URL}/auth/login`
- `GET ${API_BASE_URL}/auth/me`
- `GET ${API_BASE_URL}/properties`
- `GET ${API_BASE_URL}/public/data`

**Примітка:** Обидва варіанти працюють. Використовуйте той, який вже використовується в додатку.

---

## 🧪 Як протестувати:

### 1. Перевірка доступності API:
```bash
# Перевірка health endpoint
curl https://admin.foryou-realestate.com/api/health

# Очікуваний результат:
# {"status":"ok","database":"connected","timestamp":"..."}
```

### 2. Тест логіну:
```bash
curl -X POST https://admin.foryou-realestate.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"client1@test.com","password":"Test123!"}'

# Очікуваний результат:
# {"success":true,"message":"Login successful","data":{"token":"...","user":{...}}}
```

### 3. Тест з мобільного додатку:
1. Відкрийте додаток
2. Спробуйте залогінитися
3. Перевірте, чи працюють запити до API
4. Перевірте консоль на помилки

---

## 📝 Приклад оновлення коду:

### React Native / Expo:
```typescript
// src/config/api.ts
// БУЛО:
// export const API_BASE_URL = 'http://88.99.38.25:4000/api';
// або
// export const API_BASE_URL = 'https://foryou-realestate.com/api';

// СТАЛО:
export const API_BASE_URL = 'https://admin.foryou-realestate.com/api';

// Використання:
import axios from 'axios';
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});
```

### Flutter:
```dart
// lib/config/api_config.dart
// БУЛО:
// const String API_BASE_URL = 'http://88.99.38.25:4000/api';
// або
// const String API_BASE_URL = 'https://foryou-realestate.com/api';

// СТАЛО:
const String API_BASE_URL = 'https://admin.foryou-realestate.com/api';
```

---

## ⚡ Швидка перевірка:

### Якщо додаток працює:
✅ **Нічого міняти не потрібно!** Додаток вже використовує правильний URL.

### Якщо додаток не працює:
1. Перевірте, який URL використовується в коді
2. Якщо це IP `88.99.38.25` або старий домен → оновіть на `https://admin.foryou-realestate.com/api`
3. Перезапустіть додаток
4. Протестуйте

---

## 🎯 Підсумок:

| Ситуація | Потрібно оновлювати? |
|----------|---------------------|
| Додаток використовує `admin.foryou-realestate.com` | ❌ НІ |
| Додаток використовує `foryou-realestate.com` | ⚠️ РЕКОМЕНДУЄТЬСЯ (може працювати через редирект) |
| Додаток використовує IP `88.99.38.25` | ✅ ТАК (обов'язково) |
| Додаток використовує IP `135.181.201.185` | ⚠️ РЕКОМЕНДУЄТЬСЯ (краще використовувати домен) |

---

## 📞 Якщо виникли проблеми:

1. Перевірте, що домен доступний:
   ```bash
   curl -I https://admin.foryou-realestate.com/api/health
   ```

2. Перевірте SSL сертифікат:
   ```bash
   openssl s_client -connect admin.foryou-realestate.com:443
   ```

3. Перевірте логи додатку на помилки підключення

4. Перевірте, що використовується HTTPS (не HTTP)

---

**Дата оновлення:** 2025-12-04  
**Статус:** ✅ API працює на `https://admin.foryou-realestate.com/api`

