#!/bin/bash

# Скрипт для відключення перенаправлення з основного домену на адмінку
# ВИКОРИСТОВУЙТЕ ЦЕЙ СКРИПТ НА СЕРВЕРІ!

set -e

MAIN_DOMAIN="foryou-realestate.com"
ADMIN_DOMAIN="admin.foryou-realestate.com"
NGINX_SITES_DIR="/etc/nginx/sites-available"
NGINX_ENABLED_DIR="/etc/nginx/sites-enabled"

if [ ! -d "/opt/admin-panel" ]; then
    echo "❌ Помилка: Цей скрипт має виконуватися на сервері!"
    exit 1
fi

echo "🔍 Перевірка конфігурацій Nginx..."
echo ""

# 1. Перевірка всіх конфігурацій на наявність перенаправлення
echo "📋 Перевірка конфігурацій для основного домену ${MAIN_DOMAIN}..."
echo ""

REDIRECT_FOUND=false

# Перевіряємо всі конфігурації в sites-available
for config_file in ${NGINX_SITES_DIR}/*; do
    if [ -f "$config_file" ]; then
        # Перевіряємо чи є перенаправлення з основного домену на адмінку
        if grep -q "server_name.*${MAIN_DOMAIN}" "$config_file" 2>/dev/null; then
            if grep -q "admin.foryou-realestate.com\|admin-panel" "$config_file" 2>/dev/null; then
                echo "⚠️  Знайдено конфігурацію з перенаправленням: $config_file"
                echo "   Видаляємо..."
                rm -f "$config_file"
                # Видаляємо також з enabled
                rm -f "${NGINX_ENABLED_DIR}/$(basename $config_file)"
                REDIRECT_FOUND=true
            fi
        fi
    fi
done

# Перевіряємо конфігурації в sites-enabled
for config_file in ${NGINX_ENABLED_DIR}/*; do
    if [ -f "$config_file" ] && [ ! -L "$config_file" ]; then
        if grep -q "server_name.*${MAIN_DOMAIN}" "$config_file" 2>/dev/null; then
            if grep -q "admin.foryou-realestate.com\|admin-panel" "$config_file" 2>/dev/null; then
                echo "⚠️  Знайдено конфігурацію з перенаправленням: $config_file"
                echo "   Видаляємо..."
                rm -f "$config_file"
                REDIRECT_FOUND=true
            fi
        fi
    fi
done

if [ "$REDIRECT_FOUND" = true ]; then
    echo "✅ Конфігурації з перенаправленням видалено"
else
    echo "✅ Перенаправлень не знайдено"
fi

# 2. Перевірка default конфігурації
echo ""
echo "📋 Перевірка default конфігурації..."
if [ -f "${NGINX_ENABLED_DIR}/default" ]; then
    if grep -q "admin.foryou-realestate.com\|${MAIN_DOMAIN}" "${NGINX_ENABLED_DIR}/default" 2>/dev/null; then
        echo "⚠️  Default конфігурація містить наші домени"
        echo "   Рекомендується видалити або оновити default конфігурацію"
        echo "   Видаляємо..."
        rm -f "${NGINX_ENABLED_DIR}/default"
        echo "✅ Default конфігурація видалена"
    else
        echo "✅ Default конфігурація не містить наших доменів"
    fi
else
    echo "✅ Default конфігурація не знайдена (це нормально)"
fi

# 3. Перевірка конфігурації адмінки
echo ""
echo "📋 Перевірка конфігурації адмінки..."
ADMIN_CONFIG="${NGINX_SITES_DIR}/${ADMIN_DOMAIN}"
if [ -f "$ADMIN_CONFIG" ]; then
    # Перевіряємо чи конфігурація адмінки не містить основного домену
    if grep -q "server_name.*${MAIN_DOMAIN}" "$ADMIN_CONFIG" 2>/dev/null; then
        echo "⚠️  Конфігурація адмінки містить основний домен!"
        echo "   Виправляємо..."
        # Видаляємо основний домен з server_name, залишаємо тільки admin
        sed -i "s/server_name.*${MAIN_DOMAIN}.*/server_name ${ADMIN_DOMAIN};/g" "$ADMIN_CONFIG"
        echo "✅ Конфігурація адмінки виправлена"
    else
        echo "✅ Конфігурація адмінки коректна (тільки ${ADMIN_DOMAIN})"
    fi
else
    echo "⚠️  Конфігурація адмінки не знайдена в ${ADMIN_CONFIG}"
    echo "   Створюємо..."
    PROJECT_DIR="/opt/admin-panel"
    if [ -f "${PROJECT_DIR}/deploy/nginx.conf" ]; then
        cp "${PROJECT_DIR}/deploy/nginx.conf" "$ADMIN_CONFIG"
        ln -sf "$ADMIN_CONFIG" "${NGINX_ENABLED_DIR}/${ADMIN_DOMAIN}"
        echo "✅ Конфігурація адмінки створена"
    else
        echo "❌ Не знайдено шаблон конфігурації"
    fi
fi

# 4. Перевірка всіх активних конфігурацій
echo ""
echo "📋 Активні конфігурації Nginx:"
ls -la ${NGINX_ENABLED_DIR}/ 2>/dev/null | grep -v "^total" || echo "   Немає активних конфігурацій"

# 5. Перевірка валідності конфігурації
echo ""
echo "🔍 Перевірка валідності конфігурації Nginx..."
if nginx -t 2>&1; then
    echo "✅ Конфігурація валідна"
    
    # Перезапуск Nginx
    echo ""
    echo "🔄 Перезапуск Nginx..."
    systemctl restart nginx
    echo "✅ Nginx перезапущено"
else
    echo "❌ Помилка в конфігурації Nginx!"
    echo "   Перевірте логи: nginx -t"
    exit 1
fi

# 6. Фінальна перевірка
echo ""
echo "📊 Статус Nginx:"
systemctl status nginx --no-pager | head -5

echo ""
echo "✅ Готово!"
echo ""
echo "🌐 Домени:"
echo "   - ${MAIN_DOMAIN} - основний сайт (не має перенаправляти на адмінку)"
echo "   - ${ADMIN_DOMAIN} - адмін панель"
echo ""
echo "💡 Якщо основний сайт не працює, створіть окрему конфігурацію для ${MAIN_DOMAIN}"

