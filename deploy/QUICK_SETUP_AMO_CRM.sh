#!/bin/bash
# Швидке налаштування AMO CRM для /root/admin-panel
# Виконайте на сервері: bash <(curl -s) або скопіюйте та виконайте

set -e

cd /root/admin-panel

echo "📝 Крок 1: Додавання змінних оточення..."

# Знаходимо .env файл
ENV_FILE="admin-panel-backend/.env"
if [ ! -f "$ENV_FILE" ]; then
  ENV_FILE=".env"
fi

if [ ! -f "$ENV_FILE" ]; then
  echo "❌ Файл .env не знайдено в $ENV_FILE"
  echo "Створюю .env файл..."
  touch "$ENV_FILE"
fi

# Додаємо змінні, якщо їх немає
if ! grep -q "AMO_DOMAIN=" "$ENV_FILE"; then
  echo "   Додаю AMO CRM змінні..."
  cat >> "$ENV_FILE" << 'EOF'

# AMO CRM налаштування
AMO_DOMAIN=reforyou.amocrm.ru
AMO_CLIENT_ID=2912780f-a1e4-4d5d-a069-ee01422d8bef
AMO_CLIENT_SECRET=PW0FFyI4WRLzGgKeD7ZTdTFykSMhMNPkCk1WJ6fBzdvmjvc2RQEt1eO6t88fPBhH
AMO_ACCOUNT_ID=31920194
AMO_API_DOMAIN=api-b.amocrm.ru
AMO_REDIRECT_URI=https://admin.foryou-realestate.com/api/amo-crm/callback

# API ключ для комунікації з Main Backend
MAIN_BACKEND_API_KEY=your-secure-api-key-here
MAIN_BACKEND_URL=https://foryou-realestate.com/api/v1
EOF
  echo "   ✅ Змінні додано"
else
  echo "   ✅ Змінні вже присутні"
fi

echo ""
echo "🗄️  Крок 2: Створення таблиці токенів..."

# Створюємо таблицю напряму
docker exec -i for-you-admin-panel-postgres-prod psql -U admin -d admin_panel << 'SQL' 2>&1 | grep -v "NOTICE" || true
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
SQL

echo "   ✅ Таблиця створена"

echo ""
echo "🔄 Крок 3: Перезапуск backend..."

cd /root/admin-panel
docker compose -f docker-compose.prod.yml restart for-you-admin-panel-backend-prod 2>&1 || docker compose restart for-you-admin-panel-backend-prod 2>&1

echo "   ✅ Backend перезапущено"
echo "   ⏳ Чекаємо 10 секунд для ініціалізації..."
sleep 10

echo ""
echo "🔑 Крок 4: Встановлення токенів..."

# Встановлюємо токени через API
BASE_URL="https://admin.foryou-realestate.com/api"
ADMIN_EMAIL="admin@foryou-realestate.com"
ADMIN_PASSWORD="REDACTED_PASSWORD"

echo "   Отримую admin token..."
LOGIN_RESPONSE=$(curl -s -X POST "${BASE_URL}/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"${ADMIN_EMAIL}\",\"password\":\"${ADMIN_PASSWORD}\"}")

TOKEN=$(echo "${LOGIN_RESPONSE}" | python3 -c "import sys, json; print(json.load(sys.stdin).get('data', {}).get('token', ''))" 2>/dev/null || echo "")

if [ -z "$TOKEN" ]; then
  echo "   ❌ Не вдалося отримати token"
  echo "   Встановіть токени вручну через API endpoint /api/amo-crm/set-tokens"
