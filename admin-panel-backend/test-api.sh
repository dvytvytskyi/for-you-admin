#!/bin/bash

# API Keys
API_KEY="ak_aa4d19418b385c370939b45365d0c687ddbdef7cbe9a72548748ef67f5e469e1"
API_SECRET="as_623caef2632983630ce11293e544504c834a9ab1015fa2c75a7c2583d6f28d7c"

# Base URL (change if needed)
BASE_URL="${1:-http://localhost:4000}"

echo "🧪 Testing API Endpoints"
echo "Base URL: $BASE_URL"
echo ""

# Test 1: /api/public/data
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Test 1: GET /api/public/data"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
curl -s -w "\n\nHTTP Status: %{http_code}\n" \
  -H "x-api-key: $API_KEY" \
  -H "x-api-secret: $API_SECRET" \
  "$BASE_URL/api/public/data" | head -100
echo ""

# Test 2: /api/properties?propertyType=secondary
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Test 2: GET /api/properties?propertyType=secondary"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
curl -s -w "\n\nHTTP Status: %{http_code}\n" \
  -H "x-api-key: $API_KEY" \
  -H "x-api-secret: $API_SECRET" \
  "$BASE_URL/api/properties?propertyType=secondary&limit=5" | head -100
echo ""

# Test 3: /api/properties?propertyType=secondary with filters
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Test 3: GET /api/properties?propertyType=secondary&bedrooms=2&priceFrom=100000"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
curl -s -w "\n\nHTTP Status: %{http_code}\n" \
  -H "x-api-key: $API_KEY" \
  -H "x-api-secret: $API_SECRET" \
  "$BASE_URL/api/properties?propertyType=secondary&bedrooms=2&priceFrom=100000&limit=3" | head -100
echo ""

# Test 4: Without API keys (should fail)
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Test 4: GET /api/properties (without API keys - should fail)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
curl -s -w "\n\nHTTP Status: %{http_code}\n" \
  "$BASE_URL/api/properties?propertyType=secondary" | head -50
echo ""

echo "✅ Tests completed"
echo ""
echo "Usage: ./test-api.sh [BASE_URL]"
echo "Example: ./test-api.sh https://admin.foryou-realestate.com"

