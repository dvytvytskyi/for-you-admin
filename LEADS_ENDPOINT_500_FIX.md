# ✅ Виправлення 500 помилки в endpoint /api/v1/leads

## 🐛 Проблема

Endpoint `/api/v1/leads` повертав 500 помилку через:
1. Неправильний синтаксис запиту контактів (використання масиву об'єктів у `where`)
2. Відсутність перевірки ініціалізації БД
3. Відсутність обробки помилок у функції `mapStatus`

## ✅ Рішення

### 1. Виправлено запит контактів

**Було (неправильно):**
```typescript
const contacts = await contactRepo.find({
  where: contactIds.map(id => ({ amoContactId: id })),
});
```

**Стало (правильно):**
```typescript
import { In } from 'typeorm';

const contacts = await contactRepo.find({
  where: { amoContactId: In(contactIds) },
});
```

### 2. Додано перевірку ініціалізації БД

**Додано на початку endpoint:**
```typescript
// Перевірка ініціалізації БД
if (!AppDataSource.isInitialized) {
  console.error('Database not initialized');
  return res.status(500).json(errorResponse('Database connection not initialized'));
}
```

### 3. Покращено обробку помилок у `mapStatus`

**Додано try-catch:**
```typescript
async function mapStatus(statusId?: number): Promise<...> {
  if (!statusId) return null;

  try {
    // Перевірка ініціалізації БД
    if (!AppDataSource.isInitialized) {
      console.warn('Database not initialized in mapStatus');
      return null;
    }

    const stageRepo = AppDataSource.getRepository(AmoCrmStage);
    const stage = await stageRepo.findOne({
      where: { amoStageId: statusId },
    });

    // ... решта логіки ...
  } catch (error: any) {
    console.error('Error mapping status:', error);
    return null; // Повертаємо null при помилці, щоб не ламати весь запит
  }
}
```

## 🔑 Ключові зміни

### 1. Використання `In` оператора

TypeORM не підтримує масив об'єктів у `where`. Потрібно використовувати `In` оператор для запитів з множиною значень.

### 2. Перевірка ініціалізації БД

Додано перевірку перед використанням `AppDataSource`, щоб уникнути помилок, якщо БД не ініціалізована.

### 3. Обробка помилок

Функція `mapStatus` тепер повертає `null` при помилці, щоб не ламати весь запит leads.

## ✅ Результат

Після виправлення:

1. ✅ Endpoint не падає з 500 помилкою
2. ✅ Правильно запитує контакти з БД
3. ✅ Обробляє помилки без падіння
4. ✅ Повертає leads з локальної БД навіть без AMO CRM токенів

## 🧪 Тестування

### Перевірка endpoint:

```bash
curl -X GET "https://admin.foryou-realestate.com/api/v1/leads?page=1&limit=10" \
  -H "Authorization: Bearer <JWT_TOKEN>"
```

**Очікуваний результат:**
```json
{
  "data": [...],
  "total": 100,
  "page": 1,
  "limit": 10,
  "totalPages": 10
}
```

### Сценарії:

1. **Є leads в БД:**
   - Повертає список leads з контактами
   - Мапінг статусів працює коректно

2. **Немає leads в БД:**
   - Повертає порожній масив `data: []`
   - `total: 0`

3. **Помилка БД:**
   - Повертає 500 з повідомленням про помилку
   - Не падає без обробки помилок

## 📝 Примітки

### Чому не викликає AMO CRM API?

Endpoint `/api/v1/leads` призначений для повернення leads з локальної БД. Він не викликає:
- `amoCrmService.getAccessToken()`
- `amoCrmService.syncLeadsFromAmo()`
- Будь-які інші методи AMO CRM API

### Чому використовується локальна БД?

Leads синхронізуються з AMO CRM через:
- Webhooks (автоматична синхронізація)
- Ручна синхронізація через `/api/amo-crm/sync/leads`

Endpoint `/api/v1/leads` просто читає дані з локальної БД.

---

**Останнє оновлення:** Січень 2025

