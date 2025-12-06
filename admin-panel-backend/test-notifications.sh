#!/bin/bash

# Скрипт для тестування системи нотифікацій

# Кольори для виводу
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

BASE_URL="https://admin.foryou-realestate.com/api"
ADMIN_EMAIL="admin@foryou-realestate.com"
ADMIN_PASSWORD="REDACTED_PASSWORD"

echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  🧪 Тестування системи нотифікацій${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
echo ""

# Крок 1: Отримання admin token
echo -e "${YELLOW}🔐 Крок 1: Отримую admin token...${NC}"
LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASSWORD\"}")

TOKEN=$(echo "$LOGIN_RESPONSE" | python3 -c "import sys, json; d=json.load(sys.stdin); print(d.get('data', {}).get('token', ''))" 2>/dev/null)

if [ -z "$TOKEN" ] || [ ${#TOKEN} -lt 20 ]; then
  echo -e "${RED}❌ Помилка отримання token${NC}"
  echo "$LOGIN_RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$LOGIN_RESPONSE"
  exit 1
fi

echo -e "${GREEN}✅ Token отримано успішно!${NC}"
echo -e "   Token: ${TOKEN:0:50}..."
echo ""

# Крок 2: Перевірка токена через /auth/me
echo -e "${YELLOW}🔍 Крок 2: Перевіряю токен через /auth/me...${NC}"
ME_RESPONSE=$(curl -s -X GET "$BASE_URL/auth/me" \
  -H "Authorization: Bearer $TOKEN")

ME_SUCCESS=$(echo "$ME_RESPONSE" | python3 -c "import sys, json; d=json.load(sys.stdin); print(d.get('success', False))" 2>/dev/null)

if [ "$ME_SUCCESS" = "True" ]; then
  USER_ROLE=$(echo "$ME_RESPONSE" | python3 -c "import sys, json; d=json.load(sys.stdin); print(d.get('data', {}).get('role', ''))" 2>/dev/null)
  USER_EMAIL=$(echo "$ME_RESPONSE" | python3 -c "import sys, json; d=json.load(sys.stdin); print(d.get('data', {}).get('email', ''))" 2>/dev/null)
  echo -e "${GREEN}✅ Токен валідний!${NC}"
  echo -e "   Email: $USER_EMAIL"
  echo -e "   Role: $USER_ROLE"
  if [ "$USER_ROLE" != "ADMIN" ]; then
    echo -e "${RED}⚠️  Увага: Користувач не має ролі ADMIN!${NC}"
  fi
else
  echo -e "${RED}❌ Токен невалідний${NC}"
  echo "$ME_RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$ME_RESPONSE"
  exit 1
fi
echo ""

# Крок 3: Тестування endpoint
echo -e "${YELLOW}🧪 Крок 3: Тестую POST /api/notifications/send...${NC}"

# Використовуємо тестовий user ID (можна передати як аргумент)
USER_ID="${1:-77500209-24c8-4985-8574-ae94c6583566}"

echo -e "   User ID: $USER_ID"
echo ""

NOTIFICATION_RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X POST "$BASE_URL/notifications/send" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{
    \"userIds\": [\"$USER_ID\"],
    \"type\": \"system\",
    \"title\": \"Test Notification\",
    \"body\": \"This is a test notification from admin panel - $(date '+%Y-%m-%d %H:%M:%S')\",
    \"data\": {
      \"test\": true,
      \"timestamp\": $(date +%s),
      \"source\": \"admin-panel-test-script\"
    }
  }")

HTTP_STATUS=$(echo "$NOTIFICATION_RESPONSE" | grep "HTTP_STATUS" | cut -d: -f2)
BODY=$(echo "$NOTIFICATION_RESPONSE" | grep -v "HTTP_STATUS")

echo -e "${BLUE}HTTP Status: $HTTP_STATUS${NC}"
echo ""
echo -e "${BLUE}Response:${NC}"
echo "$BODY" | python3 -m json.tool 2>/dev/null || echo "$BODY"
echo ""

SUCCESS=$(echo "$BODY" | python3 -c "import sys, json; d=json.load(sys.stdin); print(d.get('success', False))" 2>/dev/null)
MESSAGE=$(echo "$BODY" | python3 -c "import sys, json; d=json.load(sys.stdin); print(d.get('message', ''))" 2>/dev/null)

if [ "$SUCCESS" = "True" ]; then
  echo -e "${GREEN}✅ Сповіщення успішно відправлено!${NC}"
  echo -e "   Message: $MESSAGE"
  echo ""
  echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
  echo -e "${GREEN}  ✅ Тест пройдено успішно!${NC}"
  echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
else
  echo -e "${RED}❌ Помилка відправки сповіщення${NC}"
  echo -e "   Message: $MESSAGE"
  echo ""
  echo -e "${YELLOW}💡 Можливі причини:${NC}"
  echo -e "   - Користувач не має налаштувань сповіщень"
  echo -e "   - У користувача немає зареєстрованих пристроїв"
  echo -e "   - Push сповіщення вимкнені для цього типу"
  echo ""
  echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
  echo -e "${RED}  ❌ Тест не пройдено${NC}"
  echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
  exit 1
fi

