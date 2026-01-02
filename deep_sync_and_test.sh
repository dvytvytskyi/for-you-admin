#!/bin/bash

# Configuration
BASE_URL="http://localhost:4000/api"
AMO_USER_ID="10688694" # Dima

echo "🔐 Logging in to Admin Panel API..."
TOKEN=$(curl -s -X POST "${BASE_URL}/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@foryou.ae","password":"admin123"}' \
  | python3 -c "import sys, json; print(json.load(sys.stdin).get('data', {}).get('token', ''))")

if [ -z "$TOKEN" ]; then
  echo "❌ Login failed."
  exit 1
fi

echo "✅ Login successful."

echo "🔄 Triggering FULL AmoCRM Leads Sync (Paginated)..."
curl -s -X POST "${BASE_URL}/amo-crm/sync/leads/full" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"limit": 50}' \
  -H "Content-Type: application/json" | python3 -m json.tool

echo "🧪 Generating 10 Test Leads for amoUserId: $AMO_USER_ID..."
curl -s -X POST "${BASE_URL}/amo-crm/test/create-leads" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{\"amoUserId\": \"$AMO_USER_ID\", \"count\": 10}" \
  -H "Content-Type: application/json" | python3 -m json.tool

echo -e "\n🔍 Verifying Final Database Content for Broker..."
DB_CONT=$(docker ps -q -f name=postgres)
if [ -n "$DB_CONT" ]; then
  docker exec -i $DB_CONT psql -U admin -d admin_panel -c "SELECT count(*) FROM amo_crm_leads WHERE responsible_user_id = $AMO_USER_ID"
else
  echo "❌ Postgres container not found."
fi
