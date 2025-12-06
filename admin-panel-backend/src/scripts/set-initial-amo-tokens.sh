#!/bin/bash

# Скрипт для встановлення початкових AMO CRM токенів з наданих даних
# Використання: ./set-initial-amo-tokens.sh

BASE_URL="https://admin.foryou-realestate.com/api"
ADMIN_EMAIL="admin@foryou-realestate.com"
ADMIN_PASSWORD="REDACTED_PASSWORD"

# Токени з наданих даних
# JWT токен (довгий) - це access_token
ACCESS_TOKEN="eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiIsImp0aSI6ImY2YWFlYzZiYWMwNmVlNDNiM2Y4ZDc5NzI4NDNhYWJjMWIzMzZjNTNmYThmOGNlMWQzN2E5YTRmYTYwNDdjZmQ5NjNhMjFjZjFiNjI3ZWFkIn0.eyJhdWQiOiIyOTEyNzgwZi1hMWU0LTRkNWQtYTA2OS1lZTAxNDIyZDhiZWYiLCJqdGkiOiJmNmFhZWM2YmFjMDZlZTQzYjNmOGQ3OTcyODQzYWFiYzFiMzM2YzUzZmE4ZjhjZTFkMzdhOWE0ZmE2MDQ3Y2ZkOTYzYTIxY2YxYjYyN2VhZCIsImlhdCI6MTc2NTAxMTg5OSwibmJmIjoxNzY1MDExODk5LCJleHAiOjE3OTU4MjQwMDAsInN1YiI6IjEwNjg4Njk0IiwiZ3JhbnRfdHlwZSI6IiIsImFjY291bnRfaWQiOjMxOTIwMTk0LCJiYXNlX2RvbWFpbiI6ImFtb2NybS5ydSIsInZlcnNpb24iOjIsInNjb3BlcyI6WyJjcm0iLCJmaWxlcyIsImZpbGVzX2RlbGV0ZSIsIm5vdGlmaWNhdGlvbnMiLCJwdXNoX25vdGlmaWNhdGlvbnMiXSwiaGFzaF91dWlkIjoiN2ExYzBiYmUtOTJkMy00ZjI3LWFmMTUtYjc5Njg1YjA2OTI1IiwidXNlcl9mbGFncyI6MCwiYXBpX2RvbWFpbiI6ImFwaS1iLmFtb2NybS5ydSJ9.e21bJR8VeuAI50mFK2P2s9q-GtvJTjVvxCeQuarQgvLESgtFjHJEdsbeYp2OY89IlLgfoMbZLvsAc3WlHFq_FvWRnBSDHL4DcIyXVuNGS4144-3t_CyjPwpXsuKUS1noYtlgfMei5d-ywKaM6jfmtuaAKE--LqN4Gi-7ayt50oxyrKGPo3aBm_fmwmwpUh7EUu7kQ3DRpI0C7-w_MseoaY2fHEX7zUee1W0Ljjy80B4mI3lS2B_gfBcl-fyb_d020CK0UqfSJMrSqNJARGXFN-oBi2QQy3qhyPCKEYOQ61KxYU4CjN6bvRcyiEbWbsE7wVpjHv5i9bNqL9aHUiMgVA"

# Refresh token (код авторизації) - це refresh_token
REFRESH_TOKEN="def50200136ae79ec7c75ee8f8c49cb7b40219ea8082f22b25594ec4fa1235743767fcba8b0add6a6ca9f3420675d7565a213b8970e21b86759c772f8888dfc67728d43cafffc4932a0f8ef2509fdac5841c5ecb51946d3a0b211823ad7e06a9de9faa7d83c4860a83cdd3188ff420f92725b7a60c0178e98a9cec182171f542e610fcbc7be62700416b7dcb2a78c6a10233487ef769dc3f911d8a2439ac67bc9f93b110e3bf0d19695a3d44669ef8da084a01bcd6562111a86ede09d7e0d2d5520cecf15a82ecc7930fe7d350da4ab96ae16fb68bd2ba994af75d0bc4b5dd571d855814ed9f3d006348213458234c98475488389261c5a689001bf8a877afb806a53a1a7aeb9b22cf458f46c0430b6509bf73aa96074075f962b26eaae6cec9064a293ab527fe7cf03e71d8bb97f7b4a72ae6ac31dd0b4f6b0602a792d885dd09b5e999138079e3c123d0f04b0c3ef9677368d240866025307fb880f868b87e990ee060db689fd507c568dc8f8bbda576c36ec50d2a8b86b7fb62e3e823262fb9af00a38d5240579290c4f8fc7ca5cbf9f7850fa391dd9156d551590bf7b7416dc0d2ba73f3e4cc601e7ce6e12c125b68a7092cf7bd91185126a949c7d7a0027bb3cea2d76e88e04b006b7b8722b49d4beecac07f8e40e87dc247363c04d5b0b47ebc9d0ed7dccde9b9c638063ddfd51ac6bd526be3c77d0dbffe006fc1bd68b77da434b1ac25151e072888178361743584c20d4c007e06"

# Термін дії токена (20 хвилин = 1200 секунд)
EXPIRES_IN=1200

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

