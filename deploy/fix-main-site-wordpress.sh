#!/bin/bash

# Скрипт для відновлення конфігурації основного WordPress сайту foryou-realestate.com
# На основі default конфігурації

set -e

MAIN_DOMAIN="foryou-realestate.com"
NGINX_SITES_DIR="/etc/nginx/sites-available"
NGINX_ENABLED_DIR="/etc/nginx/sites-enabled"
DEFAULT_CONFIG="/etc/nginx/sites-available/default"
BACKUP_DIR="/etc/nginx/backup-$(date +%Y%m%d-%H%M%S)"

echo "🔧 Налаштування основного WordPress сайту ${MAIN_DOMAIN}..."
echo ""

# Створюємо backup
mkdir -p "$BACKUP_DIR"
echo "📦 Створюємо backup конфігурацій..."
cp "$DEFAULT_CONFIG" "$BACKUP_DIR/default.backup" 2>/dev/null || true
cp "${NGINX_SITES_DIR}/${MAIN_DOMAIN}" "$BACKUP_DIR/${MAIN_DOMAIN}.backup" 2>/dev/null || true
echo "✅ Backup створено в: $BACKUP_DIR"
echo ""

# Створюємо конфігурацію для основного сайту
echo "📋 Створення конфігурації для ${MAIN_DOMAIN}..."
cat > "${NGINX_SITES_DIR}/${MAIN_DOMAIN}" << 'EOF'
# Конфігурація Nginx для основного WordPress сайту foryou-realestate.com
# Відновлено з default конфігурації

server {
    listen 80;
    listen [::]:80;
    server_name foryou-realestate.com www.foryou-realestate.com;

    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name www.foryou-realestate.com foryou-realestate.com;

    ssl_certificate /etc/letsencrypt/live/foryou-realestate.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/foryou-realestate.com/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    root /var/www/html;
    index index.php index.html index.htm;

    access_log /var/log/nginx/wordpress.access.log;
    error_log /var/log/nginx/wordpress.error.log;

    location / {
        try_files $uri $uri/ /index.php?$args;
    }

    location ~ \.php$ {
        include snippets/fastcgi-php.conf;
        fastcgi_pass unix:/run/php/php8.3-fpm.sock;
        fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
        include fastcgi_params;
    }

    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot|otf)$ {
        expires max;
        log_not_found off;
    }

    location ~ /\. {
        deny all;
    }
}
EOF

echo "✅ Конфігурація створена"
echo ""

# Оновлюємо default конфігурацію - залишаємо тільки для IP
echo "🔧 Оновлення default конфігурації (залишаємо тільки для IP)..."
cat > "$DEFAULT_CONFIG" << 'EOF'
# Default server configuration для IP адреси
# Основний сайт foryou-realestate.com налаштований в окремій конфігурації

server {
    listen 80;
    server_name 135.181.201.185;

    return 301 https://foryou-realestate.com$request_uri;
}

# Default HTTPS server (якщо хтось підключиться по IP через HTTPS)
server {
    listen 443 ssl http2 default_server;
    listen [::]:443 ssl http2 default_server;
    server_name 135.181.201.185;

    ssl_certificate /etc/letsencrypt/live/foryou-realestate.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/foryou-realestate.com/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    return 301 https://foryou-realestate.com$request_uri;
}
EOF

echo "✅ Default конфігурація оновлена"
echo ""

# Перевірка що симлінк існує
if [ ! -L "${NGINX_ENABLED_DIR}/${MAIN_DOMAIN}" ]; then
    echo "🔗 Створення симлінку..."
    ln -sf "${NGINX_SITES_DIR}/${MAIN_DOMAIN}" "${NGINX_ENABLED_DIR}/${MAIN_DOMAIN}"
    echo "✅ Симлінк створено"
else
    echo "✅ Симлінк вже існує"
fi
echo ""

# Перевірка конфігурації
echo "🔍 Перевірка конфігурації Nginx..."
if nginx -t 2>&1; then
    echo "✅ Конфігурація валідна"
else
    echo "❌ Помилка в конфігурації!"
    echo "   Відновлюємо з backup..."
    cp "$BACKUP_DIR/default.backup" "$DEFAULT_CONFIG"
    cp "$BACKUP_DIR/${MAIN_DOMAIN}.backup" "${NGINX_SITES_DIR}/${MAIN_DOMAIN}" 2>/dev/null || true
    exit 1
fi

# Перезапуск Nginx
echo ""
echo "🔄 Перезапуск Nginx..."
systemctl restart nginx
echo "✅ Nginx перезапущено"

echo ""
echo "✅ Готово!"
echo ""
echo "📋 Статус:"
echo "   - https://${MAIN_DOMAIN} - основний WordPress сайт"
echo "   - https://www.${MAIN_DOMAIN} - основний сайт (www)"
echo "   - https://admin.${MAIN_DOMAIN} - адмін панель"
echo ""
echo "🧪 Перевірка:"
echo "   curl -I https://${MAIN_DOMAIN}"
echo ""
echo "📦 Backup збережено в: $BACKUP_DIR"
echo ""
echo "💡 Примітка:"
echo "   - WordPress файли знаходяться в /var/www/html"
echo "   - PHP-FPM працює на php8.3-fpm.sock"
echo "   - Логи: /var/log/nginx/wordpress.access.log"
