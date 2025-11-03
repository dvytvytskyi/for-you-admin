#!/bin/bash

# Скрипт для налаштування основного сайту foryou-realestate.com
# ВИКОРИСТОВУЙТЕ ЦЕЙ СКРИПТ НА СЕРВЕРІ!

set -e

MAIN_DOMAIN="foryou-realestate.com"
ADMIN_DOMAIN="admin.foryou-realestate.com"
PROJECT_DIR="/opt/admin-panel"
NGINX_SITES_DIR="/etc/nginx/sites-available"
NGINX_ENABLED_DIR="/etc/nginx/sites-enabled"

if [ ! -d "/opt/admin-panel" ]; then
    echo "❌ Помилка: Цей скрипт має виконуватися на сервері!"
    exit 1
fi

echo "🌐 Налаштування основного сайту ${MAIN_DOMAIN}..."
echo ""

# 1. Перевірка чи конфігурація існує
if [ ! -f "${PROJECT_DIR}/deploy/nginx-main-site.conf" ]; then
    echo "❌ Файл конфігурації не знайдено: ${PROJECT_DIR}/deploy/nginx-main-site.conf"
    exit 1
fi

# 2. Запитуємо інформацію про порт основного сайту
echo "📋 Налаштування основного сайту"
echo ""
echo "На якому порту працює основний сайт ${MAIN_DOMAIN}?"
echo "   Наприклад: 3000, 8080, 5000, або якщо статичний сайт - натисніть Enter"
read -p "Порт (або Enter для статичного): " MAIN_PORT

if [ -z "$MAIN_PORT" ]; then
    echo "📁 Налаштовуємо для статичного сайту"
    STATIC_ROOT="/var/www/${MAIN_DOMAIN}/public"
    read -p "Шлях до статичних файлів [${STATIC_ROOT}]: " CUSTOM_ROOT
    STATIC_ROOT=${CUSTOM_ROOT:-$STATIC_ROOT}
    
    # Створюємо директорію якщо не існує
    mkdir -p "$STATIC_ROOT"
    
    # Копіюємо конфігурацію і замінюємо proxy на root
    cp "${PROJECT_DIR}/deploy/nginx-main-site.conf" "${NGINX_SITES_DIR}/${MAIN_DOMAIN}"
    sed -i "s|# root /var/www/foryou-realestate.com/public;|root ${STATIC_ROOT};|" "${NGINX_SITES_DIR}/${MAIN_DOMAIN}"
    sed -i "s|proxy_pass http://127.0.0.1:3000;|# proxy_pass disabled - static site|" "${NGINX_SITES_DIR}/${MAIN_DOMAIN}"
    sed -i "s|proxy_pass http://127.0.0.1:3000/api;|# proxy_pass disabled - static site|" "${NGINX_SITES_DIR}/${MAIN_DOMAIN}"
    sed -i "/proxy_http_version/,/proxy_connect_timeout 75s;/d" "${NGINX_SITES_DIR}/${MAIN_DOMAIN}"
else
    echo "🔌 Налаштовуємо для проксі на порт ${MAIN_PORT}"
    cp "${PROJECT_DIR}/deploy/nginx-main-site.conf" "${NGINX_SITES_DIR}/${MAIN_DOMAIN}"
    sed -i "s|proxy_pass http://127.0.0.1:3000;|proxy_pass http://127.0.0.1:${MAIN_PORT};|" "${NGINX_SITES_DIR}/${MAIN_DOMAIN}"
    sed -i "s|proxy_pass http://127.0.0.1:3000/api;|proxy_pass http://127.0.0.1:${MAIN_PORT}/api;|" "${NGINX_SITES_DIR}/${MAIN_DOMAIN}"
fi

# 3. Створюємо симлінк
echo ""
echo "🔗 Створення симлінку..."
ln -sf "${NGINX_SITES_DIR}/${MAIN_DOMAIN}" "${NGINX_ENABLED_DIR}/${MAIN_DOMAIN}"

# 4. Перевірка конфігурації
echo ""
echo "🔍 Перевірка конфігурації Nginx..."
if nginx -t 2>&1; then
    echo "✅ Конфігурація валідна"
else
    echo "❌ Помилка в конфігурації Nginx!"
    echo "   Перевірте: ${NGINX_SITES_DIR}/${MAIN_DOMAIN}"
    exit 1
fi

# 5. Перезапуск Nginx
echo ""
echo "🔄 Перезапуск Nginx..."
systemctl restart nginx
echo "✅ Nginx перезапущено"

# 6. SSL сертифікат
echo ""
echo "🔒 Перевірка SSL сертифікату..."
if [ -f "/etc/letsencrypt/live/${MAIN_DOMAIN}/fullchain.pem" ]; then
    echo "✅ SSL сертифікат вже встановлено"
else
    echo "⚠️  SSL сертифікат не знайдено"
    echo ""
    read -p "Отримати SSL сертифікат для ${MAIN_DOMAIN}? (yes/no): " GET_SSL
    if [ "$GET_SSL" = "yes" ]; then
        echo "📧 Введіть email для Let's Encrypt:"
        read -p "Email: " SSL_EMAIL
        certbot --nginx -d ${MAIN_DOMAIN} -d www.${MAIN_DOMAIN} --non-interactive --agree-tos --email ${SSL_EMAIL:-admin@foryou-realestate.com} --redirect
        systemctl restart nginx
        echo "✅ SSL сертифікат встановлено"
    else
        echo "⚠️  SSL не встановлено. Можна встановити пізніше:"
        echo "   certbot --nginx -d ${MAIN_DOMAIN} -d www.${MAIN_DOMAIN}"
    fi
fi

# 7. Фінальна перевірка
echo ""
echo "📊 Статус Nginx:"
systemctl status nginx --no-pager | head -5

echo ""
echo "📋 Активні конфігурації:"
ls -la ${NGINX_ENABLED_DIR}/ | grep -E "(foryou-realestate|admin)" || echo "   Немає активних конфігурацій"

echo ""
echo "✅ Готово!"
echo ""
echo "🌐 Домени:"
echo "   - https://${MAIN_DOMAIN} - основний сайт"
echo "   - https://www.${MAIN_DOMAIN} - основний сайт (www)"
echo "   - https://${ADMIN_DOMAIN} - адмін панель"
echo ""
echo "💡 Перевірте що основний сайт працює:"
echo "   curl -I https://${MAIN_DOMAIN}"
