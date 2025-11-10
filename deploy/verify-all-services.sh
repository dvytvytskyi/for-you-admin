#!/bin/bash

# Перевірка всіх сервісів
set -e

echo "🔍 Перевірка всіх сервісів адмінки..."
echo ""

echo "1️⃣ Статус контейнерів:"
echo "================================"
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | grep -E "frontend|backend|postgres|NAME"
echo ""

echo "2️⃣ Перевірка Backend (порт 4000):"
echo "================================"
curl -s http://localhost:4000/health | head -3 || echo "❌ Backend не відповідає"
echo ""

echo "3️⃣ Перевірка Frontend (порт 3001):"
echo "================================"
curl -s -o /dev/null -w "HTTP Status: %{http_code}\n" http://localhost:3001 || echo "❌ Frontend не відповідає"
echo ""

echo "4️⃣ Перевірка API з пагінацією:"
echo "================================"
echo "Тест запиту з параметрами page=1&limit=100:"
curl -s "http://localhost:4000/api/properties?page=1&limit=100" -H "Authorization: Bearer test" 2>&1 | head -c 200
echo "..."
echo ""

echo "5️⃣ Останні логи Backend:"
echo "================================"
docker logs --tail 5 for-you-admin-panel-backend-prod 2>&1 | tail -3
echo ""

echo "6️⃣ Останні логи Frontend:"
echo "================================"
docker logs --tail 5 for-you-admin-panel-frontend-prod 2>&1 | tail -3
echo ""

echo "✅ Перевірка завершена!"

