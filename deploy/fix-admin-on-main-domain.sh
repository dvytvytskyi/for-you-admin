#!/bin/bash

# Скрипт для виправлення проблеми, коли адмінка показується на основному домені
# ВИКОРИСТОВУЙТЕ ЦЕЙ СКРИПТ НА СЕРВЕРІ!

set -e

MAIN_DOMAIN="foryou-realestate.com"
ADMIN_DOMAIN="admin.foryou-realestate.com"
NGINX_SITES_DIR="/etc/nginx/sites-available"
NGINX_ENABLED_DIR="/etc/nginx/sites-enabled"
PROJECT_DIR="/opt/admin-panel"

echo "🔍 Діагностика проблеми з доменами..."
echo ""

# Перевірка чи скрипт виконується на сервері
if [ ! -d "$PROJECT_DIR" ]; then
    echo "❌ Помилка: Цей скрипт має виконуватися на сервері!"
    echo "   Очікується директорія: $PROJECT_DIR"
    exit 1
fi

# 1. Перевірка активних конфігурацій
echo "📋 Активні конфігурації Nginx:"
echo ""
ls -la ${NGINX_ENABLED_DIR}/ 2>/dev/null | grep -v "^total" || echo "   Немає активних конфігурацій"
echo ""

# 2. Перевірка чи є конфігурація для основного домену, яка проксує на адмінку
echo "🔍 Перевірка конфігурацій для основного домену ${MAIN_DOMAIN}..."
echo ""

PROBLEM_FOUND=false

