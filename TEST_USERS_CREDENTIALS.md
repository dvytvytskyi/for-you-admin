# 🔑 Тестові облікові дані

## 👨‍💼 Адміністратори

| Email | Password | Role | Status |
|-------|----------|------|--------|
| `admin@foryou-realestate.com` | `REDACTED_PASSWORD` | ADMIN | ACTIVE |
| `admin@admin.com` | `REDACTED_PASSWORD` | ADMIN | ACTIVE |

---

## 👥 Тестові користувачі

**Всі тестові користувачі мають пароль: `Test123!`**

### CLIENT (10 користувачів)

| Email | Password | Role | Status | Ім'я |
|-------|----------|------|--------|------|
| `client1@test.com` | `Test123!` | CLIENT | ACTIVE | Emma Johnson |
| `client2@test.com` | `Test123!` | CLIENT | ACTIVE | Michael Williams |
| `client3@test.com` | `Test123!` | CLIENT | ACTIVE | Sophia Brown |
| `client4@test.com` | `Test123!` | CLIENT | ACTIVE | William Jones |
| `client5@test.com` | `Test123!` | CLIENT | ACTIVE | Olivia Garcia |
| `client6@test.com` | `Test123!` | CLIENT | ACTIVE | James Miller |
| `client7@test.com` | `Test123!` | CLIENT | ACTIVE | Isabella Davis |
| `client8@test.com` | `Test123!` | CLIENT | ACTIVE | Alexander Rodriguez |
| `client9@test.com` | `Test123!` | CLIENT | ACTIVE | Mia Martinez |
| `client10@test.com` | `Test123!` | CLIENT | ACTIVE | John Smith |

### BROKER (5 користувачів)

| Email | Password | Role | Status | Ім'я | License |
|-------|----------|------|--------|------|---------|
| `broker1@test.com` | `Test123!` | BROKER | ACTIVE | Sarah Anderson | BRK-0001 |
| `broker2@test.com` | `Test123!` | BROKER | ACTIVE | Robert Thomas | BRK-0002 |
| `broker3@test.com` | `Test123!` | BROKER | ACTIVE | Jessica Taylor | BRK-0003 |
| `broker4@test.com` | `Test123!` | BROKER | PENDING | Daniel Moore | BRK-0004 |
| `broker5@test.com` | `Test123!` | BROKER | PENDING | David Wilson | BRK-0005 |

### INVESTOR (5 користувачів)

| Email | Password | Role | Status | Ім'я |
|-------|----------|------|--------|------|
| `investor1@test.com` | `Test123!` | INVESTOR | ACTIVE | Amanda Martin |
| `investor2@test.com` | `Test123!` | INVESTOR | ACTIVE | Matthew Lee |
| `investor3@test.com` | `Test123!` | INVESTOR | ACTIVE | Lisa Thompson |
| `investor4@test.com` | `Test123!` | INVESTOR | PENDING | Andrew White |
| `investor5@test.com` | `Test123!` | INVESTOR | PENDING | Christopher Jackson |

---

## 📊 Статистика тестових даних

- **Користувачі:** 20 (10 CLIENT, 5 BROKER, 5 INVESTOR)
- **Developers:** 274
- **News:** 10 (7 опубліковано)
- **Courses:** 8
- **Properties:** 0 (потрібно створити)
- **Investments:** 0 (потрібно створити)
- **Favorites:** 0 (потрібно створити)
- **Collections:** 0 (потрібно створити)

---

## 🔗 API Endpoints

**Base URL:** `https://admin.foryou-realestate.com/api`

**Приклади:**
- `POST https://admin.foryou-realestate.com/api/auth/login`
- `GET https://admin.foryou-realestate.com/api/auth/me`
- `GET https://admin.foryou-realestate.com/api/properties`
- `GET https://admin.foryou-realestate.com/api/v1/properties` (для мобільного додатку)

---

## 📱 Оновлення мобільного додатку після міграції

**Якщо додаток використовував старий IP або домен**, дивіться детальну інструкцію:
👉 **[MOBILE_APP_API_UPDATE.md](./MOBILE_APP_API_UPDATE.md)**

**Коротко:**
- ✅ Якщо використовується `admin.foryou-realestate.com` → **нічого міняти не потрібно**
- ⚠️ Якщо використовується IP `88.99.38.25` → **потрібно оновити на `https://admin.foryou-realestate.com/api`**
- ⚠️ Якщо використовується `foryou-realestate.com` → **рекомендується оновити на `https://admin.foryou-realestate.com/api`**

