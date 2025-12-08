# 🔧 Виправлення 500 помилки при логіні

## Проблема

Endpoint `POST /api/auth/login` повертав 500 помилку з повідомленням:
```json
{"success":false,"message":"Internal server error"}
```

## Причина

Backend не міг підключитися до бази даних PostgreSQL:
```
Error: connect EHOSTUNREACH 172.18.0.4:5432
```

**Причини:**
1. PostgreSQL контейнер був зупинений (`Exited (0)`)
2. DATABASE_URL вказував на неправильний хост/IP
3. Контейнери не були в одному Docker network

## Рішення

### 1. Запуск PostgreSQL контейнера

```bash
# Перевірка статусу
docker ps -a | grep postgres

# Запуск існуючого контейнера
docker start <postgres_container_id>

# Або створення нового контейнера
docker run -d \
  --name for-you-admin-panel-postgres-prod \
  --restart unless-stopped \
  --network admin-panel_admin-network \
  -p 127.0.0.1:5435:5432 \
  -e POSTGRES_USER=admin \
  -e POSTGRES_PASSWORD=${DB_PASSWORD} \
  -e POSTGRES_DB=admin_panel \
  postgres:15
```

### 2. Оновлення DATABASE_URL

**Правильний формат для Docker network:**
```bash
DATABASE_URL=postgresql://admin:${DB_PASSWORD}@<postgres_container_name>:5432/admin_panel
```

**Приклад:**
```bash
DATABASE_URL=postgresql://admin:WL273wUVrfbOqgUNhMhr@for-you-admin-panel-postgres-prod:5432/admin_panel
```

### 3. Перезапуск Backend контейнера

```bash
# Зупинка старого контейнера
docker stop for-you-admin-panel-backend-prod
docker rm for-you-admin-panel-backend-prod

# Запуск нового з правильним DATABASE_URL
docker run -d \
  --name for-you-admin-panel-backend-prod \
  --restart unless-stopped \
  --network admin-panel_admin-network \
  -p 127.0.0.1:4000:4000 \
  -v /root/admin-panel/admin-panel-backend/.env:/app/.env:ro \
  -v /root/admin-panel/admin-panel-backend/uploads:/app/uploads \
  -e NODE_ENV=production \
  -e DATABASE_URL=postgresql://admin:${DB_PASSWORD}@for-you-admin-panel-postgres-prod:5432/admin_panel \
  admin-panel_admin-panel-backend:latest
```

## Перевірка

### 1. Перевірка статусу контейнерів

```bash
docker ps | grep -E '(postgres|backend)'
```

Очікуваний результат:
```
CONTAINER ID   IMAGE                                    STATUS
xxx            postgres:15                              Up X minutes
yyy            admin-panel_admin-panel-backend:latest    Up X minutes
```

### 2. Перевірка підключення до БД

```bash
docker logs for-you-admin-panel-backend-prod | grep -E '(Database|connected)'
```

Очікуваний результат:
```
✅ Database connected
📊 Database entities loaded
```

### 3. Тест endpoint

```bash
curl -X POST https://admin.foryou-realestate.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"broker1@test.com","password":"Test123!"}'
```

Очікувана відповідь:
```json
{
  "success": true,
  "data": {
    "token": "jwt_token_here",
    "user": {
      "id": "uuid",
      "email": "broker1@test.com",
      "role": "BROKER"
    }
  },
  "message": "Login successful"
}
```

## Додаткові перевірки

### Перевірка JWT_SECRET

Переконайтеся, що в `.env` файлі є:
```bash
ADMIN_JWT_SECRET=your_secret_key_here
```

### Перевірка користувача в БД

```bash
docker exec -it for-you-admin-panel-postgres-prod psql -U admin -d admin_panel -c "SELECT id, email, role FROM users WHERE email = 'broker1@test.com';"
```

### Детальне логування

Якщо помилка залишається, перевірте повні логи:
```bash
docker logs for-you-admin-panel-backend-prod --tail 50
```

## Підсумок

✅ PostgreSQL контейнер запущений
✅ Backend контейнер підключений до правильного network
✅ DATABASE_URL вказує на правильний хост (ім'я контейнера, не IP)
✅ Backend успішно підключається до БД
✅ Endpoint `/api/auth/login` працює коректно

---

**Дата виправлення:** Грудень 2025
**Статус:** ✅ Виправлено

