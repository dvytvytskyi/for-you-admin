#!/bin/bash

# Скрипт для встановлення початкових AMO CRM токенів з наданих даних
# Використання: ./set-initial-amo-tokens.sh

BASE_URL="https://admin.foryou-realestate.com/api"
ADMIN_EMAIL="admin@foryou-realestate.com"
ADMIN_PASSWORD="REDACTED_PASSWORD"

# Токени з наданих даних (оновлені довготривалі токени)
# JWT токен (довготривалий) - це access_token (термін дії до 2027 року)
ACCESS_TOKEN="eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiIsImp0aSI6ImVmY2VjZjk0M2Q3YjZkYjBjZWE0M2I5MzdlNGY1ZjUxMmU1Y2FmMzRmMTA3YWQyNDYyZDJhZmVmNDg5MzViMzM3ZjEwNGE5OGM1MWFjZmQ1In0.eyJhdWQiOiIyOTEyNzgwZi1hMWU0LTRkNWQtYTA2OS1lZTAxNDIyZDhiZWYiLCJqdGkiOiJlZmNlY2Y5NDNkN2I2ZGIwY2VhNDNiOTM3ZTRmNWY1MTJlNWNhZjM0ZjEwN2FkMjQ2MmQyYWZlZjQ4OTM1YjMzN2YxMDRhOThjNTFhY2ZkNSIsImlhdCI6MTc2NTA0NDE0NSwibmJmIjoxNzY1MDQ0MTQ1LCJleHAiOjE4MDg5NTY4MDAsInN1YiI6IjEwNjg4Njk0IiwiZ3JhbnRfdHlwZSI6IiIsImFjY291bnRfaWQiOjMxOTIwMTk0LCJiYXNlX2RvbWFpbiI6ImFtb2NybS5ydSIsInZlcnNpb24iOjIsInNjb3BlcyI6WyJjcm0iLCJmaWxlcyIsImZpbGVzX2RlbGV0ZSIsIm5vdGlmaWNhdGlvbnMiLCJwdXNoX25vdGlmaWNhdGlvbnMiXSwiaGFzaF91dWlkIjoiYWExMjliYzItNzI3Zi00NjE0LTk3MGYtYjg5NWNlMzI4ZjcyIiwidXNlcl9mbGFncyI6MCwiYXBpX2RvbWFpbiI6ImFwaS1iLmFtb2NybS5ydSJ9.m9sXav75skTj7l3SupdslpdRfYZ-5FnHDpZbtLsYnhc5cHnUEI16YZI-O118kO-xwlZxehmTrU56wD9mX1anJQvThNuaadUwFqjf2IVouoOvmKQTFc9Reh0F7H3HUQCQwgimCFQGfSikOL4lIzV3LM8dioYYTEW4pLKxFR5uzlOVCCs6Msxho2N9OgMUmDhmJRK4c3MQDCq64DgYn756xql4k92rexShp3IYQN2tOzNLC0RQpBkhHaBBK0DWCm011EjUv1PFDECOagLHwY-IP2JR7Eljft_rHs4pbIcGHmLPUTEowpHClMke04ehJGJMw1b2eabWw8XfUWV23g780Q"

# Refresh token (короткий) - це refresh_token
REFRESH_TOKEN="def502006c8d886435934524daeb74668101d361463d00d544b949b6c3c1115645c01f53f2f58642a952835521dccf88ed299c0117a1aae8b8e1fe446137f22fd2aaf20051292063b52c2cd0d76e629afc3b3759a11f7c996886a7fa31175493093f8231237bae4ac12ab05522d5d32bedc497f0cf5b0f79b58b9fdaa607cdf587f77b754ea7feeeaa234bdeb050e0bf39e25cc65894d7e365821f5a71b537d4da084bf349ac2c0fa7d3edb4a91bd4cf82e0ed1ad62832629ef41de960417417542434485ebae536c1c96a2c95e05af979cbec3171a031a27e7f4d5882ba354e1c1c9d393ded5bf0b36cf444517decc7ac39bbfd1957f849d5718d8a5ce84189dac70d1b9bb0263ea3b8645b28ac95a6eb7a902846616b42f525ecfc06d07e09e19a8a9fe72270fa66516d765838fcad5c80b3d79138b44e0c77cb06a2a3e0ee89aa287c0a61307f7d6f57b0ea04690e5468ae62a18d5442ce669d1862f7318adb9ea670c334ee7f5fc714792241fdae2b93f502034494932f36bdece1197ff6684b0bd4a819f65de5036c623d604f83edb7486dd5eaa243f370d873fcf396dc935b77950f88a478015694ea17da87ee3d6576565fa04dd6bf0a4ad7a04cf384d16755abed17ffcf59aacc85e143f175a44fd4a541029254fc196a3a0eac139e64d5cbf5d23099930a8835b97d0342331285037f3c99f33aff783db87e2c984fab624915b0f703f3c059dd30bdea912dd0198a6e11e74757"

