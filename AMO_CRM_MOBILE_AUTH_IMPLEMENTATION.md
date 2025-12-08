# AMO CRM Мобільна Авторизація - Реалізація

## ✅ Виконані зміни

### 1. Entity: AmoCrmToken

**Файл:** `admin-panel-backend/src/entities/AmoCrmToken.ts`

**Додано:**
- `userId?: string` - опціональний ID користувача
- `user?: User` - зв'язок ManyToOne з User
- Індекси:
  - `idx_amo_crm_tokens_user_id` - для швидкого пошуку
  - `idx_amo_crm_tokens_user_id_unique` - унікальний індекс (один токен на користувача)

**Логіка:**
- Якщо `userId === null` → глобальний токен (для адмінів)
- Якщо `userId` встановлено → токен для конкретного користувача

---

### 2. Service: AmoCrmService

**Файл:** `admin-panel-backend/src/services/amo-crm.service.ts`

#### Нові методи:

**`getUserConnectionStatus(userId: string)`**
- Перевіряє статус підключення для конкретного користувача
- Повертає `{ connected, hasTokens, domain, accountId }`

**`exchangeCodeForUser(userId: string, code: string)`**
- Обмінює authorization code на токени для користувача
- Зберігає токени через `saveTokensForUser()`

**`saveTokensForUser(userId: string, authData: AmoAuthResponse)`**
- Зберігає токени для конкретного користувача
- Видаляє старі токени користувача перед збереженням

**`disconnectUser(userId: string)`**
- Видаляє токени для користувача (відключення AMO CRM)

#### Оновлені методи:

**`getAccessToken(userId?: string)`**
- Тепер приймає опціональний `userId`
- Якщо `userId` передано → шукає токен для користувача
- Якщо не передано → шукає глобальний токен (для адмінів)

**`refreshAccessToken(refreshToken: string, userId?: string)`**
- Тепер приймає опціональний `userId`
- Зберігає оновлений токен для користувача або глобально

**`saveTokensLocally(authData)`**
- Оновлено для роботи з глобальними токенами (без userId)
- Використовує `IsNull()` для пошуку глобальних токенів

---

### 3. Routes: amo-crm.routes.ts

**Файл:** `admin-panel-backend/src/routes/amo-crm.routes.ts`

#### Оновлені endpoints:

**`GET /api/amo-crm/status`**
- ✅ Прибрано `requireAdmin` middleware
- ✅ Доступний для всіх авторизованих користувачів
- ✅ Використовує `getUserConnectionStatus(userId)` замість `getConnectionStatus()`
- ✅ Повертає статус для поточного користувача

**`GET /api/amo-crm/callback`**
- ✅ Оновлено для перенаправлення на deep link
- ✅ Перенаправляє на `foryoure://amo-crm/callback?code=...&state=...`
- ✅ При помилці перенаправляє з `?error=...`

#### Нові endpoints:

**`POST /api/amo-crm/exchange-code`**
- Приймає `{ code: string }` в body
- Обмінює code на токени для поточного користувача
- Використовує `exchangeCodeForUser(userId, code)`
- Повертає `{ success: true, message: "AMO CRM successfully connected" }`

**`POST /api/amo-crm/disconnect`**
- Видаляє токени для поточного користувача
- Використовує `disconnectUser(userId)`
- Повертає `{ success: true, message: "AMO CRM disconnected" }`

---

### 4. Міграція бази даних

**Файл:** `admin-panel-backend/src/migrations/009-add-user-id-to-amo-crm-tokens.sql`

**Що робить:**
1. Додає колонку `user_id UUID` в `amo_crm_tokens`
2. Додає foreign key на `users(id)` з `ON DELETE CASCADE`
3. Створює індекс `idx_amo_crm_tokens_user_id`
4. Створює унікальний partial index `idx_amo_crm_tokens_user_id_unique` (тільки для NOT NULL значень)

**Виконання:**
```bash
psql -U admin -d admin_panel -f admin-panel-backend/src/migrations/009-add-user-id-to-amo-crm-tokens.sql
```

---

## 🔄 OAuth Flow для мобільного додатку

### Крок 1: Користувач натискає "Підключити AMO CRM"

Мобільний додаток відкриває браузер з URL:
```
https://www.amocrm.ru/oauth?client_id=2912780f-a1e4-4d5d-a069-ee01422d8bef&state=...&mode=popup
```

### Крок 2: Користувач авторизується в AMO CRM

