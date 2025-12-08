# Виправлення 404 для /api/v1/leads

## Проблема

Мобільний додаток отримує 404 при запиті до `/api/v1/leads` на admin-panel-backend, оскільки цей endpoint не існував.

## Рішення

Додано новий endpoint `/api/v1/leads`, який повертає AMO CRM leads з локальної бази даних.

## Виконати на сервері

```bash
# 1. Підключитися до сервера
ssh root@135.181.201.185
# Пароль: xTVvPEwrpaF4

# 2. Перейти в директорію проекту
cd /root/admin-panel

# 3. Оновити код з git
git pull origin main

# 4. Перезапустити backend
BACKEND_CONTAINER=$(docker ps | grep backend | grep -v postgres | awk '{print $1}' | head -1)
docker restart $BACKEND_CONTAINER

# 5. Перевірити логи
docker logs $BACKEND_CONTAINER --tail 30
```

## Що було додано

1. **Новий файл:** `admin-panel-backend/src/routes/leads.routes.ts`
   - `GET /api/v1/leads` - отримати список leads з пагінацією
   - `GET /api/v1/leads/:id` - отримати конкретний lead

2. **Оновлено:** `admin-panel-backend/src/server.ts`
   - Додано роут `/api/v1/leads`

## Формат відповіді

### GET /api/v1/leads

```json
{
  "success": true,
  "data": [
    {
      "id": 123456,
      "name": "Нова заявка",
      "price": 100000,
      "status_id": 70457442,
      "pipeline_id": 8696950,
      "responsible_user_id": 12345,
      "contact_id": 789012,
      "created_at": 1704067200,
      "updated_at": 1704067200,
      "custom_fields": {...},
      "embedded": {...}
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 5,
    "totalPages": 1
  }
}
```

### GET /api/v1/leads/:id

```json
{
  "success": true,
  "data": {
    "id": 123456,
    "name": "Нова заявка",
    "price": 100000,
    "status_id": 70457442,
    "pipeline_id": 8696950,
    "responsible_user_id": 12345,
    "contact_id": 789012,
    "created_at": 1704067200,
    "updated_at": 1704067200,
    "custom_fields": {...},
    "embedded": {...},
    "raw_data": {...}
  }
}
```

## Авторизація

Обидва endpoints вимагають JWT токен в header:
```
Authorization: Bearer <jwt_token>
```

## Перевірка

Після виконання команд на сервері, перевірте:

```bash
# Перевірити, чи endpoint доступний
curl -X GET https://admin.foryou-realestate.com/api/v1/leads \
  -H "Authorization: Bearer <jwt_token>"
```

Має повернути список leads або помилку авторизації (якщо токен невалідний), але не 404.

---

**Дата:** Грудень 2025
**Статус:** ✅ Готово до деплою

