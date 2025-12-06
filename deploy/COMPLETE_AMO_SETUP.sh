#!/bin/bash
# Повне налаштування AMO CRM - виконайте на сервері
# cd /root/admin-panel && bash <(curl -s https://raw.githubusercontent.com/dvytvytskyi/for-you-admin/main/deploy/COMPLETE_AMO_SETUP.sh)

set -e

cd /root/admin-panel

echo "═══════════════════════════════════════════════════════"
echo "  🚀 Повне налаштування AMO CRM"
echo "═══════════════════════════════════════════════════════"
echo ""

# Крок 1: Оновлення коду
echo "📥 Крок 1: Оновлення коду з Git..."
git pull origin main
echo "✅ Код оновлено"
echo ""

# Крок 2: Перебудова backend
echo "🏗️  Крок 2: Перебудова backend..."
docker stop for-you-admin-panel-backend-prod 2>/dev/null || true
docker rm -f for-you-admin-panel-backend-prod 2>/dev/null || true
docker-compose -f docker-compose.prod.yml build admin-panel-backend 2>&1 | tail -5
echo "✅ Backend перебудовано"
echo ""

# Крок 3: Запуск backend
echo "🚀 Крок 3: Запуск backend..."
docker-compose -f docker-compose.prod.yml up -d --force-recreate --no-deps admin-panel-backend
echo "⏳ Чекаємо 15 секунд..."
sleep 15
echo "✅ Backend запущено"
echo ""

# Крок 4: Перевірка логів
echo "📋 Крок 4: Перевірка логів backend..."
docker logs --tail 5 for-you-admin-panel-backend-prod 2>&1 | tail -5
echo ""

