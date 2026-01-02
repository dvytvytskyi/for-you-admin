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

echo "🚀 Creating 10 more test leads for AmoUser ID: $BROKER_AMO_ID..."
curl -s -X POST "${BASE_URL}/amo-crm/test/create-leads" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"amoUserId\": $BROKER_AMO_ID, \"count\": 10}" \
  | python3 -m json.tool

echo "✅ Done!"
