#!/bin/bash

# Інтерактивне налаштування основного сайту foryou-realestate.com
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

echo "🌐 Налаштування основного сайту ${MAIN_DOMAIN}"
echo ""

# 1. Перевірка конфігурації
if [ ! -f "${PROJECT_DIR}/deploy/nginx-main-site.conf" ]; then
    echo "❌ Файл конфігурації не знайдено: ${PROJECT_DIR}/deploy/nginx-main-site.conf"
    exit 1
fi

# 2. Перевірка портів
echo "🔍 Перевірка доступних портів..."
echo ""
echo "Доступні порти на сервері:"
netstat -tln 2>/dev/null | grep "LISTEN" | grep -E ":(3000|3001|4000|5000|8080|8081)" | awk '{print $4}' | sed 's/.*://' | sort -u || \
ss -tln 2>/dev/null | grep "LISTEN" | grep -E ":(3000|3001|4000|5000|8080|8081)" | awk '{print $4}' | sed 's/.*://' | sort -u
echo ""

# 3. Вибір типу сайту
echo "Який тип сайту ви налаштовуєте?"
echo "1) Динамічний сайт (Next.js, React, Express тощо) на конкретному порту"
echo "2) Статичний сайт (HTML/CSS/JS файли)"
echo "3) Сайт налаштований в іншій директорії/конфігурації"
read -p "Виберіть варіант (1/2/3): " site_type

case $site_type in
    1)
        echo ""
        echo "📌 На якому порту працює основний сайт ${MAIN_DOMAIN}?"
        echo "   (Приклад: 3000, 8080, 5000)"
        read -p "Порт: " MAIN_PORT
        
        if [ -z "$MAIN_PORT" ]; then
            echo "❌ Порт не може бути порожнім!"
            exit 1
        fi
        
        # Перевірка чи порт зайнятий
        if ! netstat -tln 2>/dev/null | grep -q ":${MAIN_PORT} " && ! ss -tln 2>/dev/null | grep -q ":${MAIN_PORT} "; then
            echo "⚠️  Порт ${MAIN_PORT} не зайнятий. Перевірте чи основний сайт запущений."
            read -p "Продовжити? (yes/no): " continue
            if [ "$continue" != "yes" ]; then
                exit 1
            fi
        fi
        
        echo ""
        echo "🔧 Налаштування proxy на порт ${MAIN_PORT}..."
        
        # Копіюємо конфігурацію
        cp "${PROJECT_DIR}/deploy/nginx-main-site.conf" "${NGINX_SITES_DIR}/${MAIN_DOMAIN}"
        
        # Замінюємо порт
        sed -i "s|proxy_pass http://127.0.0.1:3000;|proxy_pass http://127.0.0.1:${MAIN_PORT};|" "${NGINX_SITES_DIR}/${MAIN_DOMAIN}"
        sed -i "s|proxy_pass http://127.0.0.1:3000/api;|proxy_pass http://127.0.0.1:${MAIN_PORT}/api;|" "${NGINX_SITES_DIR}/${MAIN_DOMAIN}"
        
        # Коментуємо root, якщо він є
        sed -i 's|^[[:space:]]*root|    # root|' "${NGINX_SITES_DIR}/${MAIN_DOMAIN}"
        ;;
        
    2)
        echo ""
        echo "📁 Де знаходяться статичні файли основного сайту?"
        echo "   (Приклад: /var/www/foryou-realestate.com/public)"
        read -p "Шлях до директорії: " static_path
        
        if [ -z "$static_path" ] || [ ! -d "$static_path" ]; then
            echo "❌ Директорія не існує: ${static_path}"
            echo "   Створіть директорію та скопіюйте туди статичні файли"
            exit 1
        fi
        
        echo ""
        echo "🔧 Налаштування статичного сайту..."
        
        # Копіюємо конфігурацію
        cp "${PROJECT_DIR}/deploy/nginx-main-site.conf" "${NGINX_SITES_DIR}/${MAIN_DOMAIN}"
        
        # Коментуємо proxy_pass
        sed -i 's|^[[:space:]]*proxy_pass|    # proxy_pass|' "${NGINX_SITES_DIR}/${MAIN_DOMAIN}"
        sed -i 's|^[[:space:]]*proxy_|    # proxy_|' "${NGINX_SITES_DIR}/${MAIN_DOMAIN}"
        
        # Розкоментовуємо та налаштовуємо root
        sed -i "s|# root /var/www/foryou-realestate.com/public;|root ${static_path};|" "${NGINX_SITES_DIR}/${MAIN_DOMAIN}"
        
        # Додаємо index та try_files
        if ! grep -q "index index.html" "${NGINX_SITES_DIR}/${MAIN_DOMAIN}"; then
            sed -i '/location \/ {/a\        index index.html index.htm;\n        try_files $uri $uri/ /index.html;' "${NGINX_SITES_DIR}/${MAIN_DOMAIN}"
        fi
        ;;
        
    3)
        echo ""
        echo "ℹ️  Якщо основний сайт вже налаштований в іншій конфігурації Nginx,"
        echo "   просто переконайтеся що вона правильно налаштована для ${MAIN_DOMAIN}"
        echo ""
        echo "📋 Поточні конфігурації Nginx:"
        ls -la ${NGINX_ENABLED_DIR}/ | grep -v "^d" | tail -n +2
        echo ""
        read -p "Продовжити та створити окрему конфігурацію? (yes/no): " continue
        if [ "$continue" != "yes" ]; then
            exit 0
        fi
        
        # Питаємо про порт або шлях
        echo ""
        read -p "Порт (якщо динамічний) або шлях до статичних файлів: " main_config
        
        if [[ "$main_config" =~ ^[0-9]+$ ]]; then
            # Це порт
            MAIN_PORT="$main_config"
            cp "${PROJECT_DIR}/deploy/nginx-main-site.conf" "${NGINX_SITES_DIR}/${MAIN_DOMAIN}"
            sed -i "s|proxy_pass http://127.0.0.1:3000;|proxy_pass http://127.0.0.1:${MAIN_PORT};|" "${NGINX_SITES_DIR}/${MAIN_DOMAIN}"
            sed -i "s|proxy_pass http://127.0.0.1:3000/api;|proxy_pass http://127.0.0.1:${MAIN_PORT}/api;|" "${NGINX_SITES_DIR}/${MAIN_DOMAIN}"
            sed -i 's|^[[:space:]]*root|    # root|' "${NGINX_SITES_DIR}/${MAIN_DOMAIN}"
        else
            # Це шлях
            static_path="$main_config"
            cp "${PROJECT_DIR}/deploy/nginx-main-site.conf" "${NGINX_SITES_DIR}/${MAIN_DOMAIN}"
            sed -i 's|^[[:space:]]*proxy_pass|    # proxy_pass|' "${NGINX_SITES_DIR}/${MAIN_DOMAIN}"
            sed -i "s|# root /var/www/foryou-realestate.com/public;|root ${static_path};|" "${NGINX_SITES_DIR}/${MAIN_DOMAIN}"
            sed -i '/location \/ {/a\        index index.html index.htm;\n        try_files $uri $uri/ /index.html;' "${NGINX_SITES_DIR}/${MAIN_DOMAIN}"
        fi
        ;;
        
    *)
        echo "❌ Невірний вибір"
        exit 1
        ;;
