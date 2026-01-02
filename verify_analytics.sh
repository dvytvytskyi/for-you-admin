#!/bin/bash

# Configuration
BASE_URL="http://localhost:4000/api"
BROKER_EMAIL="dvytvytskiy@gmail.com"
BROKER_PASS="TestPassword123!"

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

echo "🔍 Getting Broker ID..."
BROKER_ID=$(curl -s -X GET "${BASE_URL}/v1/users?limit=1000" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  | python3 -c "import sys, json; 
data = json.load(sys.stdin);
items = data.get('data', {}).get('data', []) if isinstance(data.get('data'), dict) else data.get('data', []);
user = next((u for u in items if u['email'] == '$BROKER_EMAIL'), None);
print(user['id'] if user else '')")

if [ -z "$BROKER_ID" ]; then
  echo "❌ Broker not found."
  exit 1
fi
echo "✅ Broker ID: $BROKER_ID"

echo "🔄 Resetting Broker Password..."
curl -s -X PATCH "${BASE_URL}/users/${BROKER_ID}/password" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"newPassword\":\"$BROKER_PASS\"}" \
  | grep "success"

echo "🔐 Logging in as BROKER..."
BROKER_TOKEN=$(curl -s -X POST "${BASE_URL}/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$BROKER_EMAIL\",\"password\":\"$BROKER_PASS\"}" \
  | python3 -c "import sys, json; print(json.load(sys.stdin).get('data', {}).get('token', ''))")

if [ -z "$BROKER_TOKEN" ]; then
  echo "❌ Broker login failed."
  exit 1
fi
echo "✅ Broker login successful."

echo "📊 Verifying Analytics Endpoint..."
curl -s -X GET "${BASE_URL}/v1/analytics/my-stats" \
  -H "Authorization: Bearer $BROKER_TOKEN" | python3 -m json.tool
