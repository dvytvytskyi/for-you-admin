# 🚀 AMO CRM - Повне налаштування

## ✅ Що вже зроблено

1. ✅ Створено `AmoCrmService` з усіма методами
2. ✅ Створено routes для AMO CRM
3. ✅ Створено entity `AmoCrmToken` для локального зберігання токенів
4. ✅ Додано endpoint `/api/amo-crm/set-tokens` для встановлення токенів
5. ✅ Створено SQL скрипт для створення таблиці токенів
6. ✅ Створено скрипти для встановлення токенів

## 📋 Кроки для налаштування на сервері

### Крок 1: Додати змінні оточення

Додайте в `.env` файл на сервері (`admin-panel-backend/.env`):

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

### Крок 2: Створити таблицю для токенів

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

### Крок 3: Перезапустити backend

```bash
docker compose restart for-you-admin-panel-backend-prod
```

### Крок 4: Встановити токени

Виконайте скрипт для встановлення токенів:

```bash
cd admin-panel-backend/src/scripts
./set-initial-amo-tokens.sh
```

Або вручну через API:

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
    "access_token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiIsImp0aSI6ImY2YWFlYzZiYWMwNmVlNDNiM2Y4ZDc5NzI4NDNhYWJjMWIzMzZjNTNmYThmOGNlMWQzN2E5YTRmYTYwNDdjZmQ5NjNhMjFjZjFiNjI3ZWFkIn0.eyJhdWQiOiIyOTEyNzgwZi1hMWU0LTRkNWQtYTA2OS1lZTAxNDIyZDhiZWYiLCJqdGkiOiJmNmFhZWM2YmFjMDZlZTQzYjNmOGQ3OTcyODQzYWFiYzFiMzM2YzUzZmE4ZjhjZTFkMzdhOWE0ZmE2MDQ3Y2ZkOTYzYTIxY2YxYjYyN2VhZCIsImlhdCI6MTc2NTAxMTg5OSwibmJmIjoxNzY1MDExODk5LCJleHAiOjE3OTU4MjQwMDAsInN1YiI6IjEwNjg4Njk0IiwiZ3JhbnRfdHlwZSI6IiIsImFjY291bnRfaWQiOjMxOTIwMTk0LCJiYXNlX2RvbWFpbiI6ImFtb2NybS5ydSIsInZlcnNpb24iOjIsInNjb3BlcyI6WyJjcm0iLCJmaWxlcyIsImZpbGVzX2RlbGV0ZSIsIm5vdGlmaWNhdGlvbnMiLCJwdXNoX25vdGlmaWNhdGlvbnMiXSwiaGFzaF91dWlkIjoiN2ExYzBiYmUtOTJkMy00ZjI3LWFmMTUtYjc5Njg1YjA2OTI1IiwidXNlcl9mbGFncyI6MCwiYXBpX2RvbWFpbiI6ImFwaS1iLmFtb2NybS5ydSJ9.e21bJR8VeuAI50mFK2P2s9q-GtvJTjVvxCeQuarQgvLESgtFjHJEdsbeYp2OY89IlLgfoMbZLvsAc3WlHFq_FvWRnBSDHL4DcIyXVuNGS4144-3t_CyjPwpXsuKUS1noYtlgfMei5d-ywKaM6jfmtuaAKE--LqN4Gi-7ayt50oxyrKGPo3aBm_fmwmwpUh7EUu7kQ3DRpI0C7-w_MseoaY2fHEX7zUee1W0Ljjy80B4mI3lS2B_gfBcl-fyb_d020CK0UqfSJMrSqNJARGXFN-oBi2QQy3qhyPCKEYOQ61KxYU4CjN6bvRcyiEbWbsE7wVpjHv5i9bNqL9aHUiMgVA",
    "refresh_token": "def50200136ae79ec7c75ee8f8c49cb7b40219ea8082f22b25594ec4fa1235743767fcba8b0add6a6ca9f3420675d7565a213b8970e21b86759c772f8888dfc67728d43cafffc4932a0f8ef2509fdac5841c5ecb51946d3a0b211823ad7e06a9de9faa7d83c4860a83cdd3188ff420f92725b7a60c0178e98a9cec182171f542e610fcbc7be62700416b7dcb2a78c6a10233487ef769dc3f911d8a2439ac67bc9f93b110e3bf0d19695a3d44669ef8da084a01bcd6562111a86ede09d7e0d2d5520cecf15a82ecc7930fe7d350da4ab96ae16fb68bd2ba994af75d0bc4b5dd571d855814ed9f3d006348213458234c98475488389261c5a689001bf8a877afb806a53a1a7aeb9b22cf458f46c0430b6509bf73aa96074075f962b26eaae6cec9064a293ab527fe7cf03e71d8bb97f7b4a72ae6ac31dd0b4f6b0602a792d885dd09b5e999138079e3c123d0f04b0c3ef9677368d240866025307fb880f868b87e990ee060db689fd507c568dc8f8bbda576c36ec50d2a8b86b7fb62e3e823262fb9af00a38d5240579290c4f8fc7ca5cbf9f7850fa391dd9156d551590bf7b7416dc0d2ba73f3e4cc601e7ce6e12c125b68a7092cf7bd91185126a949c7d7a0027bb3cea2d76e88e04b006b7b8722b49d4beecac07f8e40e87dc247363c04d5b0b47ebc9d0ed7dccde9b9c638063ddfd51ac6bd526be3c77d0dbffe006fc1bd68b77da434b1ac25151e072888178361743584c20d4c007e06",
    "expires_in": 1200
  }'
