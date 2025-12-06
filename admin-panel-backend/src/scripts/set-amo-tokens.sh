#!/bin/bash

# Скрипт для встановлення AMO CRM токенів
# Використання: ./set-amo-tokens.sh <access_token> [refresh_token] [expires_in]

BASE_URL="https://admin.foryou-realestate.com/api"
ADMIN_EMAIL="admin@foryou-realestate.com"
ADMIN_PASSWORD="REDACTED_PASSWORD"

ACCESS_TOKEN="${1}"
REFRESH_TOKEN="${2:-}"
EXPIRES_IN="${3:-1200}" # 20 хвилин за замовчуванням

if [ -z "$ACCESS_TOKEN" ]; then
  echo "❌ Помилка: access_token є обов'язковим"
  echo "Використання: $0 <access_token> [refresh_token] [expires_in]"
  exit 1
fi

echo -e "\n\033[0;34m═══════════════════════════════════════════════════════\033[0m"
echo -e "\033[0;34m  🔑 Встановлення AMO CRM токенів\033[0m"
echo -e "\033[0;34m═══════════════════════════════════════════════════════\033[0m\n"

# Step 1: Get admin token
echo -e "\033[1;33m🔐 Отримую admin token...\033[0m"
LOGIN_RESPONSE=$(curl -s -X POST "${BASE_URL}/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"${ADMIN_EMAIL}\",\"password\":\"${ADMIN_PASSWORD}\"}")

TOKEN=$(echo "${LOGIN_RESPONSE}" | python3 -c "import sys, json; print(json.load(sys.stdin).get('data', {}).get('token', ''))")

if [ -z "$TOKEN" ]; then
  echo -e "  \033[0;31m❌ Не вдалося отримати token.\033[0m"
  exit 1
fi

echo -e "  \033[0;32m✅ Token отримано!\033[0m"

# Step 2: Set AMO CRM tokens
echo -e "\n\033[1;33m💾 Встановлюю AMO CRM токени...\033[0m"

PAYLOAD="{\"access_token\":\"${ACCESS_TOKEN}\""
if [ -n "$REFRESH_TOKEN" ]; then
  PAYLOAD="${PAYLOAD},\"refresh_token\":\"${REFRESH_TOKEN}\""
fi
PAYLOAD="${PAYLOAD},\"expires_in\":${EXPIRES_IN}}"

RESPONSE=$(curl -s -X POST "${BASE_URL}/amo-crm/set-tokens" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "${PAYLOAD}")

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

echo -e "\n\033[0;34m═══════════════════════════════════════════════════════\033[0m"
echo -e "\033[0;32m  ✅ Готово!\033[0m"
echo -e "\033[0;34m═══════════════════════════════════════════════════════\033[0m\n"

