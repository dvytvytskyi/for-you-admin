# 📊 Pipelines та Stages в AMO CRM - Доступні для додатку

## 🔍 Як отримати pipelines та stages

### Endpoint для додатку

**GET** `/api/amo-crm/pipelines`

**Авторизація:** JWT токен (обов'язкова)

**Що робить:**
1. Отримує токени AMO CRM для користувача (з fallback на глобальні)
2. Викликає AMO CRM API: `GET https://reforyou.amocrm.ru/api/v4/leads/pipelines`
3. Повертає pipelines з stages в одному запиті

## 📋 Структура відповіді

### Формат відповіді від backend:

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

## 📝 Типи даних

### Pipeline (Воронка)

```typescript
{
  id: number;                    // ID воронки з AMO CRM
  name: string;                  // Назва воронки
  sort: number;                  // Порядок сортування
  isMain: boolean;               // Чи є головною воронкою
  isUnsortedOn: boolean;         // Чи увімкнено неразобранное
  stages: AmoStage[];            // Стадії воронки
}
```

### Stage (Стадія)

```typescript
{
  id: number;                    // ID стадії з AMO CRM
  pipelineId: number;            // ID воронки
  name: string;                  // Назва стадії
  sort: number;                  // Порядок сортування
  color?: string;                // Колір стадії (hex, наприклад "#4CAF50")
  type?: number;                 // Тип статусу:
                                  // 0 - звичайна стадія
                                  // 1 - неразобранное (необроблені заявки)
                                  // 142 - успішно реалізовано (закриті успішно)
                                  // 143 - нереалізовано (закриті невдало)
}
```

## 🔄 Як працює endpoint

### Код endpoint:

```typescript
router.get('/pipelines', authenticateJWT, async (req: AuthRequest, res) => {
  const userId = req.user?.id;
  
  // Отримуємо pipelines напряму з AMO CRM API
  const pipelines = await amoCrmService.getPipelines(userId);
  
  // Форматуємо відповідь для додатку
  const formattedPipelines = pipelines.map((pipeline: any) => ({
    id: pipeline.id,
    name: pipeline.name,
    sort: pipeline.sort,
    isMain: pipeline.is_main,
    isUnsortedOn: pipeline.is_unsorted_on,
    stages: pipeline._embedded?.statuses?.map((stage: any) => ({
      id: stage.id,
      pipelineId: pipeline.id,
      name: stage.name,
      sort: stage.sort,
      color: stage.color,
      type: stage.type,
    })) || [],
  }));

  return res.json({
    data: formattedPipelines,
    count: formattedPipelines.length,
  });
});
```

### Метод `getPipelines` в сервісі:

```typescript
async getPipelines(userId?: string): Promise<AmoPipeline[]> {
  // Отримуємо токен (з fallback на глобальні)
  const accessToken = userId ? await this.getAccessToken(userId) : await this.getAccessToken();
  
  // Викликаємо AMO CRM API
  const response = await axios.get<{ _embedded: { pipelines: AmoPipeline[] } }>(
    `https://${this.domain}/api/v4/leads/pipelines`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  );

  return response.data._embedded?.pipelines || [];
}
```

## ⚠️ Важливо

### Дані отримуються напряму з AMO CRM

- ✅ Endpoint **НЕ** зберігає дані в БД
- ✅ Дані отримуються **напряму з AMO CRM API** при кожному запиті
- ✅ Це означає, що дані завжди актуальні
- ✅ Не потрібна синхронізація pipelines/stages в БД для роботи додатку

### Stages включені в pipelines

- ✅ Кожен pipeline містить масив `stages` з усіма стадіями
- ✅ Не потрібно робити окремий запит для stages кожного pipeline
- ✅ Endpoint `/pipelines/:id/stages` використовує локальну БД (якщо дані синхронізовані), але не обов'язковий

## 🧪 Як перевірити pipelines та stages

### Через API endpoint:

```bash
curl -X GET "https://admin.foryou-realestate.com/api/amo-crm/pipelines" \
  -H "Authorization: Bearer <JWT_TOKEN>"
```

### Через мобільний додаток:

1. Відкрити CRM екран
2. Викликати `amoCrmApi.getPipelines()`
3. Отримати список pipelines з stages

## 📊 Приклад реальних даних

### Що повертає AMO CRM API:

```json
{
  "_embedded": {
    "pipelines": [
      {
        "id": 12345678,
        "name": "Основна воронка",
        "sort": 0,
        "is_main": true,
        "is_unsorted_on": true,
        "is_archive": false,
        "account_id": 31920194,
        "_embedded": {
          "statuses": [
            {
              "id": 142,
              "name": "Первинний контакт",
              "sort": 0,
              "is_editable": true,
              "color": "#95a5a6",
              "type": 0,
              "pipeline_id": 12345678
            },
            {
              "id": 143,
              "name": "Переговори",
              "sort": 1,
              "is_editable": true,
              "color": "#3498db",
              "type": 0,
              "pipeline_id": 12345678
            },
            {
              "id": 144,
              "name": "Прийнято рішення",
              "sort": 2,
              "is_editable": true,
              "color": "#2ecc71",
              "type": 142,
              "pipeline_id": 12345678
            }
          ]
        }
      }
    ]
  }
}
```

### Що отримує додаток (після форматування):

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
      ]
    }
  ],
  "count": 1
}
```

## 🔑 Ключові моменти

1. **Дані завжди актуальні** - отримуються напряму з AMO CRM при кожному запиті
2. **Stages включені в pipelines** - не потрібен окремий запит
3. **Fallback на глобальні токени** - працює навіть якщо немає токенів для користувача
4. **Формат відповіді** - відповідає специфікації для додатку

---

**Останнє оновлення:** Січень 2025

