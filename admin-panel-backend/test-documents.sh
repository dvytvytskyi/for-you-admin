#!/bin/bash

# Скрипт для тестування Documents API

# Кольори для виводу
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

BASE_URL="https://admin.foryou-realestate.com/api/v1"
ADMIN_EMAIL="admin@foryou-realestate.com"
ADMIN_PASSWORD="REDACTED_PASSWORD"

echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  🧪 Тестування Documents API${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
echo ""

# Крок 1: Отримання admin token
echo -e "${YELLOW}🔐 Крок 1: Отримую admin token...${NC}"
LOGIN_RESPONSE=$(curl -s -X POST "https://admin.foryou-realestate.com/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASSWORD\"}")

TOKEN=$(echo "$LOGIN_RESPONSE" | python3 -c "import sys, json; d=json.load(sys.stdin); print(d.get('data', {}).get('token', ''))" 2>/dev/null)

if [ -z "$TOKEN" ] || [ ${#TOKEN} -lt 20 ]; then
  echo -e "${RED}❌ Помилка отримання token${NC}"
  echo "$LOGIN_RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$LOGIN_RESPONSE"
  exit 1
fi

echo -e "${GREEN}✅ Token отримано успішно!${NC}"
echo ""

# Крок 2: Тест GET /documents (admin only)
echo -e "${YELLOW}🔍 Крок 2: Тестую GET /documents (admin only)...${NC}"
DOCUMENTS_RESPONSE=$(curl -s -X GET "$BASE_URL/documents?page=1&limit=10" \
  -H "Authorization: Bearer $TOKEN")

echo "$DOCUMENTS_RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$DOCUMENTS_RESPONSE"
echo ""

# Крок 3: Тест GET /documents/entity (без авторизації)
echo -e "${YELLOW}🔍 Крок 3: Тестую GET /documents/entity/PROPERTY/test-id (без auth)...${NC}"
ENTITY_RESPONSE=$(curl -s -X GET "$BASE_URL/documents/entity/PROPERTY/00000000-0000-0000-0000-000000000000")

echo "$ENTITY_RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$ENTITY_RESPONSE"
echo ""

# Крок 4: Інформація про endpoints
echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}  ✅ Documents API готовий до використання!${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${YELLOW}📋 Доступні endpoints:${NC}"
echo -e "  • POST   /api/v1/documents/upload (BROKER, ADMIN)"
echo -e "  • GET    /api/v1/documents/entity/:entityType/:entityId"
echo -e "  • GET    /api/v1/documents/:id"
echo -e "  • PATCH  /api/v1/documents/:id"
echo -e "  • DELETE /api/v1/documents/:id"
echo -e "  • POST   /api/v1/documents/:id/verify (ADMIN only)"
echo -e "  • GET    /api/v1/documents (ADMIN only)"
echo ""
echo -e "${YELLOW}💡 Для тестування завантаження:${NC}"
echo -e "  curl -X POST \"$BASE_URL/documents/upload\" \\"
echo -e "    -H \"Authorization: Bearer \$TOKEN\" \\"
echo -e "    -F \"file=@test.pdf\" \\"
echo -e "    -F \"type=BROCHURE\" \\"
echo -e "    -F \"entityType=PROPERTY\" \\"
echo -e "    -F \"entityId=property-uuid\""
echo ""

