# ✅ Чеклист для застосування нових endpoints

## 🎯 Що було реалізовано

### Backend Endpoints
- ✅ GET /api/auth/me - отримання поточного користувача
- ✅ GET /api/collections - список колекцій користувача
- ✅ POST /api/collections - створити колекцію
- ✅ PUT /api/collections/:id - оновити колекцію
- ✅ DELETE /api/collections/:id - видалити колекцію
- ✅ POST /api/collections/:id/properties - додати нерухомість в колекцію
- ✅ DELETE /api/collections/:id/properties/:propertyId - видалити нерухомість з колекції
- ✅ GET /api/favorites - список улюблених нерухомостей
- ✅ POST /api/favorites/:propertyId - додати в улюблені
- ✅ DELETE /api/favorites/:propertyId - видалити з улюблених
- ✅ GET /api/investments - список інвестицій (для Investor)
- ✅ POST /api/investments - створити інвестицію
- ✅ GET /api/investments/:id - деталі інвестиції

### Розширені поля
- ✅ Areas: додано `description` та `images`
- ✅ Developers: додано `images`

### Entities
- ✅ Collection entity
- ✅ Favorite entity
- ✅ Investment entity

### Database Migration
- ✅ Міграція для створення нових таблиць та полів

---

## 📋 Інструкції для деплою на сервер

### Крок 1: Оновити код

```bash
ssh root@135.181.201.185
# Пароль: FNrtVkfCRwgW

cd /opt/admin-panel
git pull origin main
```

### Крок 2: Застосувати міграцію БД

```bash
chmod +x deploy/run-migrations.sh
./deploy/run-migrations.sh
```

**Або вручну:**
```bash
docker exec -i for-you-admin-panel-postgres-prod psql -U admin -d admin_panel < admin-panel-backend/src/migrations/002-create-collections-favorites-investments.sql
```

### Крок 3: Перебілдити та перезапустити backend

```bash
# Видаляємо старий контейнер
docker rm -f for-you-admin-panel-backend-prod

# Перебудовуємо
docker-compose -f docker-compose.prod.yml build --no-cache admin-panel-backend

# Створюємо та запускаємо
docker-compose -f docker-compose.prod.yml create admin-panel-backend
docker-compose -f docker-compose.prod.yml start admin-panel-backend

# Перевіряємо логи
docker logs --tail 50 for-you-admin-panel-backend-prod
```

### Крок 4: Перевірка

```bash
# Перевірка health
curl http://localhost:4000/health

# Перевірка чи нові таблиці створені
docker exec for-you-admin-panel-postgres-prod psql -U admin -d admin_panel -c "\dt" | grep -E "(collections|favorites|investments)"

# Перевірка чи нові поля додано
docker exec for-you-admin-panel-postgres-prod psql -U admin -d admin_panel -c "\d areas" | grep -E "(description|images)"
docker exec for-you-admin-panel-postgres-prod psql -U admin -d admin_panel -c "\d developers" | grep images
```

---

## 🧪 Тестування endpoints

Після деплою протестуйте нові endpoints:

### 1. GET /api/auth/me
```bash
# Отримати токен через login
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@foryou-realestate.com", "password": "your_password"}'

# Використати токен для /me
curl http://localhost:4000/api/auth/me \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 2. Collections
```bash
# Створити колекцію
curl -X POST http://localhost:4000/api/collections \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "My Favorites", "description": "Properties I like"}'

# Отримати всі колекції
curl http://localhost:4000/api/collections \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 3. Favorites
```bash
# Додати в улюблені
curl -X POST http://localhost:4000/api/favorites/PROPERTY_ID \
  -H "Authorization: Bearer YOUR_TOKEN"

# Отримати улюблені
curl http://localhost:4000/api/favorites \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 4. Investments (для Investor)
```bash
# Створити інвестицію
curl -X POST http://localhost:4000/api/investments \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "propertyId": "PROPERTY_ID",
    "amount": 100000,
    "date": "2024-01-15T10:00:00Z",
    "status": "pending",
    "notes": "Initial investment"
  }'
```

---

## 📝 Наступні кроки (опціонально)

### UI в адмінці
Після того як backend працює, можна додати UI в адмінку для:
- [ ] Управління колекціями користувачів
- [ ] Перегляд улюблених нерухомостей
- [ ] Управління інвестиціями

### Додаткові функції
- [ ] Rate limiting
- [ ] WebSocket для real-time оновлень
- [ ] Webhook система

---

## ✅ Перевірка успішності

Після виконання всіх кроків:

1. ✅ БД містить нові таблиці: `collections`, `favorites`, `investments`
2. ✅ Таблиці `areas` та `developers` містять нові поля
3. ✅ Backend запущений без помилок
4. ✅ Endpoints відповідають на запити
5. ✅ Документація оновлена (`API_DOCUMENTATION.md`)

---

**Дата створення:** 2024
**Версія:** 1.0.0

