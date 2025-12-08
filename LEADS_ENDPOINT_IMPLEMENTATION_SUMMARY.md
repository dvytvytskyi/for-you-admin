# Endpoint `/api/v1/leads` - Підсумок реалізації

## ✅ Виконано:

### 1. Створено/Оновлено файл `admin-panel-backend/src/routes/leads.routes.ts`

**Функціонал:**
- ✅ `GET /api/v1/leads` - отримати список leads з пагінацією
- ✅ `GET /api/v1/leads/:id` - отримати конкретний lead

**Параметри запиту:**
- `page` (number, default: 1) - номер сторінки
- `limit` (number, default: 50, max: 100) - кількість на сторінці
- `status` ('NEW' | 'IN_PROGRESS' | 'QUALIFIED' | 'CLOSED_WON' | 'CLOSED_LOST') - фільтр по статусу
- `brokerId` (string, UUID) - фільтр по брокеру (TODO: потребує мапінгу з AMO users)

**Особливості:**
- ✅ Використовує `AmoCrmLead` entity (AMO CRM leads з локальної БД)
- ✅ Витягує контактну інформацію з `AmoCrmContact` через `amoContactId`
- ✅ Мапить статуси AMO CRM на наші статуси через `AmoCrmStage.mappedStatus`
- ✅ Трансформує дані для сумісності з main backend форматом
- ✅ Підтримує JWT авторизацію
- ✅ Обробляє права доступу (брокери можуть бачити тільки свої leads - TODO: мапінг)

### 2. Формат відповіді

**GET /api/v1/leads:**
```json
{
  "data": [
    {
      "id": "uuid",
      "guestName": "John Doe",
      "guestPhone": "+1234567890",
      "guestEmail": "john@example.com",
      "status": "NEW",
      "price": 500000,
      "amoLeadId": 12345,
      "responsibleUserId": 67890,
      "createdAt": "2025-01-01T00:00:00.000Z",
      "updatedAt": "2025-01-01T00:00:00.000Z",
      "brokerId": null,
      "clientId": null,
      "propertyId": null
    }
  ],
  "total": 100,
  "page": 1,
  "limit": 50,
  "totalPages": 2
}
```

**GET /api/v1/leads/:id:**
```json
{
  "id": "uuid",
  "guestName": "John Doe",
  "guestPhone": "+1234567890",
  "guestEmail": "john@example.com",
  "status": "NEW",
  "price": 500000,
  "amoLeadId": 12345,
  "responsibleUserId": 67890,
  "createdAt": "2025-01-01T00:00:00.000Z",
  "updatedAt": "2025-01-01T00:00:00.000Z",
  "brokerId": null,
  "clientId": null,
  "propertyId": null,
  "customFields": {...},
  "embedded": {...}
}
```

### 3. Підключення в `server.ts`

✅ Роут підключено:
```typescript
import leadsRoutes from './routes/leads.routes';
// ...
app.use('/api/v1/leads', leadsRoutes);
```

### 4. Витягування контактної інформації

Endpoint автоматично витягує контактну інформацію з:
1. `embedded.contacts` з lead (якщо є)
2. `AmoCrmContact` entity через `amoContactId`
3. `customFields` з lead (якщо контакт не знайдено)

### 5. Мапінг статусів

Endpoint автоматично мапить статуси AMO CRM на наші статуси через:
- `AmoCrmStage.mappedStatus` (enum: NEW, IN_PROGRESS, QUALIFIED, CLOSED_WON, CLOSED_LOST)

## ⚠️ TODO (майбутні покращення):

1. **Мапінг між User та AmoCrmUser**
   - Для фільтрації по `brokerId` потрібно мапити `User.id` → `AmoCrmUser.amoUserId`
   - Для перевірки прав доступу брокерів

2. **Мапінг з Property**
   - Якщо потрібно фільтрувати по `propertyId`, потрібно додати зв'язок між leads та properties

3. **Мапінг з Client**
   - Якщо потрібно фільтрувати по `clientId`, потрібно додати зв'язок між leads та clients

## 📋 Перевірка:

✅ Компіляція TypeScript успішна
✅ Роут підключено в `server.ts`
✅ Використовує правильні entities (`AmoCrmLead`, `AmoCrmContact`, `AmoCrmStage`)
✅ Формат відповіді сумісний з main backend

## 🚀 Готово до деплою!

Після деплою endpoint буде доступний за адресою:
- `GET https://admin.foryou-realestate.com/api/v1/leads`
- `GET https://admin.foryou-realestate.com/api/v1/leads/:id`

---

**Дата:** Грудень 2025
**Статус:** ✅ Реалізовано та готово до деплою

