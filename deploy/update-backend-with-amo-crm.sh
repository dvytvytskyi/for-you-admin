#!/bin/bash
# Оновлення backend з новими AMO CRM routes
# Виконайте на сервері

cd /root/admin-panel

echo "🔄 Оновлення коду з Git..."
git pull origin main

echo ""
echo "🏗️  Перебудова backend контейнера..."
docker-compose -f docker-compose.prod.yml build admin-panel-backend

echo ""
echo "🔄 Перезапуск backend..."
docker-compose -f docker-compose.prod.yml up -d --force-recreate --no-deps admin-panel-backend

echo ""
echo "⏳ Чекаємо 15 секунд для запуску..."
sleep 15

echo ""
echo "📋 Перевірка логів backend:"
docker logs --tail 20 for-you-admin-panel-backend-prod 2>&1 | tail -20

echo ""
echo "✅ Backend оновлено!"
echo ""
echo "🔍 Перевірка endpoint:"
curl -s http://localhost:4000/api/amo-crm/status 2>&1 | head -5

