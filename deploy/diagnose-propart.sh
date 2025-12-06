#!/bin/bash

set -e

DOMAIN="system.pro-part.online"
PROJECT_DIR="${PROJECT_DIR:-/opt/admin-panel}"

echo "🔍 Діагностика проблеми з логіном для ${DOMAIN}"
echo "=========================================="
echo ""

# Перевірка статусу Docker контейнерів
echo "1️⃣ Перевірка статусу Docker контейнерів:"
echo "----------------------------------------"
docker ps --filter "name=admin-panel" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" || echo "⚠️  Docker не запущений або контейнери не знайдені"
echo ""

# Перевірка чи працює бекенд
echo "2️⃣ Перевірка доступності бекенду:"
echo "----------------------------------------"
if curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:4000/api/health 2>/dev/null | grep -q "200\|404"; then
    echo "✅ Бекенд відповідає на порту 4000"
    echo "   Тестовий запит:"
    curl -s http://127.0.0.1:4000/api/health || echo "   (health endpoint може не існувати)"
else
    echo "❌ Бекенд НЕ відповідає на порту 4000"
    echo "   Перевірте логи: docker logs for-you-admin-panel-backend-prod"
fi
echo ""

# Перевірка чи працює фронтенд
echo "3️⃣ Перевірка доступності фронтенду:"
echo "----------------------------------------"
if curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:3001 2>/dev/null | grep -q "200\|301\|302"; then
    echo "✅ Фронтенд відповідає на порту 3001"
else
    echo "❌ Фронтенд НЕ відповідає на порту 3001"
    echo "   Перевірте логи: docker logs for-you-admin-panel-frontend-prod"
fi
echo ""

# Перевірка конфігурації nginx
echo "4️⃣ Перевірка конфігурації Nginx:"
echo "----------------------------------------"
if [ -f "/etc/nginx/sites-available/${DOMAIN}" ]; then
    echo "✅ Конфігурація знайдена: /etc/nginx/sites-available/${DOMAIN}"
    if [ -L "/etc/nginx/sites-enabled/${DOMAIN}" ]; then
        echo "✅ Симлінк активований"
    else
        echo "⚠️  Симлінк НЕ активований"
        echo "   Виконайте: ln -sf /etc/nginx/sites-available/${DOMAIN} /etc/nginx/sites-enabled/"
    fi
else
    echo "❌ Конфігурація НЕ знайдена"
    echo "   Створіть конфігурацію: cp ${PROJECT_DIR}/deploy/nginx-propart.conf /etc/nginx/sites-available/${DOMAIN}"
fi

# Перевірка синтаксису nginx
if command -v nginx &> /dev/null; then
    echo ""
    echo "Перевірка синтаксису nginx:"
    nginx -t 2>&1 | head -5 || echo "⚠️  Помилка в конфігурації nginx"
fi
echo ""

# Перевірка статусу nginx
echo "5️⃣ Статус Nginx:"
echo "----------------------------------------"
if systemctl is-active --quiet nginx 2>/dev/null; then
    echo "✅ Nginx працює"
else
    echo "❌ Nginx НЕ працює"
    echo "   Запустіть: systemctl start nginx"
fi
echo ""

# Перевірка логів nginx
echo "6️⃣ Останні помилки з логів Nginx:"
echo "----------------------------------------"
if [ -f "/var/log/nginx/propart-admin-error.log" ]; then
    echo "Останні 10 помилок:"
    tail -10 /var/log/nginx/propart-admin-error.log 2>/dev/null || echo "   (лог порожній або недоступний)"
else
    echo "⚠️  Файл логів не знайдено: /var/log/nginx/propart-admin-error.log"
fi
echo ""

# Перевірка логів бекенду
echo "7️⃣ Останні логи бекенду:"
echo "----------------------------------------"
if docker ps --format "{{.Names}}" | grep -q "backend"; then
    echo "Останні 10 рядків логів:"
    docker logs --tail 10 for-you-admin-panel-backend-prod 2>&1 | tail -10 || echo "   (не вдалося отримати логи)"
else
    echo "⚠️  Контейнер бекенду не знайдено"
fi
echo ""

# Тестовий запит до API
echo "8️⃣ Тестовий запит до API:"
echo "----------------------------------------"
echo "Тест: POST /api/auth/login (без credentials)"
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" -X POST http://127.0.0.1:4000/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"test@test.com","password":"test"}' 2>&1) || RESPONSE="ERROR"

if [ "$RESPONSE" = "401" ] || [ "$RESPONSE" = "400" ]; then
    echo "✅ API працює (отримано $RESPONSE - очікувана помилка авторизації)"
elif [ "$RESPONSE" = "502" ] || [ "$RESPONSE" = "503" ]; then
    echo "❌ Помилка проксі (502/503) - бекенд не доступний"
elif [ "$RESPONSE" = "ERROR" ]; then
    echo "❌ Не вдалося з'єднатися з бекендом"
else
    echo "⚠️  Неочікувана відповідь: $RESPONSE"
fi
echo ""

# Рекомендації
echo "📋 Рекомендації:"
echo "----------------------------------------"
echo "1. Якщо бекенд не працює:"
echo "   cd ${PROJECT_DIR} && docker-compose -f docker-compose.prod.yml restart admin-panel-backend"
echo ""
echo "2. Якщо nginx не налаштований:"
echo "   ${PROJECT_DIR}/deploy/fix-propart-nginx.sh"
echo ""
echo "3. Перевірте логи детальніше:"
echo "   tail -f /var/log/nginx/propart-admin-error.log"
echo "   docker logs -f for-you-admin-panel-backend-prod"
echo ""

