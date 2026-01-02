#!/bin/bash

# Configuration
BASE_URL="http://localhost:4000/api"

echo "🔐 Logging in to Admin Panel API..."
TOKEN=$(curl -s -X POST "${BASE_URL}/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@foryou-realestate.com","password":"REDACTED_PASSWORD"}' \
  | python3 -c "import sys, json; print(json.load(sys.stdin).get('data', {}).get('token', ''))")

if [ -z "$TOKEN" ]; then
  echo "⚠️  Failed primary login, trying alternate..."
  TOKEN=$(curl -s -X POST "${BASE_URL}/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"email":"admin@foryou.ae","password":"admin123"}' \
    | python3 -c "import sys, json; print(json.load(sys.stdin).get('data', {}).get('token', ''))")
fi

if [ -z "$TOKEN" ]; then
  echo "❌ Login failed for all known accounts."
  exit 1
fi

echo "✅ Login successful. Triggering AmoCRM User Sync..."
SYNC_RESPONSE=$(curl -s -X POST "${BASE_URL}/amo-crm/sync/users" \
  -H "Authorization: Bearer $TOKEN")

echo "📊 Sync Response: $SYNC_RESPONSE"

echo -e "\n🔍 Verifying Database Content..."
DB_CONT=$(docker ps -q -f name=postgres)
if [ -n "$DB_CONT" ]; then
  docker exec -i $DB_CONT psql -U admin -d admin_panel -c 'SELECT count(*) FROM amo_crm_users'
else
  echo "❌ Postgres container not found."
fi
