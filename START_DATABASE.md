# Запуск бази даних для admin-panel-backend

## Проблема
Ендпоінт `/api/public/developers` повертає помилку:
```json
{"message":"Database connection not initialized"}
```

Це означає, що база даних не підключена до бекенду.

## Рішення

### Варіант 1: Запуск через Docker (рекомендовано)

1. **Запустіть Docker Desktop** (якщо ще не запущений)

2. **Запустіть базу даних:**
   ```bash
   ./deploy/start-database.sh
   ```

   Або вручну:
   ```bash
   docker-compose up -d admin-panel-db
   ```

3. **Перевірте статус:**
   ```bash
   docker ps --filter "name=admin-panel"
   ```

4. **Перезапустіть бекенд** (якщо він вже запущений):
   - Бекенд автоматично підключиться до БД після її запуску
   - Або перезапустіть вручну: зупиніть процес і запустіть знову `npm run dev`

### Варіант 2: Локальна PostgreSQL

Якщо у вас встановлена локальна PostgreSQL:

1. **Створіть базу даних:**
   ```bash
   createdb -U postgres admin_panel
   ```

2. **Оновіть `.env` файл:**
   ```env
   DATABASE_URL=postgresql://postgres:your_password@localhost:5432/admin_panel
   ```

3. **Перезапустіть бекенд**

### Варіант 3: Віддалена база даних

Якщо використовуєте віддалену базу даних:

1. **Оновіть `.env` файл** з правильним `DATABASE_URL`
2. **Перезапустіть бекенд**

## Перевірка підключення

Після запуску бази даних перевірте:

```bash
# Перевірка health endpoint
curl http://localhost:4000/health

# Очікувана відповідь:
# {"status":"ok","database":"connected","timestamp":"..."}
```

## Тестування ендпоінту developers

Після підключення БД:

```bash
curl -X GET "http://localhost:4000/api/public/developers" \
  -H "x-api-key: YOUR_API_KEY" \
  -H "x-api-secret: YOUR_API_SECRET"
```

## Налаштування бази даних (Docker)

- **Host:** localhost
- **Port:** 5435
- **Database:** admin_panel
- **User:** admin
- **Password:** admin123
- **Connection URL:** `postgresql://admin:admin123@localhost:5435/admin_panel`

## Troubleshooting

### Docker не запущений
```
Cannot connect to the Docker daemon
```
**Рішення:** Запустіть Docker Desktop

### Порт 5435 зайнятий
```bash
# Перевірте, що використовує порт
lsof -ti:5435

# Зупиніть процес або змініть порт в docker-compose.yml
```

### База даних не підключається
```bash
# Перевірте логи
docker-compose logs admin-panel-db

# Перевірте статус контейнера
docker ps --filter "name=admin-panel"
```