esac

# 4. Створюємо симлінк
echo ""
echo "🔗 Створення симлінку..."
ln -sf "${NGINX_SITES_DIR}/${MAIN_DOMAIN}" "${NGINX_ENABLED_DIR}/${MAIN_DOMAIN}"

# 5. Перевірка конфігурації
echo ""
echo "🔍 Перевірка конфігурації Nginx..."
if nginx -t 2>&1; then
    echo "✅ Конфігурація валідна"
else
    echo "❌ Помилка в конфігурації Nginx!"
    echo "   Перевірте: ${NGINX_SITES_DIR}/${MAIN_DOMAIN}"
    exit 1
fi

# 6. Перезапуск Nginx
echo ""
echo "🔄 Перезапуск Nginx..."
systemctl restart nginx
echo "✅ Nginx перезапущено"

# 7. SSL сертифікат
echo ""
echo "🔒 Перевірка SSL сертифікату..."
if [ -f "/etc/letsencrypt/live/${MAIN_DOMAIN}/fullchain.pem" ]; then
    echo "✅ SSL сертифікат вже встановлено"
else
    echo "⚠️  SSL сертифікат не знайдено"
    echo ""
    read -p "Встановити SSL сертифікат зараз? (yes/no): " install_ssl
    if [ "$install_ssl" = "yes" ]; then
        echo "📧 Встановлюємо SSL сертифікат..."
        certbot --nginx -d ${MAIN_DOMAIN} -d www.${MAIN_DOMAIN} --non-interactive --agree-tos --email admin@foryou-realestate.com --redirect 2>&1 || {
            echo "⚠️  Не вдалося встановити SSL автоматично"
            echo "   Встановіть вручну: certbot --nginx -d ${MAIN_DOMAIN} -d www.${MAIN_DOMAIN}"
        }
        systemctl restart nginx
    fi
fi

# 8. Фінальна перевірка
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
echo "🧪 Перевірка:"
if [ "$site_type" = "1" ] || ([ "$site_type" = "3" ] && [[ "$main_config" =~ ^[0-9]+$ ]]); then
    echo "   curl -I http://localhost:${MAIN_PORT:-$main_config}"
fi
echo "   curl -I https://${MAIN_DOMAIN}"
