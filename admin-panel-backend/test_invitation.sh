#!/bin/bash

# Base URL
BASE_URL="https://admin.foryou-realestate.com/api"
# BASE_URL="http://localhost:4000/api" # Use local if tunneling not working but I am on same machine? No, let's try local port.
BASE_URL="http://localhost:4000/api"

# Admin Login
echo "Authenticating..."
LOGIN_RESPONSE=$(curl -v -s -X POST "${BASE_URL}/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@foryou.ae","password":"admin123"}' 2>&1)

echo "Response Raw:"
echo "$LOGIN_RESPONSE"

TOKEN=$(echo "${LOGIN_RESPONSE}" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
  echo "Failed to authenticate."
  exit 1
fi

echo "Token obtained."

# 1. Get Unlinked Users
echo -e "\nFetching unlinked users..."
UNLINKED_RESPONSE=$(curl -s -X GET "${BASE_URL}/amo-crm/users/unlinked" \
  -H "Authorization: Bearer $TOKEN")

echo "${UNLINKED_RESPONSE}" | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    users = data.get('data', [])
    print(f'Found {len(users)} unlinked users:')
    for u in users[:3]:
        print(f'- {u.get(\"name\")} (ID: {u.get(\"id\")}, Email: {u.get(\"email\")})')
except:
    print('Error parsing response')
"

# 2. Pick the first user ID to invite
AMO_USER_ID=$(echo "${UNLINKED_RESPONSE}" | python3 -c "import sys, json; print(json.load(sys.stdin).get('data', [])[0].get('id'))")
AMO_USER_EMAIL=$(echo "${UNLINKED_RESPONSE}" | python3 -c "import sys, json; print(json.load(sys.stdin).get('data', [])[0].get('email'))")

if [ "$AMO_USER_ID" == "None" ] || [ -z "$AMO_USER_ID" ]; then
    echo "No unlinked users found to test invitation."
    exit 0
fi

echo -e "\nInviting broker with ID: $AMO_USER_ID (Email: $AMO_USER_EMAIL)..."

# 3. Invite Broker
INVITE_RESPONSE=$(curl -s -X POST "${BASE_URL}/users/invite-broker" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"amoUserId\": \"${AMO_USER_ID}\",
    \"firstName\": \"Test\",
    \"lastName\": \"Broker\"
  }")

echo "Response:"
echo "${INVITE_RESPONSE}" | python3 -m json.tool