# Перевіряємо всі активні конфігурації
for config_file in ${NGINX_ENABLED_DIR}/*; do
    if [ -f "$config_file" ] || [ -L "$config_file" ]; then
        # Отримуємо реальний шлях до файлу
        REAL_FILE="$config_file"
        if [ -L "$config_file" ]; then
            REAL_FILE=$(readlink -f "$config_file")
        fi
        
        # Перевіряємо чи є конфігурація з основним доменом, яка проксує на порт 3001 (адмінка)
        if grep -q "server_name.*${MAIN_DOMAIN}" "$REAL_FILE" 2>/dev/null; then
            if grep -q "proxy_pass.*127.0.0.1:3001\|proxy_pass.*localhost:3001" "$REAL_FILE" 2>/dev/null; then
                echo "❌ ПРОБЛЕМА ЗНАЙДЕНА!"
                echo "   Файл: $config_file -> $REAL_FILE"
                echo "   Основний домен ${MAIN_DOMAIN} проксує на порт 3001 (адмінка)"
                echo ""
                echo "   Вміст конфігурації:"
                grep -A 5 "server_name.*${MAIN_DOMAIN}" "$REAL_FILE" | head -10
                echo ""
                PROBLEM_FOUND=true
            fi
        fi
    fi
done

# 3. Перевірка default конфігурації
if [ -f "${NGINX_ENABLED_DIR}/default" ]; then
    DEFAULT_FILE="${NGINX_ENABLED_DIR}/default"
    if [ -L "$DEFAULT_FILE" ]; then
        DEFAULT_FILE=$(readlink -f "$DEFAULT_FILE")
    fi
    
    if grep -q "server_name.*${MAIN_DOMAIN}\|default_server" "$DEFAULT_FILE" 2>/dev/null; then
        if grep -q "proxy_pass.*127.0.0.1:3001\|proxy_pass.*localhost:3001" "$DEFAULT_FILE" 2>/dev/null; then
            echo "❌ ПРОБЛЕМА ЗНАЙДЕНА!"
            echo "   Default конфігурація містить основний домен і проксує на адмінку"
            echo "   Файл: $DEFAULT_FILE"
            echo ""
            PROBLEM_FOUND=true
        fi
    fi
fi

# 4. Перевірка всіх конфігурацій на наявність основного домену з портом 3001
echo "🔍 Додаткова перевірка всіх конфігурацій..."
for config_file in ${NGINX_SITES_DIR}/*; do
    if [ -f "$config_file" ]; then
        if grep -q "server_name.*${MAIN_DOMAIN}" "$config_file" 2>/dev/null; then
            if grep -q "proxy_pass.*127.0.0.1:3001\|proxy_pass.*localhost:3001" "$config_file" 2>/dev/null; then
                echo "❌ ПРОБЛЕМА ЗНАЙДЕНА!"
                echo "   Файл: $config_file"
                echo "   Основний домен ${MAIN_DOMAIN} проксує на порт 3001 (адмінка)"
                echo ""
                PROBLEM_FOUND=true
            fi
        fi
    fi
done

if [ "$PROBLEM_FOUND" = false ]; then
    echo "✅ Конфігурації для основного домену не проксують на адмінку"
else
    echo ""
    echo "🔧 Виправлення проблеми..."
    echo ""
    
    # Видаляємо проблемні конфігурації для основного домену
    for config_file in ${NGINX_ENABLED_DIR}/*; do
        if [ -f "$config_file" ] || [ -L "$config_file" ]; then
            REAL_FILE="$config_file"
            if [ -L "$config_file" ]; then
                REAL_FILE=$(readlink -f "$config_file")
            fi
            
            if [ -f "$REAL_FILE" ] && grep -q "server_name.*${MAIN_DOMAIN}" "$REAL_FILE" 2>/dev/null; then
                if grep -q "proxy_pass.*127.0.0.1:3001\|proxy_pass.*localhost:3001" "$REAL_FILE" 2>/dev/null; then
                    echo "   Видаляємо проблемну конфігурацію: $(basename $config_file)"
                    # Створюємо резервну копію
                    cp "$REAL_FILE" "${REAL_FILE}.backup.$(date +%Y%m%d_%H%M%S)" 2>/dev/null || true
                    rm -f "$config_file"
                    # Видаляємо також з sites-available якщо це симлінк
                    if [ -f "$REAL_FILE" ] && [ "$REAL_FILE" != "$config_file" ]; then
                        rm -f "$REAL_FILE"
                    fi
                fi
            fi
        fi
    done
    
    # Видаляємо проблемні конфігурації з sites-available
    for config_file in ${NGINX_SITES_DIR}/*; do
        if [ -f "$config_file" ]; then
            if grep -q "server_name.*${MAIN_DOMAIN}" "$config_file" 2>/dev/null; then
                if grep -q "proxy_pass.*127.0.0.1:3001\|proxy_pass.*localhost:3001" "$config_file" 2>/dev/null; then
                    echo "   Видаляємо проблемну конфігурацію з sites-available: $(basename $config_file)"
                    # Створюємо резервну копію
                    cp "$config_file" "${config_file}.backup.$(date +%Y%m%d_%H%M%S)" 2>/dev/null || true
                    rm -f "$config_file"
                    # Видаляємо симлінк якщо є
                    rm -f "${NGINX_ENABLED_DIR}/$(basename $config_file)"
                fi
            fi
        fi
    done
    
    # Видаляємо default якщо він містить проблему
    if [ -f "${NGINX_ENABLED_DIR}/default" ] || [ -L "${NGINX_ENABLED_DIR}/default" ]; then
        DEFAULT_FILE="${NGINX_ENABLED_DIR}/default"
        if [ -L "$DEFAULT_FILE" ]; then
            DEFAULT_FILE=$(readlink -f "$DEFAULT_FILE")
        fi
        
        if [ -f "$DEFAULT_FILE" ]; then
            if grep -q "server_name.*${MAIN_DOMAIN}\|default_server" "$DEFAULT_FILE" 2>/dev/null; then
                if grep -q "proxy_pass.*127.0.0.1:3001\|proxy_pass.*localhost:3001" "$DEFAULT_FILE" 2>/dev/null; then
                    echo "   Видаляємо проблемну default конфігурацію"
                    # Створюємо резервну копію
                    cp "$DEFAULT_FILE" "${DEFAULT_FILE}.backup.$(date +%Y%m%d_%H%M%S)" 2>/dev/null || true
                    rm -f "${NGINX_ENABLED_DIR}/default"
                fi
            fi
        fi
    fi
fi

# 5. Перевірка конфігурації адмінки
echo ""
echo "📋 Перевірка конфігурації адмінки..."
ADMIN_CONFIG="${NGINX_SITES_DIR}/${ADMIN_DOMAIN}"
if [ -f "$ADMIN_CONFIG" ] || [ -L "${NGINX_ENABLED_DIR}/${ADMIN_DOMAIN}" ]; then
    echo "✅ Конфігурація адмінки знайдена"
    
    # Перевіряємо чи адмінка не містить основного домену
    ACTUAL_CONFIG=""
    if [ -L "${NGINX_ENABLED_DIR}/${ADMIN_DOMAIN}" ]; then
        ACTUAL_CONFIG=$(readlink -f "${NGINX_ENABLED_DIR}/${ADMIN_DOMAIN}")
    elif [ -f "$ADMIN_CONFIG" ]; then
        ACTUAL_CONFIG="$ADMIN_CONFIG"
    fi
    
    if [ -n "$ACTUAL_CONFIG" ] && [ -f "$ACTUAL_CONFIG" ]; then
        # Перевіряємо чи конфігурація адмінки не містить основного домену
        if grep -q "server_name.*${MAIN_DOMAIN}" "$ACTUAL_CONFIG" 2>/dev/null; then
            echo "⚠️  Конфігурація адмінки містить основний домен!"
            echo "   Виправляємо..."
            
            # Створюємо резервну копію
            cp "$ACTUAL_CONFIG" "${ACTUAL_CONFIG}.backup.$(date +%Y%m%d_%H%M%S)"
            
            # Видаляємо основний домен з server_name
            sed -i "s/server_name.*${MAIN_DOMAIN}.*/server_name ${ADMIN_DOMAIN};/g" "$ACTUAL_CONFIG"
            sed -i "s/server_name ${ADMIN_DOMAIN}.*${MAIN_DOMAIN}/server_name ${ADMIN_DOMAIN};/g" "$ACTUAL_CONFIG"
            sed -i "s/server_name.*${MAIN_DOMAIN}.*${ADMIN_DOMAIN}/server_name ${ADMIN_DOMAIN};/g" "$ACTUAL_CONFIG"
            
            # Перевіряємо чи залишився тільки admin домен
            if grep -q "server_name.*${ADMIN_DOMAIN}" "$ACTUAL_CONFIG" 2>/dev/null; then
                if ! grep -q "server_name.*${MAIN_DOMAIN}" "$ACTUAL_CONFIG" 2>/dev/null; then
                    echo "✅ Конфігурація адмінки виправлена"
                else
                    echo "⚠️  Потрібно ручне виправлення: $ACTUAL_CONFIG"
                fi
            else
                echo "⚠️  Помилка: не знайдено ${ADMIN_DOMAIN} після виправлення"
            fi
        else
            # Перевіряємо чи є правильний server_name для адмінки
            if grep -q "server_name.*${ADMIN_DOMAIN}" "$ACTUAL_CONFIG" 2>/dev/null; then
                echo "✅ Конфігурація адмінки коректна (тільки ${ADMIN_DOMAIN})"
            else
                echo "⚠️  Конфігурація адмінки не містить правильного server_name"
                echo "   Перевірте вручну: $ACTUAL_CONFIG"
            fi
        fi
    fi
