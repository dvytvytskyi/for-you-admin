# Тестові дані користувачів

## Загальна інформація

**Пароль для всіх тестових користувачів:** `Test123!`

---

## CLIENT (Клієнти)

Створюється 10 тестових клієнтів з ролями `CLIENT` та статусом `ACTIVE`.

### Credentials:

| № | Email | Пароль | Роль | Статус |
|---|-------|--------|------|--------|
| 1 | `client1@test.com` | `Test123!` | CLIENT | ACTIVE |
| 2 | `client2@test.com` | `Test123!` | CLIENT | ACTIVE |
| 3 | `client3@test.com` | `Test123!` | CLIENT | ACTIVE |
| 4 | `client4@test.com` | `Test123!` | CLIENT | ACTIVE |
| 5 | `client5@test.com` | `Test123!` | CLIENT | ACTIVE |
| 6 | `client6@test.com` | `Test123!` | CLIENT | ACTIVE |
| 7 | `client7@test.com` | `Test123!` | CLIENT | ACTIVE |
| 8 | `client8@test.com` | `Test123!` | CLIENT | ACTIVE |
| 9 | `client9@test.com` | `Test123!` | CLIENT | ACTIVE |
| 10 | `client10@test.com` | `Test123!` | CLIENT | ACTIVE |

**Формат email:** `client{N}@test.com` де N від 1 до 10

---

## BROKER (Брокери)

Створюється 5 тестових брокерів з ролями `BROKER`.

### Credentials:

| № | Email | Пароль | Роль | Статус | License Number |
|---|-------|--------|------|--------|----------------|
| 1 | `broker1@test.com` | `Test123!` | BROKER | ACTIVE | BRK-0001 |
| 2 | `broker2@test.com` | `Test123!` | BROKER | ACTIVE | BRK-0002 |
| 3 | `broker3@test.com` | `Test123!` | BROKER | ACTIVE | BRK-0003 |
| 4 | `broker4@test.com` | `Test123!` | BROKER | PENDING | BRK-0004 |
| 5 | `broker5@test.com` | `Test123!` | BROKER | PENDING | BRK-0005 |

**Формат email:** `broker{N}@test.com` де N від 1 до 5

**Примітка:** Перші 3 брокери мають статус `ACTIVE`, останні 2 - `PENDING`.

---

## INVESTOR (Інвестори)

Створюється 5 тестових інвесторів з ролями `INVESTOR`.

### Credentials:

| № | Email | Пароль | Роль | Статус |
|---|-------|--------|------|--------|
| 1 | `investor1@test.com` | `Test123!` | INVESTOR | ACTIVE |
| 2 | `investor2@test.com` | `Test123!` | INVESTOR | ACTIVE |
| 3 | `investor3@test.com` | `Test123!` | INVESTOR | ACTIVE |
| 4 | `investor4@test.com` | `Test123!` | INVESTOR | PENDING |
| 5 | `investor5@test.com` | `Test123!` | INVESTOR | PENDING |

**Формат email:** `investor{N}@test.com` де N від 1 до 5

**Примітка:** Перші 3 інвестори мають статус `ACTIVE`, останні 2 - `PENDING`.

---

## Генерація тестових даних

Для створення всіх тестових користувачів використовуйте скрипт:

```bash
cd admin-panel-backend
npm run generate-test-data
```

Або напряму:

```bash
cd admin-panel-backend
npx ts-node src/scripts/generateTestData.ts
```

---

## Додаткова інформація

### Створені дані при генерації:

- **Користувачі:** 10 CLIENT, 5 BROKER, 5 INVESTOR
- **Developers:** 10 (Emaar Properties, Nakheel, Dubai Properties, тощо)
- **Properties:** 20 (10 Off-Plan, 10 Secondary)
- **News:** 10 статей
- **Courses:** 8 курсів
- **Investments:** до 15 інвестицій
- **Favorites:** до 30 обраних
- **Collections:** 5 колекцій

### Телефони

Телефони генеруються випадково у форматі: `+380{9 цифр}`

### Імена та прізвища

Імена та прізвища генеруються випадково з попередньо визначених списків:
- **Імена:** John, Emma, Michael, Sophia, William, Olivia, тощо
- **Прізвища:** Smith, Johnson, Williams, Brown, Jones, тощо

---

## Приклади використання

### Вхід через API:

```bash
# CLIENT
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"client1@test.com","password":"Test123!"}'

# BROKER
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"broker1@test.com","password":"Test123!"}'

# INVESTOR
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"investor1@test.com","password":"Test123!"}'
```

### Перевірка в базі даних:

```sql
-- Всі тестові користувачі
SELECT email, role, status FROM users WHERE email LIKE '%@test.com';

-- Активні брокери
SELECT email, license_number FROM users WHERE role = 'BROKER' AND status = 'ACTIVE';

-- Активні інвестори
SELECT email FROM users WHERE role = 'INVESTOR' AND status = 'ACTIVE';
```

---

**Останнє оновлення:** 2025-12-11
