#!/bin/bash
# Виправлення перезапуску backend з AMO CRM
# Виконайте на сервері

cd /root/admin-panel

echo "🛑 Зупинка та видалення старого контейнера..."
docker stop for-you-admin-panel-backend-prod 2>/dev/null || true
docker rm -f for-you-admin-panel-backend-prod 2>/dev/null || true

echo ""
echo "🔄 Оновлення коду з Git..."
git pull origin main

echo ""
echo "🏗️  Перебудова backend контейнера..."
docker-compose -f docker-compose.prod.yml build admin-panel-backend

echo ""
echo "🚀 Запуск нового backend контейнера..."
docker-compose -f docker-compose.prod.yml up -d --force-recreate --no-deps admin-panel-backend

echo ""
echo "⏳ Чекаємо 15 секунд для запуску..."
sleep 15

echo ""
echo "📋 Перевірка статусу:"
docker ps | grep backend

echo ""
echo "📋 Останні логи:"
docker logs --tail 20 for-you-admin-panel-backend-prod 2>&1 | tail -20

echo ""
echo "✅ Backend оновлено!"