else
    echo "⚠️  Конфігурація адмінки не знайдена"
    echo "   Створюємо..."
    if [ -f "${PROJECT_DIR}/deploy/nginx.conf" ]; then
        cp "${PROJECT_DIR}/deploy/nginx.conf" "$ADMIN_CONFIG"
        ln -sf "$ADMIN_CONFIG" "${NGINX_ENABLED_DIR}/${ADMIN_DOMAIN}"
        echo "✅ Конфігурація адмінки створена"
    else
        echo "❌ Не знайдено шаблон конфігурації: ${PROJECT_DIR}/deploy/nginx.conf"
    fi
fi

# 6. Перевірка чи є конфігурація для основного сайту
echo ""
echo "📋 Перевірка конфігурації основного сайту..."
MAIN_CONFIG="${NGINX_SITES_DIR}/${MAIN_DOMAIN}"
if [ -f "$MAIN_CONFIG" ] || [ -L "${NGINX_ENABLED_DIR}/${MAIN_DOMAIN}" ]; then
    echo "✅ Конфігурація основного сайту знайдена"
    
    # Перевіряємо чи вона не проксує на адмінку
    ACTUAL_CONFIG=""
    if [ -L "${NGINX_ENABLED_DIR}/${MAIN_DOMAIN}" ]; then
        ACTUAL_CONFIG=$(readlink -f "${NGINX_ENABLED_DIR}/${MAIN_DOMAIN}")
    elif [ -f "$MAIN_CONFIG" ]; then
        ACTUAL_CONFIG="$MAIN_CONFIG"
    fi
    
    if [ -n "$ACTUAL_CONFIG" ] && [ -f "$ACTUAL_CONFIG" ]; then
        if grep -q "proxy_pass.*127.0.0.1:3001" "$ACTUAL_CONFIG" 2>/dev/null; then
            echo "❌ Конфігурація основного сайту проксує на адмінку!"
            echo "   Виправляємо..."
            
            # Створюємо резервну копію
            cp "$ACTUAL_CONFIG" "${ACTUAL_CONFIG}.backup.$(date +%Y%m%d_%H%M%S)"
            
            # Видаляємо конфігурацію, яка проксує на адмінку
            echo "   Видаляємо проблемну конфігурацію"
            rm -f "$ACTUAL_CONFIG"
            if [ -L "${NGINX_ENABLED_DIR}/${MAIN_DOMAIN}" ]; then
                rm -f "${NGINX_ENABLED_DIR}/${MAIN_DOMAIN}"
            fi
            
            echo "✅ Проблемна конфігурація видалена"
            echo "   Створіть нову конфігурацію для основного сайту"
        else
            echo "✅ Конфігурація основного сайту коректна"
        fi
    fi
