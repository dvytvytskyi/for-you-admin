# 📊 Pipelines та Stages в AMO CRM

## 🔍 Як отримати pipelines та stages

### Endpoint для додатку

**GET** `/api/amo-crm/pipelines`

**Авторизація:** JWT токен (обов'язкова)

**Відповідь:**
```json
{
  "data": [
    {
      "id": 123,
      "name": "Sales Pipeline",
      "sort": 0,
      "isMain": true,
      "isUnsortedOn": false,
      "stages": [
        {
          "id": 456,
          "pipelineId": 123,
          "name": "New",
          "sort": 0,
          "color": "#4CAF50",
          "type": 0
        },
        {
          "id": 457,
          "pipelineId": 123,
          "name": "Qualified",
          "sort": 1,
          "color": "#FF9800",
          "type": 0
        }
      ]
    }
  ],
  "count": 1
}
```

## 📋 Структура даних

### Pipeline (Воронка)

```typescript
interface AmoPipeline {
  id: number;                    // ID воронки з AMO CRM
  name: string;                  // Назва воронки
  sort: number;                  // Порядок сортування
  isMain: boolean;               // Чи є головною воронкою
  isUnsortedOn: boolean;         // Чи увімкнено неразобранное
  stages?: AmoStage[];           // Стадії воронки
}
```

### Stage (Стадія)

```typescript
interface AmoStage {
  id: number;                    // ID стадії з AMO CRM
  pipelineId: number;            // ID воронки
  name: string;                  // Назва стадії
  sort: number;                  // Порядок сортування
  color?: string;                // Колір стадії (hex)
  type?: number;                 // Тип статусу:
                                  // 0 - звичайна
                                  // 1 - неразобранное
                                  // 142 - успішно реалізовано
                                  // 143 - нереалізовано
}
```

## 🔄 Як працює endpoint

1. **Отримує токени AMO CRM** для користувача (з fallback на глобальні)
2. **Викликає AMO CRM API:** `GET https://{domain}/api/v4/leads/pipelines`
3. **Форматує відповідь** для додатку
4. **Повертає pipelines з stages** в одному запиті

## 📝 Примітки

### Дані отримуються напряму з AMO CRM

- Endpoint **НЕ** зберігає дані в БД
- Дані отримуються **напряму з AMO CRM API** при кожному запиті
- Це означає, що дані завжди актуальні

### Stages включені в pipelines

- Кожен pipeline містить масив `stages` з усіма стадіями
- Не потрібно робити окремий запит для stages кожного pipeline

### Типи статусів (type)

- `0` - звичайна стадія
- `1` - неразобранное (необроблені заявки)
- `142` - успішно реалізовано (закриті успішно)
- `143` - нереалізовано (закриті невдало)

## 🧪 Тестування

### Виклик endpoint:

```bash
curl -X GET "https://admin.foryou-realestate.com/api/amo-crm/pipelines" \
  -H "Authorization: Bearer <JWT_TOKEN>"
```

### Очікуваний результат:

```json
{
  "data": [
    {
      "id": 12345678,
      "name": "Основна воронка",
      "sort": 0,
      "isMain": true,
      "isUnsortedOn": true,
      "stages": [
        {
          "id": 142,
          "pipelineId": 12345678,
          "name": "Первинний контакт",
          "sort": 0,
          "color": "#95a5a6",
          "type": 0
        },
        {
          "id": 143,
          "pipelineId": 12345678,
          "name": "Переговори",
          "sort": 1,
          "color": "#3498db",
          "type": 0
        },
        {
          "id": 144,
          "pipelineId": 12345678,
          "name": "Прийнято рішення",
          "sort": 2,
          "color": "#2ecc71",
          "type": 142
        }
      ]
    }
  ],
  "count": 1
}
```

## ⚠️ Важливо

1. **Дані отримуються з AMO CRM API** - не з локальної БД
2. **Потрібен валідний токен AMO CRM** - інакше буде помилка
3. **Stages включені в pipelines** - не потрібен окремий endpoint для stages кожного pipeline
4. **Endpoint `/pipelines/:id/stages`** використовує локальну БД (якщо дані синхронізовані)

---

**Останнє оновлення:** Січень 2025

