#!/bin/bash

# Скрипт для діагностики всіх проблем

set -e

PROJECT_DIR="/opt/admin-panel"
DOMAIN="admin.foryou-realestate.com"

echo "🔍 Повна діагностика Admin Panel..."
echo ""

# 1. Статус контейнерів
echo "1️⃣ Статус Docker контейнерів:"
docker-compose -f ${PROJECT_DIR}/docker-compose.prod.yml ps
echo ""

# 2. Логи backend
echo "2️⃣ Останні логи backend (10 рядків):"
docker-compose -f ${PROJECT_DIR}/docker-compose.prod.yml logs --tail=10 admin-panel-backend || echo "❌ Не вдалося отримати логи"
echo ""

# 3. Логи frontend
echo "3️⃣ Останні логи frontend (10 рядків):"
docker-compose -f ${PROJECT_DIR}/docker-compose.prod.yml logs --tail=10 admin-panel-frontend || echo "❌ Не вдалося отримати логи"
echo ""

# 4. Перевірка .env файлів
echo "4️⃣ Перевірка .env файлів:"
echo "Backend .env (ADMIN_EMAIL, ADMIN_PASSWORD):"
if [ -f "${PROJECT_DIR}/admin-panel-backend/.env" ]; then
    grep "ADMIN_EMAIL\|ADMIN_PASSWORD" ${PROJECT_DIR}/admin-panel-backend/.env || echo "❌ Не знайдено ADMIN_EMAIL/ADMIN_PASSWORD"
else
    echo "❌ Файл не знайдено"
fi
echo ""

echo "Frontend .env.production (NEXT_PUBLIC_API_URL):"
if [ -f "${PROJECT_DIR}/admin-panel/.env.production" ]; then
    cat ${PROJECT_DIR}/admin-panel/.env.production
else
    echo "❌ Файл не знайдено"
fi
echo ""

# 5. Перевірка доступності сервісів
echo "5️⃣ Перевірка доступності сервісів:"
echo "Backend (localhost:4000):"
curl -s -o /dev/null -w "HTTP Status: %{http_code}\n" http://localhost:4000/api/health || echo "❌ Backend недоступний"
echo ""

echo "Frontend (localhost:3001):"
curl -s -o /dev/null -w "HTTP Status: %{http_code}\n" http://localhost:3001 || echo "❌ Frontend недоступний"
echo ""

# 6. Перевірка Nginx
echo "6️⃣ Статус Nginx:"
systemctl status nginx --no-pager -l | head -10 || echo "❌ Nginx не запущений"
echo ""

# 7. Перевірка SSL
echo "7️⃣ Перевірка SSL сертифікату:"
if [ -f "/etc/letsencrypt/live/${DOMAIN}/fullchain.pem" ]; then
    echo "✅ SSL сертифікат знайдено"
    openssl x509 -in /etc/letsencrypt/live/${DOMAIN}/fullchain.pem -noout -dates 2>/dev/null || echo "⚠️  Не вдалося прочитати сертифікат"
else
    echo "❌ SSL сертифікат не знайдено"
fi
echo ""

# 8. Перевірка DNS
echo "8️⃣ Перевірка DNS:"
nslookup ${DOMAIN} | grep -A 2 "Name:" || echo "⚠️  Не вдалося перевірити DNS"
echo ""

# 9. Перевірка через curl домен
echo "9️⃣ Перевірка доступності через домен:"
curl -s -I https://${DOMAIN} | head -5 || echo "❌ Домен недоступний"
echo ""

echo "✅ Діагностика завершена!"