```

### Крок 5: Перевірити підключення

```bash
# Перевірити статус
curl -X GET https://admin.foryou-realestate.com/api/amo-crm/status \
  -H "Authorization: Bearer $TOKEN"
```

Або використайте тестовий скрипт:

```bash
./admin-panel-backend/test-amo-crm.sh
```

## 🔧 Налаштування Webhook в AMO CRM

1. Зайдіть в AMO CRM → Налаштування → Віджеті та інтеграції → Webhooks
2. Додайте webhook URL:
   ```
   https://admin.foryou-realestate.com/api/amo-crm/webhook
   ```
3. Оберіть події:
   - ✅ Leads: статус змінився
   - ✅ Leads: додано
   - ✅ Leads: оновлено
   - ✅ Contacts: додано
   - ✅ Contacts: оновлено
   - ✅ Tasks: додано
   - ✅ Tasks: оновлено

## 📚 Доступні Endpoints

- `POST /api/amo-crm/exchange-api-key` - Обмін API ключа на authorization code
- `GET /api/amo-crm/callback` - OAuth callback endpoint
- `GET /api/amo-crm/status` - Перевірити статус підключення
- `POST /api/amo-crm/sync/pipelines` - Синхронізація pipelines
- `POST /api/amo-crm/sync/leads` - Синхронізація leads
- `POST /api/amo-crm/set-tokens` - Встановити токени напряму
- `POST /api/amo-crm/create-lead` - Створити lead (з Main Backend)
- `POST /api/amo-crm/update-lead` - Оновити lead (з Main Backend)
- `POST /api/amo-crm/webhook` - Webhook endpoint

## ⚠️ Важливі примітки

1. **Токени автоматично оновлюються** через refresh_token, коли вони прострочуються
2. **Локальне зберігання** - це fallback, якщо Main Backend не готовий
3. **Webhook завжди повертає 200 OK**, навіть при помилках обробки
4. **MAIN_BACKEND_API_KEY** - створіть безпечний ключ для комунікації між сервісами

## 🐛 Troubleshooting

### Помилка: "AMO CRM not authorized"
- Перевірте, чи токени встановлені через `/api/amo-crm/set-tokens`
- Перевірте, чи токени не прострочені

### Помилка: "Failed to get token from main backend"
- Це нормально, якщо Main Backend ще не налаштований
- Токени будуть братися з локальної БД

### Помилка: "relation 'amo_crm_tokens' does not exist"
- Виконайте SQL скрипт для створення таблиці (Крок 2)

---

**Останнє оновлення:** Грудень 2025

