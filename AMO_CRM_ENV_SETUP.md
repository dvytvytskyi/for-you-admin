# 🔧 AMO CRM - Налаштування змінних оточення

## 📋 Змінні для `.env` файлу

Додайте наступні змінні в `admin-panel-backend/.env`:

```env
# AMO CRM налаштування
AMO_DOMAIN=reforyou.amocrm.ru
AMO_CLIENT_ID=2912780f-a1e4-4d5d-a069-ee01422d8bef
AMO_CLIENT_SECRET=PW0FFyI4WRLzGgKeD7ZTdTFykSMhMNPkCk1WJ6fBzdvmjvc2RQEt1eO6t88fPBhH
AMO_ACCOUNT_ID=31920194
AMO_API_DOMAIN=api-b.amocrm.ru
AMO_REDIRECT_URI=https://admin.foryou-realestate.com/api/amo-crm/callback

# API ключ для комунікації з Main Backend (створіть безпечний ключ)
MAIN_BACKEND_API_KEY=your-secure-api-key-here
MAIN_BACKEND_URL=https://foryou-realestate.com/api/v1
```

## 🔑 Встановлення токенів

Якщо у вас вже є токени (access_token, refresh_token), ви можете встановити їх через API:

### Варіант 1: Через скрипт

```bash
cd admin-panel-backend/src/scripts
./set-amo-tokens.sh "your-access-token" "your-refresh-token" 1200
```

### Варіант 2: Через API напряму

```bash
# 1. Отримати admin token
TOKEN=$(curl -s -X POST https://admin.foryou-realestate.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@foryou-realestate.com","password":"Admin123!"}' \
  | python3 -c "import sys, json; print(json.load(sys.stdin)['data']['token'])")

# 2. Встановити AMO CRM токени
curl -X POST https://admin.foryou-realestate.com/api/amo-crm/set-tokens \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "access_token": "your-access-token",
    "refresh_token": "your-refresh-token",
    "expires_in": 1200
  }'
```

## 📝 Створення таблиці для токенів

Перед використанням потрібно створити таблицю в БД:

```bash
# На сервері
docker exec -i for-you-admin-panel-postgres-prod psql -U admin -d admin_panel < admin-panel-backend/src/scripts/create-amo-crm-tokens-table.sql
```

Або виконайте SQL вручну:

```sql
CREATE TABLE IF NOT EXISTS amo_crm_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  expires_in INTEGER NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  token_type VARCHAR(50) DEFAULT 'Bearer',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_amo_crm_tokens_expires_at ON amo_crm_tokens(expires_at);
```

## ✅ Перевірка налаштування

Після встановлення змінних та токенів:

```bash
# Перевірити статус підключення
curl -X GET https://admin.foryou-realestate.com/api/amo-crm/status \
  -H "Authorization: Bearer $TOKEN"
```

## 🔄 Оновлення токенів

Токени автоматично оновлюються через refresh_token, коли вони прострочуються. Якщо refresh_token також прострочений, потрібно виконати нову авторизацію через `/api/amo-crm/exchange-api-key`.