# Крок 5: Отримання токену
echo "🔑 Крок 5: Отримання admin token..."
LOGIN_RESPONSE=$(curl -s -X POST https://admin.foryou-realestate.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@foryou-realestate.com","password":"REDACTED_PASSWORD"}')

TOKEN=$(echo "$LOGIN_RESPONSE" | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    if 'data' in data and 'token' in data['data']:
        print(data['data']['token'])
    elif 'token' in data:
        print(data['token'])
    else:
        print('')
except:
    print('')
" 2>/dev/null)

if [ -z "$TOKEN" ]; then
  echo "❌ Не вдалося отримати token"
  echo "Відповідь: $LOGIN_RESPONSE"
  exit 1
fi

echo "✅ Token отримано: ${TOKEN:0:50}..."
echo ""

# Крок 6: Встановлення AMO токенів
echo "💾 Крок 6: Встановлення AMO CRM токенів..."
RESPONSE=$(curl -s -X POST https://admin.foryou-realestate.com/api/amo-crm/set-tokens \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "access_token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiIsImp0aSI6ImVmY2VjZjk0M2Q3YjZkYjBjZWE0M2I5MzdlNGY1ZjUxMmU1Y2FmMzRmMTA3YWQyNDYyZDJhZmVmNDg5MzViMzM3ZjEwNGE5OGM1MWFjZmQ1In0.eyJhdWQiOiIyOTEyNzgwZi1hMWU0LTRkNWQtYTA2OS1lZTAxNDIyZDhiZWYiLCJqdGkiOiJlZmNlY2Y5NDNkN2I2ZGIwY2VhNDNiOTM3ZTRmNWY1MTJlNWNhZjM0ZjEwN2FkMjQ2MmQyYWZlZjQ4OTM1YjMzN2YxMDRhOThjNTFhY2ZkNSIsImlhdCI6MTc2NTA0NDE0NSwibmJmIjoxNzY1MDQ0MTQ1LCJleHAiOjE4MDg5NTY4MDAsInN1YiI6IjEwNjg4Njk0IiwiZ3JhbnRfdHlwZSI6IiIsImFjY291bnRfaWQiOjMxOTIwMTk0LCJiYXNlX2RvbWFpbiI6ImFtb2NybS5ydSIsInZlcnNpb24iOjIsInNjb3BlcyI6WyJjcm0iLCJmaWxlcyIsImZpbGVzX2RlbGV0ZSIsIm5vdGlmaWNhdGlvbnMiLCJwdXNoX25vdGlmaWNhdGlvbnMiXSwiaGFzaF91dWlkIjoiYWExMjliYzItNzI3Zi00NjE0LTk3MGYtYjg5NWNlMzI4ZjcyIiwidXNlcl9mbGFncyI6MCwiYXBpX2RvbWFpbiI6ImFwaS1iLmFtb2NybS5ydSJ9.m9sXav75skTj7l3SupdslpdRfYZ-5FnHDpZbtLsYnhc5cHnUEI16YZI-O118kO-xwlZxehmTrU56wD9mX1anJQvThNuaadUwFqjf2IVouoOvmKQTFc9Reh0F7H3HUQCQwgimCFQGfSikOL4lIzV3LM8dioYYTEW4pLKxFR5uzlOVCCs6Msxho2N9OgMUmDhmJRK4c3MQDCq64DgYn756xql4k92rexShp3IYQN2tOzNLC0RQpBkhHaBBK0DWCm011EjUv1PFDECOagLHwY-IP2JR7Eljft_rHs4pbIcGHmLPUTEowpHClMke04ehJGJMw1b2eabWw8XfUWV23g780Q",
    "refresh_token": "def502006c8d886435934524daeb74668101d361463d00d544b949b6c3c1115645c01f53f2f58642a952835521dccf88ed299c0117a1aae8b8e1fe446137f22fd2aaf20051292063b52c2cd0d76e629afc3b3759a11f7c996886a7fa31175493093f8231237bae4ac12ab05522d5d32bedc497f0cf5b0f79b58b9fdaa607cdf587f77b754ea7feeeaa234bdeb050e0bf39e25cc65894d7e365821f5a71b537d4da084bf349ac2c0fa7d3edb4a91bd4cf82e0ed1ad62832629ef41de960417417542434485ebae536c1c96a2c95e05af979cbec3171a031a27e7f4d5882ba354e1c1c9d393ded5bf0b36cf444517decc7ac39bbfd1957f849d5718d8a5ce84189dac70d1b9bb0263ea3b8645b28ac95a6eb7a902846616b42f525ecfc06d07e09e19a8a9fe72270fa66516d765838fcad5c80b3d79138b44e0c77cb06a2a3e0ee89aa287c0a61307f7d6f57b0ea04690e5468ae62a18d5442ce669d1862f7318adb9ea670c334ee7f5fc714792241fdae2b93f502034494932f36bdece1197ff6684b0bd4a819f65de5036c623d604f83edb7486dd5eaa243f370d873fcf396dc935b77950f88a478015694ea17da87ee3d6576565fa04dd6bf0a4ad7a04cf384d16755abed17ffcf59aacc85e143f175a44fd4a541029254fc196a3a0eac139e64d5cbf5d23099930a8835b97d0342331285037f3c99f33aff783db87e2c984fab624915b0f703f3c059dd30bdea912dd0198a6e11e74757",
    "expires_in": 157680000
  }')

if echo "$RESPONSE" | grep -q "success.*true\|success\":true\|успішно"; then
  echo "✅ Токени встановлено успішно!"
else
  echo "⚠️  Відповідь:"
  echo "$RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$RESPONSE"
fi
echo ""

# Крок 7: Перевірка статусу
echo "🔍 Крок 7: Перевірка статусу AMO CRM..."
STATUS_RESPONSE=$(curl -s -X GET https://admin.foryou-realestate.com/api/amo-crm/status \
  -H "Authorization: Bearer $TOKEN")

echo "$STATUS_RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$STATUS_RESPONSE"
echo ""

echo "═══════════════════════════════════════════════════════"
echo "  ✅ Налаштування завершено!"
echo "═══════════════════════════════════════════════════════"

