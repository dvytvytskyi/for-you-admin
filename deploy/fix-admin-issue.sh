#!/bin/bash

# Швидке виправлення проблем з адмінкою
# Використовуйте на сервері: ssh root@135.181.201.185

set -e

PROJECT_DIR="/opt/admin-panel"
DOMAIN="admin.foryou-realestate.com"

echo "🔧 Виправлення проблем з адмінкою..."
echo ""

cd ${PROJECT_DIR} || {
    echo "❌ Проект не знайдено в ${PROJECT_DIR}"
    exit 1
}

# 1. Оновлення коду
echo "1️⃣ Оновлення коду з Git..."
git pull origin main || echo "⚠️  Не вдалося оновити код"
echo ""

# 2. Перезапуск контейнерів
echo "2️⃣ Перезапуск контейнерів..."
docker-compose -f docker-compose.prod.yml down
docker-compose -f docker-compose.prod.yml up -d --build
echo ""

# 3. Очікування запуску
echo "3️⃣ Очікування запуску сервісів (30 секунд)..."
sleep 30
echo ""

# 4. Перевірка статусу контейнерів
echo "4️⃣ Статус контейнерів:"
docker-compose -f docker-compose.prod.yml ps
echo ""

# 5. Перевірка доступності backend
echo "5️⃣ Перевірка backend (порт 4000):"
for i in {1..5}; do
    if curl -s http://localhost:4000/health > /dev/null 2>&1; then
        echo "✅ Backend працює!"
        break
    else
        echo "⏳ Очікування... ($i/5)"
        sleep 5
    fi
done
echo ""

# 6. Перевірка доступності frontend
echo "6️⃣ Перевірка frontend (порт 3001):"
for i in {1..5}; do
    if curl -s http://localhost:3001 > /dev/null 2>&1; then
        echo "✅ Frontend працює!"
        break
    else
        echo "⏳ Очікування... ($i/5)"
        sleep 5
    fi
done
echo ""

# 7. Налаштування Nginx
echo "7️⃣ Налаштування Nginx..."
if [ ! -f "/etc/nginx/sites-available/${DOMAIN}" ]; then
    echo "   Створення конфігурації Nginx..."
    cp deploy/nginx.conf /etc/nginx/sites-available/${DOMAIN}
fi

ln -sf /etc/nginx/sites-available/${DOMAIN} /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Тестування конфігурації
if nginx -t; then
    echo "   ✅ Конфігурація Nginx валідна"
    systemctl restart nginx
    echo "   ✅ Nginx перезапущено"
else
    echo "   ❌ Помилка в конфігурації Nginx"
    exit 1
fi
echo ""

# 8. Перевірка SSL (якщо потрібно)
echo "8️⃣ Перевірка SSL сертифікату..."
if [ ! -f "/etc/letsencrypt/live/${DOMAIN}/fullchain.pem" ]; then
    echo "   Отримання SSL сертифікату..."
    certbot --nginx -d ${DOMAIN} --non-interactive --agree-tos --email admin@foryou-realestate.com --redirect 2>/dev/null || {
        echo "   ⚠️  SSL не встановлено. HTTP працює, але HTTPS потребує налаштування"
    }
    systemctl restart nginx
else
    echo "   ✅ SSL сертифікат встановлено"
fi
echo ""

# 9. Фінальна перевірка
echo "9️⃣ Фінальна перевірка:"
echo "   Backend:"
curl -s -o /dev/null -w "   HTTP Status: %{http_code}\n" http://localhost:4000/health || echo "   ❌ Backend не відповідає"
echo "   Frontend:"
curl -s -o /dev/null -w "   HTTP Status: %{http_code}\n" http://localhost:3001 || echo "   ❌ Frontend не відповідає"
echo "   Nginx:"
systemctl is-active nginx > /dev/null && echo "   ✅ Nginx працює" || echo "   ❌ Nginx не працює"
echo ""

# 10. Показ логів якщо є помилки
echo "🔟 Останні помилки в логах (якщо є):"
echo "================================"
docker-compose -f docker-compose.prod.yml logs --tail 20 admin-panel-backend 2>&1 | grep -i error | tail -5 || echo "   Немає помилок в backend"
docker-compose -f docker-compose.prod.yml logs --tail 20 admin-panel-frontend 2>&1 | grep -i error | tail -5 || echo "   Немає помилок в frontend"
echo ""

echo "✅ Виправлення завершено!"
echo ""
echo "🌐 Сайт має бути доступний: https://${DOMAIN}"
echo "📋 Для перегляду логів: docker-compose -f docker-compose.prod.yml logs -f"