# Термін дії токена (довготривалий токен - до 2027 року, але встановлюємо 5 років = 157680000 секунд)
# Або можна використати менше значення для безпеки
EXPIRES_IN=157680000

echo -e "\n\033[0;34m═══════════════════════════════════════════════════════\033[0m"
echo -e "\033[0;34m  🔑 Встановлення початкових AMO CRM токенів\033[0m"
echo -e "\033[0;34m═══════════════════════════════════════════════════════\033[0m\n"

# Step 1: Get admin token
echo -e "\033[1;33m🔐 Отримую admin token...\033[0m"
LOGIN_RESPONSE=$(curl -s -X POST "${BASE_URL}/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"${ADMIN_EMAIL}\",\"password\":\"${ADMIN_PASSWORD}\"}")

TOKEN=$(echo "${LOGIN_RESPONSE}" | python3 -c "import sys, json; print(json.load(sys.stdin).get('data', {}).get('token', ''))")

if [ -z "$TOKEN" ]; then
  echo -e "  \033[0;31m❌ Не вдалося отримати token.\033[0m"
  echo "   Response: ${LOGIN_RESPONSE}"
  exit 1
fi

echo -e "  \033[0;32m✅ Token отримано!\033[0m"

# Step 2: Set AMO CRM tokens
echo -e "\n\033[1;33m💾 Встановлюю AMO CRM токени...\033[0m"

RESPONSE=$(curl -s -X POST "${BASE_URL}/amo-crm/set-tokens" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{
    \"access_token\": \"${ACCESS_TOKEN}\",
    \"refresh_token\": \"${REFRESH_TOKEN}\",
    \"expires_in\": ${EXPIRES_IN}
  }")

SUCCESS=$(echo "${RESPONSE}" | python3 -c "import sys, json; print(json.load(sys.stdin).get('success', False))")
MESSAGE=$(echo "${RESPONSE}" | python3 -c "import sys, json; print(json.load(sys.stdin).get('message', ''))")

echo -e "\033[0;34mResponse:\033[0m"
echo "${RESPONSE}" | python3 -m json.tool 2>/dev/null || echo "${RESPONSE}"

if [ "$SUCCESS" == "True" ] || [ "$SUCCESS" == "true" ]; then
  echo -e "\n\033[0;32m✅ Токени успішно встановлено!\033[0m"
  echo "   ${MESSAGE}"
else
  echo -e "\n\033[0;31m❌ Помилка встановлення токенів\033[0m"
  exit 1
fi

# Step 3: Verify connection status
echo -e "\n\033[1;33m🔍 Перевіряю статус підключення...\033[0m"
STATUS_RESPONSE=$(curl -s -X GET "${BASE_URL}/amo-crm/status" \
  -H "Authorization: Bearer $TOKEN")

STATUS_CONNECTED=$(echo "${STATUS_RESPONSE}" | python3 -c "import sys, json; print(json.load(sys.stdin).get('data', {}).get('connected', False))")

echo -e "\033[0;34mResponse:\033[0m"
echo "${STATUS_RESPONSE}" | python3 -m json.tool 2>/dev/null || echo "${STATUS_RESPONSE}"

if [ "$STATUS_CONNECTED" == "True" ] || [ "$STATUS_CONNECTED" == "true" ]; then
  echo -e "\n\033[0;32m✅ AMO CRM підключено та готово до використання!\033[0m"
else
  echo -e "\n\033[0;33m⚠️  Підключення не встановлено\033[0m"
fi

echo -e "\n\033[0;34m═══════════════════════════════════════════════════════\033[0m"
echo -e "\033[0;32m  ✅ Готово!\033[0m"
echo -e "\033[0;34m═══════════════════════════════════════════════════════\033[0m\n"