else
  echo "   Встановлюю токени..."
  RESPONSE=$(curl -s -X POST "${BASE_URL}/amo-crm/set-tokens" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    -d '{
      "access_token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiIsImp0aSI6ImVmY2VjZjk0M2Q3YjZkYjBjZWE0M2I5MzdlNGY1ZjUxMmU1Y2FmMzRmMTA3YWQyNDYyZDJhZmVmNDg5MzViMzM3ZjEwNGE5OGM1MWFjZmQ1In0.eyJhdWQiOiIyOTEyNzgwZi1hMWU0LTRkNWQtYTA2OS1lZTAxNDIyZDhiZWYiLCJqdGkiOiJlZmNlY2Y5NDNkN2I2ZGIwY2VhNDNiOTM3ZTRmNWY1MTJlNWNhZjM0ZjEwN2FkMjQ2MmQyYWZlZjQ4OTM1YjMzN2YxMDRhOThjNTFhY2ZkNSIsImlhdCI6MTc2NTA0NDE0NSwibmJmIjoxNzY1MDQ0MTQ1LCJleHAiOjE4MDg5NTY4MDAsInN1YiI6IjEwNjg4Njk0IiwiZ3JhbnRfdHlwZSI6IiIsImFjY291bnRfaWQiOjMxOTIwMTk0LCJiYXNlX2RvbWFpbiI6ImFtb2NybS5ydSIsInZlcnNpb24iOjIsInNjb3BlcyI6WyJjcm0iLCJmaWxlcyIsImZpbGVzX2RlbGV0ZSIsIm5vdGlmaWNhdGlvbnMiLCJwdXNoX25vdGlmaWNhdGlvbnMiXSwiaGFzaF91dWlkIjoiYWExMjliYzItNzI3Zi00NjE0LTk3MGYtYjg5NWNlMzI4ZjcyIiwidXNlcl9mbGFncyI6MCwiYXBpX2RvbWFpbiI6ImFwaS1iLmFtb2NybS5ydSJ9.m9sXav75skTj7l3SupdslpdRfYZ-5FnHDpZbtLsYnhc5cHnUEI16YZI-O118kO-xwlZxehmTrU56wD9mX1anJQvThNuaadUwFqjf2IVouoOvmKQTFc9Reh0F7H3HUQCQwgimCFQGfSikOL4lIzV3LM8dioYYTEW4pLKxFR5uzlOVCCs6Msxho2N9OgMUmDhmJRK4c3MQDCq64DgYn756xql4k92rexShp3IYQN2tOzNLC0RQpBkhHaBBK0DWCm011EjUv1PFDECOagLHwY-IP2JR7Eljft_rHs4pbIcGHmLPUTEowpHClMke04ehJGJMw1b2eabWw8XfUWV23g780Q",
      "refresh_token": "def502006c8d886435934524daeb74668101d361463d00d544b949b6c3c1115645c01f53f2f58642a952835521dccf88ed299c0117a1aae8b8e1fe446137f22fd2aaf20051292063b52c2cd0d76e629afc3b3759a11f7c996886a7fa31175493093f8231237bae4ac12ab05522d5d32bedc497f0cf5b0f79b58b9fdaa607cdf587f77b754ea7feeeaa234bdeb050e0bf39e25cc65894d7e365821f5a71b537d4da084bf349ac2c0fa7d3edb4a91bd4cf82e0ed1ad62832629ef41de960417417542434485ebae536c1c96a2c95e05af979cbec3171a031a27e7f4d5882ba354e1c1c9d393ded5bf0b36cf444517decc7ac39bbfd1957f849d5718d8a5ce84189dac70d1b9bb0263ea3b8645b28ac95a6eb7a902846616b42f525ecfc06d07e09e19a8a9fe72270fa66516d765838fcad5c80b3d79138b44e0c77cb06a2a3e0ee89aa287c0a61307f7d6f57b0ea04690e5468ae62a18d5442ce669d1862f7318adb9ea670c334ee7f5fc714792241fdae2b93f502034494932f36bdece1197ff6684b0bd4a819f65de5036c623d604f83edb7486dd5eaa243f370d873fcf396dc935b77950f88a478015694ea17da87ee3d6576565fa04dd6bf0a4ad7a04cf384d16755abed17ffcf59aacc85e143f175a44fd4a541029254fc196a3a0eac139e64d5cbf5d23099930a8835b97d0342331285037f3c99f33aff783db87e2c984fab624915b0f703f3c059dd30bdea912dd0198a6e11e74757",
      "expires_in": 157680000
    }')
  
  if echo "$RESPONSE" | grep -q "success.*true\|success\":true"; then
    echo "   ✅ Токени встановлено успішно"
  else
    echo "   ⚠️  Можлива помилка:"
    echo "$RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$RESPONSE"
  fi
fi

echo ""
echo "✅ Налаштування AMO CRM завершено!"
echo ""
echo "📋 Наступні кроки:"
echo "   1. Налаштуйте webhook в AMO CRM:"
echo "      URL: https://admin.foryou-realestate.com/api/amo-crm/webhook"
echo "   2. Перевірте статус:"
echo "      curl -X GET https://admin.foryou-realestate.com/api/amo-crm/status \\"
echo "        -H \"Authorization: Bearer \$TOKEN\""
echo ""

