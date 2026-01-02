#!/bin/bash

# Configuration
BASE_URL="http://localhost:4000/api"
BROKER_AMO_ID=10688694

echo "🔐 Logging in as ADMIN..."
ADMIN_TOKEN=$(curl -s -X POST "${BASE_URL}/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@foryou.ae","password":"admin123"}' \
  | python3 -c "import sys, json; print(json.load(sys.stdin).get('data', {}).get('token', ''))")

if [ -z "$ADMIN_TOKEN" ]; then
  echo "❌ Admin login failed."
  exit 1
fi
echo "✅ Admin login successful."

echo "🚀 Providing MAXIMUM data for broker ${BROKER_AMO_ID}..."
curl -s -X POST "${BASE_URL}/amo-crm/test/enrich-leads" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"amoUserId\": $BROKER_AMO_ID, \"limit\": 30}" \
  | python3 -m json.tool

echo "✅ Enrichment Triggered!"