else
    echo "⚠️  Конфігурація основного сайту не знайдена"
    echo "   Це нормально, якщо основний сайт ще не налаштований"
fi

# 7. Перевірка валідності конфігурації
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

# 8. Фінальна перевірка
echo ""
echo "📊 Фінальна перевірка активних конфігурацій:"
echo ""
ls -la ${NGINX_ENABLED_DIR}/ 2>/dev/null | grep -v "^total" || echo "   Немає активних конфігурацій"
echo ""

echo "📋 Перевірка server_name в активних конфігураціях:"
nginx -T 2>&1 | grep -E "server_name|listen" | grep -E "${MAIN_DOMAIN}|${ADMIN_DOMAIN}" | head -20 || echo "   Не знайдено"
echo ""

echo "✅ Готово!"
echo ""
echo "🌐 Очікувана конфігурація:"
echo "   - ${MAIN_DOMAIN} - основний сайт (НЕ має показувати адмінку)"
echo "   - ${ADMIN_DOMAIN} - адмін панель (порт 3001)"
echo ""
echo "💡 Якщо основний сайт все ще показує адмінку:"
echo "   1. Перевірте чи є окрема конфігурація для ${MAIN_DOMAIN}"
echo "   2. Перевірте чи вона не проксує на порт 3001"
echo "   3. Використайте: deploy/setup-main-site.sh для налаштування основного сайту"