AMO CRM перенаправляє на:
```
https://admin.foryou-realestate.com/api/amo-crm/callback?code=...&state=...
```

### Крок 3: Backend перенаправляє на deep link

Backend автоматично перенаправляє на:
```
foryoure://amo-crm/callback?code=...&state=...
```

### Крок 4: Мобільний додаток обробляє deep link

Додаток викликає:
```bash
POST /api/amo-crm/exchange-code
Authorization: Bearer <user_jwt_token>
Content-Type: application/json

{
  "code": "..."
}
```

### Крок 5: Перевірка статусу

Додаток перевіряє статус:
```bash
GET /api/amo-crm/status
Authorization: Bearer <user_jwt_token>
```

**Очікується:** `connected: true`

---

## 🧪 Тестування

### 1. Перевірити статус (має бути доступний для користувача)

```bash
curl -X GET https://admin.foryou-realestate.com/api/amo-crm/status \
  -H "Authorization: Bearer <user_jwt_token>"
```

**Очікувана відповідь:**
```json
{
  "success": true,
  "data": {
    "connected": false,
    "hasTokens": false,
    "domain": "reforyou.amocrm.ru",
    "accountId": "31920194"
  }
}
```

### 2. Перевірити callback (має перенаправляти)

```bash
curl -I "https://admin.foryou-realestate.com/api/amo-crm/callback?code=test&state=test"
```

**Очікувана відповідь:**
```
HTTP/1.1 302 Found
Location: foryoure://amo-crm/callback?code=test&state=test
```

### 3. Перевірити exchange-code

```bash
curl -X POST https://admin.foryou-realestate.com/api/amo-crm/exchange-code \
  -H "Authorization: Bearer <user_jwt_token>" \
  -H "Content-Type: application/json" \
  -d '{"code": "test_code"}'
```

### 4. Перевірити disconnect

```bash
curl -X POST https://admin.foryou-realestate.com/api/amo-crm/disconnect \
  -H "Authorization: Bearer <user_jwt_token>"
```

---

## 📋 Чеклист перевірки

### ✅ Endpoints

- [x] `GET /api/amo-crm/status` - доступний для всіх користувачів
- [x] `POST /api/amo-crm/exchange-code` - існує та працює
- [x] `POST /api/amo-crm/disconnect` - існує та працює
- [x] `GET /api/amo-crm/callback` - перенаправляє на deep link

### ✅ База даних

- [x] Колонка `user_id` існує в `amo_crm_tokens`
- [x] Foreign key на `users(id)` створено
- [x] Індекси створено

### ✅ Service

- [x] `getUserConnectionStatus(userId)` - існує
- [x] `exchangeCodeForUser(userId, code)` - існує
- [x] `saveTokensForUser(userId, authData)` - існує
- [x] `disconnectUser(userId)` - існує
- [x] `getAccessToken(userId?)` - підтримує опціональний userId

### ✅ OAuth налаштування

- [x] Redirect URI в AMO CRM: `https://admin.foryou-realestate.com/api/amo-crm/callback`
- [x] Client ID та Client Secret в `.env`

---

## 🐛 Відомі проблеми та рішення

### Проблема: TypeORM не знаходить токени з `userId: null`

**Рішення:** Використовуємо `IsNull()` з TypeORM:
```typescript
import { IsNull } from 'typeorm';
const whereCondition = userId ? { userId } : { userId: IsNull() };
```

### Проблема: Унікальний індекс не працює для NULL значень

**Рішення:** Використовуємо partial index:
```sql
CREATE UNIQUE INDEX idx_amo_crm_tokens_user_id_unique 
ON amo_crm_tokens(user_id) 
WHERE user_id IS NOT NULL;
```

Це дозволяє мати:
- Безліч записів з `user_id = NULL` (глобальні токени)
- Один запис на кожного користувача (з `user_id`)

---

## 📝 Примітки

1. **Глобальні токени (для адмінів):**
   - Зберігаються з `userId = NULL`
   - Використовуються для адмінських endpoints (sync, create-lead, тощо)
   - Доступні через `getAccessToken()` без параметрів

2. **Токени користувачів:**
   - Зберігаються з `userId = <uuid>`
   - Використовуються для мобільного додатку
   - Доступні через `getAccessToken(userId)`

3. **Backward compatibility:**
   - Всі існуючі адмінські endpoints продовжують працювати
   - Вони використовують глобальні токени (без userId)

---

**Останнє оновлення:** Грудень 2025

