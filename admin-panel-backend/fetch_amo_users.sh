#!/bin/bash

# Base URL for the API
BASE_URL="https://admin.foryou-realestate.com/api"

# Admin credentials
ADMIN_EMAIL="admin@foryou-realestate.com"
ADMIN_PASSWORD="Admin123!"

# Step 1: Get admin token
echo "Authenticating..."
LOGIN_RESPONSE=$(curl -s -X POST "${BASE_URL}/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"${ADMIN_EMAIL}\",\"password\":\"${ADMIN_PASSWORD}\"}")

TOKEN=$(echo "${LOGIN_RESPONSE}" | python3 -c "import sys, json; print(json.load(sys.stdin).get('data', {}).get('token', ''))")

if [ -z "$TOKEN" ]; then
  echo "Failed to get token."
  exit 1
fi

# Step 2: Check status
echo "Checking AmoCRM connection status..."
STATUS_RESPONSE=$(curl -s -X GET "${BASE_URL}/amo-crm/status" \
  -H "Authorization: Bearer $TOKEN")

CONNECTED=$(echo "${STATUS_RESPONSE}" | python3 -c "import sys, json; print(json.load(sys.stdin).get('data', {}).get('connected', False))")

if [ "$CONNECTED" == "True" ] || [ "$CONNECTED" == "true" ]; then
    echo "AmoCRM is connected. Syncing users..."
    # Step 3: Sync users
    SYNC_RESPONSE=$(curl -s -X POST "${BASE_URL}/amo-crm/sync/users" \
      -H "Authorization: Bearer $TOKEN")
    echo "Sync response: $SYNC_RESPONSE"
else
    echo "AmoCRM is NOT connected on the server."
fi

# Step 4: Fetch users
echo "Fetching users (agents) from AmoCRM (via database)..."
USERS_RESPONSE=$(curl -s -X GET "${BASE_URL}/amo-crm/users" \
  -H "Authorization: Bearer $TOKEN")

echo "${USERS_RESPONSE}" | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    users = data.get('data', [])
    print(f'Found {len(users)} agents:')
    for user in users:
        print(f'- {user.get(\"name\")} (ID: {user.get(\"amoUserId\")})')
except Exception as e:
    print('Error parsing response:', e)
    print(sys.stdin.read())
"
