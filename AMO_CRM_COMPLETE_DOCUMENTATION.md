# AMO CRM Integration - Повна Документація

## Зміст

1. [Огляд](#огляд)
2. [Entities (Сутності)](#entities-сутності)
3. [Endpoints (API)](#endpoints-api)
4. [Функціонал](#функціонал)
5. [Мапінг Статусів](#мапінг-статусів)
6. [Webhooks](#webhooks)
7. [Інтеграція з Main Backend](#інтеграція-з-main-backend)
8. [Приклади Використання](#приклади-використання)
9. [SQL Міграції](#sql-міграції)

---

## Огляд

AMO CRM інтеграція для Admin Panel Backend дозволяє:
- Синхронізувати дані з AMO CRM (pipelines, stages, leads, contacts, users, tasks)
- Обробляти webhooks від AMO CRM
- Створювати та оновлювати leads в AMO CRM
- Мапити статуси AMO CRM на наші внутрішні статуси
- Зберігати всі дані локально в PostgreSQL

---

## Entities (Сутності)

### 1. AmoCrmToken

Зберігає OAuth2 токени для доступу до AMO CRM API.

**Таблиця:** `amo_crm_tokens`

**Поля:**
- `id` (UUID) - первинний ключ
- `accessToken` (string) - access token
- `refreshToken` (string) - refresh token
- `expiresAt` (timestamp) - час закінчення токену
- `tokenType` (string) - тип токену (зазвичай "Bearer")
- `createdAt` (timestamp)
- `updatedAt` (timestamp)

---

### 2. AmoCrmPipeline

Зберігає воронки (pipelines) з AMO CRM.

**Таблиця:** `amo_crm_pipelines`

**Поля:**
- `id` (UUID) - первинний ключ
- `amoPipelineId` (bigint, unique) - ID з AMO CRM
- `name` (string) - назва воронки
- `sort` (int) - порядок сортування
- `isMain` (boolean) - чи є головною воронкою
- `isUnsortedOn` (boolean) - чи увімкнено неразобранное
- `isArchive` (boolean) - чи архівна
- `accountId` (int) - ID акаунту AMO CRM
- `rawData` (jsonb) - повні дані з AMO CRM
- `createdAt` (timestamp)
- `updatedAt` (timestamp)

**Зв'язки:**
- `stages` (OneToMany) - стадії воронки

---

### 3. AmoCrmStage

Зберігає стадії (stages) воронок з мапінгом на наші статуси.

**Таблиця:** `amo_crm_stages`

**Поля:**
- `id` (UUID) - первинний ключ
- `amoStageId` (bigint, unique) - ID з AMO CRM
- `pipelineId` (UUID) - UUID pipeline (FK до amo_crm_pipelines)
- `amoPipelineId` (int) - ID pipeline з AMO CRM
- `name` (string) - назва стадії
- `sort` (int) - порядок сортування
- `isEditable` (boolean) - чи можна редагувати
- `color` (string) - колір стадії
- `statusType` (int) - тип статусу (0 - звичайна, 1 - неразобранное, 142 - успішно, 143 - нереалізовано)
- `mappedStatus` (enum) - мапінг на наші статуси (NEW, IN_PROGRESS, QUALIFIED, CLOSED_WON, CLOSED_LOST)
- `accountId` (int) - ID акаунту AMO CRM
- `rawData` (jsonb) - повні дані з AMO CRM
- `createdAt` (timestamp)
- `updatedAt` (timestamp)

**Зв'язки:**
- `pipeline` (ManyToOne) - воронка

**Індекси:**
- `idx_amo_crm_stages_amo_pipeline_id_sort` - для швидкого пошуку по pipeline та сортуванню
- `idx_amo_crm_stages_mapped_status` - для пошуку по мапованому статусу

---

### 4. AmoCrmLead

Зберігає заявки (leads) з AMO CRM.

**Таблиця:** `amo_crm_leads`

**Поля:**
- `id` (UUID) - первинний ключ
- `amoLeadId` (bigint, unique) - ID з AMO CRM
- `name` (string) - назва заявки
- `price` (decimal) - ціна
- `statusId` (int) - ID стадії з AMO CRM
- `pipelineId` (int) - ID воронки з AMO CRM
- `responsibleUserId` (int) - ID відповідального користувача
- `amoContactId` (int) - ID основного контакту з AMO CRM
- `createdAtAmo` (bigint) - timestamp створення в AMO CRM
- `updatedAtAmo` (bigint) - timestamp оновлення в AMO CRM
- `customFields` (jsonb) - кастомні поля (включаючи коментарі)
- `embedded` (jsonb) - вкладені дані (контакти, компанії)
- `rawData` (jsonb) - повні дані з AMO CRM
- `createdAt` (timestamp)
- `updatedAt` (timestamp)

**Індекси:**
- `idx_amo_crm_leads_amo_lead_id`
- `idx_amo_crm_leads_status_id`
- `idx_amo_crm_leads_pipeline_id`
- `idx_amo_crm_leads_amo_contact_id`

---

### 5. AmoCrmUser

Зберігає користувачів з AMO CRM.

**Таблиця:** `amo_crm_users`

**Поля:**
- `id` (UUID) - первинний ключ
- `amoUserId` (int, unique) - ID з AMO CRM
- `name` (string) - ім'я користувача
- `email` (string) - email
- `phone` (string) - телефон
- `isActive` (boolean) - чи активний
- `isFree` (boolean) - чи безкоштовний акаунт
- `isAdmin` (boolean) - чи адміністратор
- `rights` (jsonb) - права користувача
- `accountId` (int) - ID акаунту AMO CRM
- `rawData` (jsonb) - повні дані з AMO CRM
- `createdAt` (timestamp)
- `updatedAt` (timestamp)

---

### 6. AmoCrmContact

Зберігає контакти з AMO CRM.

**Таблиця:** `amo_crm_contacts`

**Поля:**
- `id` (UUID) - первинний ключ
- `amoContactId` (bigint, unique) - ID з AMO CRM
- `name` (string) - ім'я контакту
- `firstName` (string) - ім'я
- `lastName` (string) - прізвище
- `email` (string) - email (витягується з custom fields)
- `phone` (string) - телефон (витягується з custom fields)
- `responsibleUserId` (int) - ID відповідального користувача
- `createdAtAmo` (bigint) - timestamp створення в AMO CRM
- `updatedAtAmo` (bigint) - timestamp оновлення в AMO CRM
- `customFields` (jsonb) - кастомні поля
- `embedded` (jsonb) - вкладені дані (компанії, leads)
- `rawData` (jsonb) - повні дані з AMO CRM
- `createdAt` (timestamp)
- `updatedAt` (timestamp)

**Індекси:**
- `idx_amo_crm_contacts_amo_contact_id`
- `idx_amo_crm_contacts_email`
- `idx_amo_crm_contacts_phone`
- `idx_amo_crm_contacts_responsible_user_id`

---

### 7. AmoCrmTask

Зберігає задачі (tasks) з AMO CRM (дзвінки, зустрічі, нотатки).

**Таблиця:** `amo_crm_tasks`

**Поля:**
- `id` (UUID) - первинний ключ
- `amoTaskId` (bigint, unique) - ID з AMO CRM
- `entityId` (int) - ID сутності (lead або contact)
- `entityType` (string) - тип сутності ('leads', 'contacts', 'companies')
- `taskType` (int) - тип задачі з AMO CRM (1 - Call, 2 - Meeting, 3 - Email, 4 - Task, 5 - Note)
- `mappedType` (enum) - мапінг на наші типи (CALL, MEETING, EMAIL, NOTE, OTHER)
- `text` (text) - текст задачі
- `resultText` (text) - результат виконання (коментар/нотатка)
- `responsibleUserId` (int) - ID відповідального користувача
- `createdBy` (int) - ID користувача, який створив
- `completeTill` (bigint) - timestamp дедлайну
- `isCompleted` (boolean) - чи виконана
- `createdAtAmo` (bigint) - timestamp створення в AMO CRM
- `updatedAtAmo` (bigint) - timestamp оновлення в AMO CRM
- `rawData` (jsonb) - повні дані з AMO CRM
- `createdAt` (timestamp)
- `updatedAt` (timestamp)

**Індекси:**
- `idx_amo_crm_tasks_amo_task_id`
- `idx_amo_crm_tasks_entity_id`
- `idx_amo_crm_tasks_entity_type`
- `idx_amo_crm_tasks_entity_id_type`
- `idx_amo_crm_tasks_is_completed`
- `idx_amo_crm_tasks_responsible_user_id`

---

## Endpoints (API)

### OAuth

#### `POST /api/amo-crm/exchange-api-key`

Обмін API ключа на authorization code.

**Авторизація:** JWT (Admin)

**Body:**
```json
{
  "login": "user@example.com",
  "api_key": "api_key_here",
  "state": "optional_state"
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

#### `GET /api/amo-crm/callback`

OAuth callback endpoint. Викликається AMO CRM після авторизації.

**Query Parameters:**
- `code` (string) - authorization code
- `from_exchange` (boolean) - чи викликано з exchange
- `state` (string) - state параметр

**Response:** HTML сторінка з повідомленням про успіх/помилку

---

#### `GET /api/amo-crm/status`

Перевірити статус підключення до AMO CRM.

**Авторизація:** JWT (Admin)

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

#### `POST /api/amo-crm/set-tokens`

Встановити токени напряму (для тестування).

**Авторизація:** JWT (Admin)

**Body:**
```json
{
  "access_token": "token_here",
  "refresh_token": "refresh_token_here",
  "expires_in": 157680000,
  "token_type": "Bearer"
}
```

---

### Pipelines

#### `POST /api/amo-crm/sync/pipelines`

Синхронізація pipelines та stages з AMO CRM.

**Авторизація:** JWT (Admin)

**Response:**
```json
{
  "success": true,
  "message": "Pipelines синхронізовано",
  "data": {
    "synced": 6,
    "errors": 0
  }
}
```

---

#### `GET /api/amo-crm/pipelines`

Отримати pipelines та stages з AMO CRM (без збереження).

**Авторизація:** JWT (Admin)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 8696950,
      "name": "Real Estate",
      "sort": 1,
      "is_main": true,
      "_embedded": {
        "statuses": [
          {
            "id": 70457442,
            "name": "Неразобранное",
            "sort": 10,
            "type": 1
          }
        ]
      }
    }
  ]
}
```

---

### Stages

#### `GET /api/amo-crm/stages`

Отримати stages з локальної БД.

**Авторизація:** JWT (Admin)

**Query Parameters:**
- `pipelineId` (int, optional) - фільтр по pipeline ID

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "amoStageId": 70457442,
      "pipelineId": "uuid",
      "amoPipelineId": 8696950,
      "name": "Неразобранное",
      "sort": 10,
      "mappedStatus": "NEW",
      "statusType": 1
    }
  ]
}
```

---

#### `GET /api/amo-crm/stages/mapping`

Отримати мапінг статусів (AMO stages → наші статуси).

**Авторизація:** JWT (Admin)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "amoStageId": 70457442,
      "amoStageName": "Неразобранное",
      "pipelineId": 8696950,
      "pipelineName": "Real Estate",
      "mappedStatus": "NEW"
    }
  ]
}
```

---

### Leads

#### `POST /api/amo-crm/sync/leads`

Синхронізація leads з AMO CRM.

**Авторизація:** JWT (Admin)

**Query Parameters:**
- `limit` (int, optional, default: 50) - кількість leads для синхронізації

**Response:**
```json
{
  "success": true,
  "message": "Leads синхронізовано",
  "data": {
    "synced": 5,
    "errors": 0
  }
}
```

---

#### `GET /api/amo-crm/leads`

Отримати leads з локальної БД.

**Авторизація:** JWT (Admin)

**Query Parameters:**
- `page` (int, optional, default: 1) - номер сторінки
- `limit` (int, optional, default: 50) - кількість на сторінці

**Response:**
```json
{
  "success": true,
  "data": {
    "data": [
      {
        "id": "uuid",
        "amoLeadId": 123456,
        "name": "Нова заявка",
        "price": 100000,
        "statusId": 70457442,
        "pipelineId": 8696950,
        "amoContactId": 789012
      }
    ],
    "total": 5,
    "page": 1,
    "totalPages": 1
  }
}
```

---

#### `GET /api/amo-crm/leads/:id`

Отримати конкретний lead по ID (amoLeadId).

**Авторизація:** JWT (Admin)

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "amoLeadId": 123456,
    "name": "Нова заявка",
    "price": 100000,
    "statusId": 70457442,
    "pipelineId": 8696950,
    "customFields": [...],
    "rawData": {...}
  }
}
```

---

#### `POST /api/amo-crm/create-lead`

Створити lead в AMO CRM (викликається з Main Backend).

**Авторизація:** API Key (X-API-Key header)

**Body:**
```json
{
  "leadData": {
    "name": "Нова заявка",
    "price": 100000,
    "status_id": 70457442,
    "pipeline_id": 8696950,
    "_embedded": {
      "contacts": [{"id": 789012}]
    }
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "amoLeadId": 123456
  }
}
```

---

#### `POST /api/amo-crm/update-lead`

Оновити lead в AMO CRM (викликається з Main Backend).

**Авторизація:** API Key (X-API-Key header)

**Body:**
```json
{
  "leadId": 123456,
  "leadData": {
    "status_id": 70457446,
    "price": 150000
  }
}
```

---

### Users

#### `POST /api/amo-crm/sync/users`

Синхронізація users з AMO CRM.

**Авторизація:** JWT (Admin)

**Response:**
```json
{
  "success": true,
  "message": "Users синхронізовано",
  "data": {
    "synced": 10,
    "errors": 0
  }
}
```

---

#### `GET /api/amo-crm/users`

Отримати users з локальної БД.

**Авторизація:** JWT (Admin)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "amoUserId": 12345,
      "name": "Іван Іванов",
      "email": "ivan@example.com",
      "isActive": true,
      "isAdmin": false
    }
  ]
}
```

---

### Contacts

#### `POST /api/amo-crm/sync/contacts`

Синхронізація contacts з AMO CRM.

**Авторизація:** JWT (Admin)

**Query Parameters:**
- `limit` (int, optional, default: 50) - кількість contacts для синхронізації

**Response:**
```json
{
  "success": true,
  "message": "Contacts синхронізовано",
  "data": {
    "synced": 20,
    "errors": 0
  }
}
```

---

#### `GET /api/amo-crm/contacts`

Отримати contacts з локальної БД.

**Авторизація:** JWT (Admin)

**Query Parameters:**
- `page` (int, optional, default: 1) - номер сторінки
- `limit` (int, optional, default: 50) - кількість на сторінці

**Response:**
```json
{
  "success": true,
  "data": {
    "data": [
      {
        "id": "uuid",
        "amoContactId": 789012,
        "name": "Петро Петров",
        "email": "petro@example.com",
        "phone": "+380501234567"
      }
    ],
    "total": 20,
    "page": 1,
    "totalPages": 1
  }
}
```

---

### Tasks

#### `POST /api/amo-crm/sync/tasks`

Синхронізація tasks з AMO CRM.

**Авторизація:** JWT (Admin)

**Query Parameters:**
- `limit` (int, optional, default: 50) - кількість tasks для синхронізації

**Response:**
```json
{
  "success": true,
  "message": "Tasks синхронізовано",
  "data": {
    "synced": 15,
    "errors": 0
  }
}
```

---

#### `GET /api/amo-crm/tasks`

Отримати tasks з локальної БД.

**Авторизація:** JWT (Admin)

**Query Parameters:**
- `page` (int, optional, default: 1) - номер сторінки
- `limit` (int, optional, default: 50) - кількість на сторінці
- `entityType` (string, optional) - фільтр по типу сутності ('leads', 'contacts')
- `entityId` (int, optional) - фільтр по ID сутності
- `isCompleted` (boolean, optional) - фільтр по статусу виконання

**Response:**
```json
{
  "success": true,
  "data": {
    "data": [
      {
        "id": "uuid",
        "amoTaskId": 987654,
        "entityId": 123456,
        "entityType": "leads",
        "taskType": 1,
        "mappedType": "CALL",
        "text": "Зателефонувати клієнту",
        "isCompleted": false,
        "completeTill": 1704067200
      }
    ],
    "total": 15,
    "page": 1,
    "totalPages": 1
  }
}
```

---

### Sync All

#### `POST /api/amo-crm/sync-all`

Повна синхронізація всіх даних з AMO CRM.

**Авторизація:** JWT (Admin)

**Body:**
```json
{
  "pipelines": true,
  "leads": true,
  "leadsLimit": 100,
  "contacts": true,
  "contactsLimit": 100,
  "users": true,
  "tasks": true,
  "tasksLimit": 100
}
```

**Response:**
```json
{
  "success": true,
  "message": "Синхронізація завершена",
  "data": {
    "pipelines": { "synced": 6, "errors": 0 },
    "leads": { "synced": 50, "errors": 0 },
    "contacts": { "synced": 50, "errors": 0 },
    "users": { "synced": 10, "errors": 0 },
    "tasks": { "synced": 50, "errors": 0 }
  }
}
```

---

### Webhook

#### `POST /api/amo-crm/webhook`

Webhook endpoint для прийому подій з AMO CRM.

**Авторизація:** Не потрібна (викликається AMO CRM)

**Body:** (залежить від типу події)

**Приклад для зміни статусу lead:**
```json
{
  "leads": {
    "status": [
      {
        "id": 123456,
        "status_id": 70457446,
        "pipeline_id": 8696950,
        "old_status_id": 70457442
      }
    ]
  },
  "account": {
    "id": "31920194",
    "subdomain": "reforyou"
  }
}
```

**Response:** Завжди 200 OK (навіть при помилках, щоб AMO CRM не повторював запит)
```json
{
  "success": true,
  "message": "Webhook processed",
  "data": {
    "processed": 1,
    "errors": 0
  }
}
```

---

## Функціонал

### Синхронізація

Всі методи синхронізації:
1. Отримують дані з AMO CRM API
2. Зберігають/оновлюють дані в локальній БД
3. Опціонально відправляють дані в Main Backend (якщо налаштовано)

**Методи:**
- `syncPipelines()` - синхронізує pipelines та stages
- `syncLeads(limit)` - синхронізує leads
- `syncContacts(limit)` - синхронізує contacts
- `syncUsers()` - синхронізує users
- `syncTasks(limit)` - синхронізує tasks

### Мапінг Статусів

Автоматичний мапінг статусів AMO CRM на наші статуси:

- **statusType = 142** → `CLOSED_WON` (Успішно реалізовано)
- **statusType = 143** → `CLOSED_LOST` (Закрито і не реалізовано)
- **statusType = 1** → `NEW` (Неразобранное)
- **statusType = 0** → `IN_PROGRESS` або `QUALIFIED` (залежить від назви)

Мапінг виконується автоматично під час синхронізації pipelines.

### Мапінг Типів Задач

Автоматичний мапінг типів задач AMO CRM:

- **taskType = 1** → `CALL` (Дзвінок)
- **taskType = 2** → `MEETING` (Зустріч)
- **taskType = 3** → `EMAIL` (Email)
- **taskType = 4** → `OTHER` (Задача)
- **taskType = 5** → `NOTE` (Нотатка)

### Коменти та Нотатки

Коменти та нотатки зберігаються:

1. **В Leads:**
   - Через `customFields` (кастомні поля з AMO CRM)
   - Доступні в полі `customFields` entity `AmoCrmLead`

2. **В Tasks:**
   - Через поле `resultText` (результат виконання задачі)
   - Доступні в полі `resultText` entity `AmoCrmTask`

---

## Мапінг Статусів

### Enum: LeadStatus

```typescript
enum LeadStatus {
  NEW = 'NEW',
  IN_PROGRESS = 'IN_PROGRESS',
  QUALIFIED = 'QUALIFIED',
  CLOSED_WON = 'CLOSED_WON',
  CLOSED_LOST = 'CLOSED_LOST'
}
```

### Правила Мапінгу

| AMO CRM statusType | AMO CRM Назва | Mapped Status |
|-------------------|---------------|---------------|
| 142 | Будь-яка | CLOSED_WON |
| 143 | Будь-яка | CLOSED_LOST |
| 1 | Неразобранное | NEW |
| 0 | З "квалификац" в назві | QUALIFIED |
| 0 | Інші | IN_PROGRESS |

### Приклади

```typescript
// Стадія "Неразобранное" (type: 1)
→ mappedStatus: "NEW"

// Стадія "квалификация пройдена" (type: 0, назва містить "квалификац")
→ mappedStatus: "QUALIFIED"

// Стадія "Успешно реализовано" (type: 142)
→ mappedStatus: "CLOSED_WON"

// Стадія "Закрыто и не реализовано" (type: 143)
→ mappedStatus: "CLOSED_LOST"
```

---

## Webhooks

### Налаштування Webhook в AMO CRM

1. Перейти в налаштування інтеграцій AMO CRM
2. Додати webhook на URL: `https://admin.foryou-realestate.com/api/amo-crm/webhook`
3. Вибрати події:
   - `leads.status` - зміна статусу lead
   - `leads.add` - додавання нового lead
   - `leads.update` - оновлення lead
   - `contacts.add` - додавання контакту
   - `contacts.update` - оновлення контакту
   - `tasks.add` - додавання задачі
   - `tasks.update` - оновлення задачі

### Обробка Webhook

Webhook endpoint:
- Завжди повертає 200 OK (навіть при помилках)
- Обробляє події асинхронно
- Відправляє дані в Main Backend (якщо налаштовано)

### Типи Подій

#### 1. Зміна Статусу Lead

```json
{
  "leads": {
    "status": [
      {
        "id": 123456,
        "status_id": 70457446,
        "pipeline_id": 8696950,
        "old_status_id": 70457442
      }
    ]
  }
}
```

#### 2. Новий Lead

```json
{
  "leads": {
    "add": [
      { "id": 123456 }
    ]
  }
}
```

#### 3. Оновлення Lead

```json
{
  "leads": {
    "update": [
      { "id": 123456 }
    ]
  }
}
```

---

## Інтеграція з Main Backend

### Налаштування

Додати в `.env`:
```env
MAIN_BACKEND_URL=https://api.example.com
MAIN_BACKEND_API_KEY=your_api_key_here
```

### Endpoints Main Backend

Admin Backend відправляє дані в Main Backend на наступні endpoints:

1. **POST** `/integrations/amo-crm/sync-pipelines`
   - Відправляється при синхронізації pipelines
   - Body: `{ pipelines: [...], stages: [...] }`

2. **POST** `/integrations/amo-crm/sync-lead`
   - Відправляється при синхронізації/оновленні lead
   - Body: `{ lead: {...} }`

3. **POST** `/integrations/amo-crm/webhook`
   - Відправляється при обробці webhook
   - Body: webhook payload

4. **GET** `/integrations/amo-crm/token`
   - Запитується для отримання access token
   - Response: `{ accessToken: "..." }`

### Авторизація

Всі запити до Main Backend виконуються з header:
```
X-API-Key: your_api_key_here
```

---

## Приклади Використання

### 1. Повна Синхронізація

```bash
curl -X POST https://admin.foryou-realestate.com/api/amo-crm/sync-all \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "pipelines": true,
    "leads": true,
    "leadsLimit": 100,
    "contacts": true,
    "users": true,
    "tasks": true
  }'
```

### 2. Отримати Leads з Фільтрацією

```bash
curl -X GET "https://admin.foryou-realestate.com/api/amo-crm/leads?page=1&limit=20" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### 3. Отримати Tasks для Конкретного Lead

```bash
curl -X GET "https://admin.foryou-realestate.com/api/amo-crm/tasks?entityType=leads&entityId=123456" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### 4. Створити Lead в AMO CRM

```bash
curl -X POST https://admin.foryou-realestate.com/api/amo-crm/create-lead \
  -H "X-API-Key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "leadData": {
      "name": "Нова заявка",
      "price": 100000,
      "status_id": 70457446,
      "pipeline_id": 8696950,
      "_embedded": {
        "contacts": [{"id": 789012}]
      }
    }
  }'
```

### 5. Отримати Мапінг Статусів

```bash
curl -X GET https://admin.foryou-realestate.com/api/amo-crm/stages/mapping \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## SQL Міграції

### Міграція 008: Створення AMO CRM Entities

Файл: `admin-panel-backend/src/migrations/008-create-amo-crm-entities-tables.sql`

**Створює:**
- Таблицю `amo_crm_pipelines`
- Таблицю `amo_crm_stages` з enum `lead_status_enum`
- Таблицю `amo_crm_users`
- Таблицю `amo_crm_contacts`
- Таблицю `amo_crm_tasks` з enum `amo_task_type_enum`
- Додає поле `amo_contact_id` до `amo_crm_leads` (якщо ще немає)
- Всі необхідні індекси

**Виконання:**
```bash
psql -U admin -d admin_panel -f admin-panel-backend/src/migrations/008-create-amo-crm-entities-tables.sql
```

---

## Environment Variables

Необхідні змінні середовища в `.env`:

```env
# AMO CRM
AMO_DOMAIN=reforyou.amocrm.ru
AMO_CLIENT_ID=your_client_id
AMO_CLIENT_SECRET=your_client_secret
AMO_REDIRECT_URI=https://admin.foryou-realestate.com/api/amo-crm/callback
AMO_ACCOUNT_ID=31920194
AMO_API_DOMAIN=reforyou.amocrm.ru

# Main Backend Integration (опціонально)
MAIN_BACKEND_URL=https://api.example.com
MAIN_BACKEND_API_KEY=your_api_key_here
```

---

## Структура Проекту

```
admin-panel-backend/
├── src/
│   ├── entities/
│   │   ├── AmoCrmToken.ts
│   │   ├── AmoCrmLead.ts
│   │   ├── AmoCrmPipeline.ts
│   │   ├── AmoCrmStage.ts
│   │   ├── AmoCrmUser.ts
│   │   ├── AmoCrmContact.ts
│   │   └── AmoCrmTask.ts
│   ├── services/
│   │   └── amo-crm.service.ts
│   ├── routes/
│   │   └── amo-crm.routes.ts
│   └── migrations/
│       └── 008-create-amo-crm-entities-tables.sql
```

---

## Підсумок

✅ **8 Entities** - всі сутності створені та налаштовані  
✅ **20+ Endpoints** - всі API endpoints реалізовані  
✅ **Синхронізація** - pipelines, stages, leads, users, contacts, tasks  
✅ **Webhooks** - обробка подій від AMO CRM  
✅ **Мапінг Статусів** - автоматичний мапінг AMO stages → наші статуси  
✅ **CRUD** - створення/оновлення leads в AMO CRM  
✅ **Коменти/Нотатки** - через Custom Fields та Tasks  
✅ **Інтеграція** - з Main Backend через API Key  

Всі компоненти готові до використання! 🚀

