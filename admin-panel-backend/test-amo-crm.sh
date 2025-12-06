#!/bin/bash

# Base URL for the API
BASE_URL="https://admin.foryou-realestate.com/api"

# Admin credentials
ADMIN_EMAIL="admin@foryou-realestate.com"
ADMIN_PASSWORD="REDACTED_PASSWORD"

echo -e "\n\033[0;34m═══════════════════════════════════════════════════════\033[0m"
echo -e "\033[0;34m  🔗 Тестування AMO CRM інтеграції\033[0m"
echo -e "\033[0;34m═══════════════════════════════════════════════════════\033[0m\n"

# Step 1: Get admin token
echo -e "\033[1;33m🔐 Крок 1: Отримую admin token...\033[0m"
LOGIN_RESPONSE=$(curl -s -X POST "${BASE_URL}/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"${ADMIN_EMAIL}\",\"password\":\"${ADMIN_PASSWORD}\"}")

TOKEN=$(echo "${LOGIN_RESPONSE}" | python3 -c "import sys, json; print(json.load(sys.stdin).get('data', {}).get('token', ''))")
LOGIN_MESSAGE=$(echo "${LOGIN_RESPONSE}" | python3 -c "import sys, json; print(json.load(sys.stdin).get('message', ''))")

if [ -n "$TOKEN" ]; then
  echo -e "  \033[0;32m✅ Token отримано успішно!\033[0m"
  echo "   Token: ${TOKEN:0:50}..."
else
  echo -e "  \033[0;31m❌ Не вдалося отримати token.\033[0m"
  echo "   Response: ${LOGIN_RESPONSE}"
  exit 1
fi

# Step 2: Check connection status
echo -e "\n\033[1;33m🔍 Крок 2: Перевіряю статус підключення AMO CRM...\033[0m"
STATUS_RESPONSE=$(curl -s -X GET "${BASE_URL}/amo-crm/status" \
  -H "Authorization: Bearer $TOKEN")

STATUS_CONNECTED=$(echo "${STATUS_RESPONSE}" | python3 -c "import sys, json; print(json.load(sys.stdin).get('data', {}).get('connected', False))")
STATUS_HAS_TOKENS=$(echo "${STATUS_RESPONSE}" | python3 -c "import sys, json; print(json.load(sys.stdin).get('data', {}).get('hasTokens', False))")

echo -e "\033[0;34mResponse:\033[0m"
echo "${STATUS_RESPONSE}" | python3 -m json.tool 2>/dev/null || echo "${STATUS_RESPONSE}"

if [ "$STATUS_CONNECTED" == "True" ] || [ "$STATUS_CONNECTED" == "true" ]; then
  echo -e "\n\033[0;32m✅ AMO CRM підключено!\033[0m"
  if [ "$STATUS_HAS_TOKENS" == "True" ] || [ "$STATUS_HAS_TOKENS" == "true" ]; then
    echo -e "   \033[0;32m✅ Токени наявні\033[0m"
  else
    echo -e "   \033[0;33m⚠️  Токени відсутні - потрібна авторизація\033[0m"
  fi
else
  echo -e "\n\033[0;33m⚠️  AMO CRM не підключено\033[0m"
  echo -e "   Для підключення виконайте:"
  echo -e "   \033[0;36mPOST /api/amo-crm/exchange-api-key\033[0m"
  echo -e "   з login та api_key"
fi

# Step 3: Test sync pipelines (optional, only if connected)
if [ "$STATUS_CONNECTED" == "True" ] || [ "$STATUS_CONNECTED" == "true" ]; then
  echo -e "\n\033[1;33m🔄 Крок 3: Тестую синхронізацію pipelines...\033[0m"
  echo -e "   \033[0;33m(Це може зайняти деякий час)\033[0m"
  
  SYNC_RESPONSE=$(curl -s -X POST "${BASE_URL}/amo-crm/sync/pipelines" \
    -H "Authorization: Bearer $TOKEN")
  
  SYNC_SUCCESS=$(echo "${SYNC_RESPONSE}" | python3 -c "import sys, json; print(json.load(sys.stdin).get('success', False))")
  SYNC_SYNCED=$(echo "${SYNC_RESPONSE}" | python3 -c "import sys, json; print(json.load(sys.stdin).get('data', {}).get('synced', 0))")
  
  echo -e "\033[0;34mResponse:\033[0m"
  echo "${SYNC_RESPONSE}" | python3 -m json.tool 2>/dev/null || echo "${SYNC_RESPONSE}"
  
  if [ "$SYNC_SUCCESS" == "True" ] || [ "$SYNC_SUCCESS" == "true" ]; then
    echo -e "\n\033[0;32m✅ Pipelines синхронізовано!\033[0m"
    echo "   Синхронізовано: ${SYNC_SYNCED}"
  else
    echo -e "\n\033[0;31m❌ Помилка синхронізації\033[0m"
  fi
fi

echo -e "\n\033[0;34m═══════════════════════════════════════════════════════\033[0m"
echo -e "\033[0;32m  ✅ Тест завершено!\033[0m"
echo -e "\033[0;34m═══════════════════════════════════════════════════════\033[0m\n"

echo -e "\033[0;36m📝 Додаткові команди для тестування:\033[0m"
echo -e "   \033[0;33m# Синхронізація leads:\033[0m"
echo -e "   curl -X POST \"${BASE_URL}/amo-crm/sync/leads?limit=10\" \\"
echo -e "     -H \"Authorization: Bearer \$TOKEN\""
echo -e ""
echo -e "   \033[0;33m# Обмін API ключа:\033[0m"
echo -e "   curl -X POST \"${BASE_URL}/amo-crm/exchange-api-key\" \\"
echo -e "     -H \"Authorization: Bearer \$TOKEN\" \\"
echo -e "     -H \"Content-Type: application/json\" \\"
echo -e "     -d '{\"login\":\"your-email@example.com\",\"api_key\":\"your-api-key\"}'"
echo ""

