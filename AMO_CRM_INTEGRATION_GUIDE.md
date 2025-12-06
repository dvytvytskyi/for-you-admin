# 🔗 AMO CRM Інтеграція - Повний Гайд

## 📋 Огляд

Ця інструкція описує AMO CRM інтеграцію в Admin Panel Backend (Express.js). Адмін-панель виступає центральним місцем для:

- OAuth2 авторизації з AMO CRM
- Синхронізації даних (pipelines, stages, leads, contacts, tasks)
- Налаштування мапінгу статусів
- Обробки webhooks

---

## 🎯 Архітектура

```
AMO CRM ↔ Admin Panel Backend (Express.js) ↔ Main Backend (NestJS) ↔ Mobile App
```

**Роль Admin Panel Backend:**
- OAuth2 авторизація та зберігання токенів
- Синхронізація з AMO CRM API
- Обробка webhooks
- Налаштування мапінгу статусів
- Відправка даних в Main Backend

---

## ⚙️ Налаштування .env

**Файл:** `admin-panel-backend/.env`

Додайте наступні змінні:

```env
# AMO CRM налаштування
AMO_DOMAIN=reforyou.amocrm.ru
AMO_CLIENT_ID=2912780f-a1e4-4d5d-a069-ee01422d8bef
AMO_CLIENT_SECRET=your-client-secret-here
AMO_ACCOUNT_ID=31920194
AMO_API_DOMAIN=api-b.amocrm.ru
AMO_REDIRECT_URI=https://admin.foryou-realestate.com/api/amo-crm/callback

# API ключ для комунікації з Main Backend
MAIN_BACKEND_API_KEY=your-secure-api-key
MAIN_BACKEND_URL=https://foryou-realestate.com/api/v1
```

**Примітка:** 
- `AMO_CLIENT_SECRET` отримайте з AMO CRM налаштувань
- `MAIN_BACKEND_API_KEY` - створіть безпечний ключ для комунікації між сервісами

---

## 🔍 Endpoints

### 1. POST `/api/amo-crm/exchange-api-key`
Обмін API ключа на authorization code (тільки ADMIN).

**Request:**
```http
POST /api/amo-crm/exchange-api-key
Authorization: Bearer <admin-token>
Content-Type: application/json
```

**Body:**
```json
{
  "login": "your-email@example.com",
  "api_key": "your-api-key",
  "state": "optional-state-value"
}
```

**Response:**
```json
{
  "success": true,
  "message": "API key exchange request accepted. Authorization code will be sent to redirect URI",
  "data": {
    "fromExchange": true
  }
}
```

---

### 2. GET `/api/amo-crm/callback`
OAuth callback endpoint (викликається AMO CRM автоматично).

**Request:**
```
GET /api/amo-crm/callback?code=authorization_code&from_exchange=1
```

**Response:**
HTML сторінка з повідомленням про успішне підключення.

---

### 3. GET `/api/amo-crm/status`
Перевірити статус підключення (тільки ADMIN).

**Request:**
```http
GET /api/amo-crm/status
Authorization: Bearer <admin-token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "connected": true,
    "hasTokens": true,
    "domain": "reforyou.amocrm.ru",
    "accountId": "31920194"
  }
}
```

---

### 4. POST `/api/amo-crm/sync/pipelines`
Синхронізація pipelines та stages (тільки ADMIN).

**Request:**
```http
POST /api/amo-crm/sync/pipelines
Authorization: Bearer <admin-token>
```

**Response:**
```json
{
  "success": true,
  "message": "Pipelines синхронізовано",
  "data": {
    "synced": 5,
    "errors": 0
  }
}
```

---

### 5. POST `/api/amo-crm/sync/leads`
Синхронізація leads (тільки ADMIN).

**Request:**
```http
POST /api/amo-crm/sync/leads?limit=50
Authorization: Bearer <admin-token>
```

**Response:**
```json
{
  "success": true,
  "message": "Leads синхронізовано",
  "data": {
    "synced": 25,
    "errors": 0
  }
}
```

---

### 6. POST `/api/amo-crm/create-lead`
Створити lead в AMO CRM (викликається з Main Backend).

**Request:**
```http
POST /api/amo-crm/create-lead
X-API-Key: <main-backend-api-key>
Content-Type: application/json
```

