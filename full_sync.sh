#!/bin/bash

# Configuration
BASE_URL="http://localhost:4000/api"

echo "🔐 Logging in to Admin Panel API..."
TOKEN=$(curl -s -X POST "${BASE_URL}/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@foryou-realestate.com","password":"Admin123!"}' \
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

echo "✅ Login successful."

echo "🔄 Syncing AmoCRM Users..."
curl -s -X POST "${BASE_URL}/amo-crm/sync/users" -H "Authorization: Bearer $TOKEN" | python3 -m json.tool

echo "🔄 Syncing AmoCRM Pipelines..."
curl -s -X POST "${BASE_URL}/amo-crm/sync/pipelines" -H "Authorization: Bearer $TOKEN" | python3 -m json.tool

echo "🔄 Syncing AmoCRM Contacts (limit 250)..."
curl -s -X POST "${BASE_URL}/amo-crm/sync/contacts" -H "Authorization: Bearer $TOKEN" -d '{"limit": 250}' -H "Content-Type: application/json" | python3 -m json.tool

echo "🔄 Syncing AmoCRM Leads (limit 250)..."
curl -s -X POST "${BASE_URL}/amo-crm/sync/leads" -H "Authorization: Bearer $TOKEN" -d '{"limit": 250}' -H "Content-Type: application/json" | python3 -m json.tool

echo -e "\n🔍 Verifying Database Content..."
DB_CONT=$(docker ps -q -f name=postgres)
if [ -n "$DB_CONT" ]; then
  echo "Users count:"
  docker exec -i $DB_CONT psql -U admin -d admin_panel -c 'SELECT count(*) FROM amo_crm_users'
  echo "Pipelines count:"
  docker exec -i $DB_CONT psql -U admin -d admin_panel -c 'SELECT count(*) FROM amo_crm_pipelines'
  echo "Leads count:"
  docker exec -i $DB_CONT psql -U admin -d admin_panel -c 'SELECT count(*) FROM amo_crm_leads'
  echo "Contacts count:"
  docker exec -i $DB_CONT psql -U admin -d admin_panel -c 'SELECT count(*) FROM amo_crm_contacts'
else
  echo "❌ Postgres container not found."
fi