**Body:**
```json
{
  "leadData": {
    "name": "New Lead",
    "price": 100000,
    "status_id": 123,
    "pipeline_id": 456
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "amoLeadId": 789
  }
}
```

---

### 7. POST `/api/amo-crm/update-lead`
Оновити lead в AMO CRM (викликається з Main Backend).

**Request:**
```http
POST /api/amo-crm/update-lead
X-API-Key: <main-backend-api-key>
Content-Type: application/json
```

**Body:**
```json
{
  "leadId": 789,
  "leadData": {
    "name": "Updated Lead",
    "price": 150000
  }
}
```

---

### 8. POST `/api/amo-crm/webhook`
Webhook endpoint для прийому подій з AMO CRM.

**Request:**
```http
POST /api/amo-crm/webhook
Content-Type: application/json
```

**Body:**
```json
{
  "leads": {
    "status": [
      {
        "id": 123,
        "status_id": 456,
        "pipeline_id": 789,
        "old_status_id": 111
      }
    ],
    "add": [
      { "id": 123 }
    ]
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Webhook processed",
  "data": {
    "processed": 2,
    "errors": 0
  }
}
```

---

## 🔧 Налаштування Webhook в AMO CRM

1. Зайдіть в AMO CRM → Налаштування → Віджеті та інтеграції → Webhooks
2. Додайте webhook URL:
   ```
   https://admin.foryou-realestate.com/api/amo-crm/webhook
   ```
3. Оберіть події:
   - ✅ Leads: статус змінився
   - ✅ Leads: додано
   - ✅ Leads: оновлено
   - ✅ Contacts: додано
   - ✅ Contacts: оновлено
   - ✅ Tasks: додано
   - ✅ Tasks: оновлено

---

## 🧪 Тестування

### Тест 1: OAuth авторизація

```bash
# 1. Отримати admin token
TOKEN=$(curl -s -X POST https://admin.foryou-realestate.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@foryou-realestate.com","password":"Admin123!"}' \
  | python3 -c "import sys, json; print(json.load(sys.stdin)['data']['token'])")

# 2. Обмін API ключа на код
curl -X POST https://admin.foryou-realestate.com/api/amo-crm/exchange-api-key \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "login": "your-email@example.com",
    "api_key": "your-api-key"
  }'

# 3. Перевірити статус
curl -X GET https://admin.foryou-realestate.com/api/amo-crm/status \
  -H "Authorization: Bearer $TOKEN"
```

### Тест 2: Синхронізація

```bash
# Синхронізація pipelines
curl -X POST https://admin.foryou-realestate.com/api/amo-crm/sync/pipelines \
  -H "Authorization: Bearer $TOKEN"

# Синхронізація leads
curl -X POST "https://admin.foryou-realestate.com/api/amo-crm/sync/leads?limit=10" \
  -H "Authorization: Bearer $TOKEN"
```

---

## ⚠️ Важливі примітки

1. **Безпека:**
   - API ключі для комунікації між сервісами мають бути безпечними
   - OAuth токени зберігаються в Main Backend

2. **Помилки:**
   - Всі помилки логуються в консоль
   - Webhook завжди повертає 200 OK (навіть при помилках обробки)

3. **Синхронізація:**
   - Pipelines синхронізуються вручну з адмін-панелі
   - Leads можуть синхронізуватися автоматично через webhook

4. **Main Backend Integration:**
   - Admin Panel Backend не зберігає токени локально
   - Всі токени зберігаються в Main Backend
   - Для отримання токенів використовується API ключ

---

## 📋 Чеклист реалізації

- [x] Створено `AmoCrmService` з усіма методами
- [x] Створено routes для AMO CRM
- [x] Підключено routes до server
- [ ] Додано змінні оточення в `.env` (потрібно від вас)
- [ ] Налаштовано webhook в AMO CRM (потрібно від вас)
- [ ] Протестовано OAuth авторизацію
- [ ] Протестовано синхронізацію

---

## 🔑 Що потрібно від вас

1. **AMO_CLIENT_SECRET** - отримайте з AMO CRM налаштувань інтеграції
2. **MAIN_BACKEND_API_KEY** - створіть безпечний ключ для комунікації між сервісами
3. **MAIN_BACKEND_URL** - URL вашого Main Backend (NestJS)
4. **Налаштування webhook** в AMO CRM (див. розділ "Налаштування Webhook")

---

**Останнє оновлення:** Грудень 2025

