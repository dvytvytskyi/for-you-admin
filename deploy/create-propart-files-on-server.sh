#!/bin/bash
# Скрипт для створення файлів propart на сервері
# Виконайте цей скрипт на сервері в директорії /opt/admin-panel

PROJECT_DIR="/opt/admin-panel"
cd "$PROJECT_DIR" || exit 1

echo "📁 Створення файлів для propart..."

# Створюємо nginx-propart.conf
cat > deploy/nginx-propart.conf << 'NGINX_EOF'
server {
    listen 80;
    server_name system.pro-part.online;
    
    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name system.pro-part.online;

    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/system.pro-part.online/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/system.pro-part.online/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # Security Headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline' 'unsafe-eval'" always;

    # Gzip Compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss application/json application/javascript;

    # Client Max Body Size (для завантаження зображень)
    client_max_body_size 10M;

    # Proxy до Next.js Frontend
    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }

    # Proxy до Backend API
    location /api {
        proxy_pass http://127.0.0.1:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
        # Додаткові налаштування для стабільності
        proxy_buffering off;
        proxy_request_buffering off;
    }

    # Static files для uploads
    location /uploads {
        proxy_pass http://127.0.0.1:4000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_cache_valid 200 1h;
    }

    # Logging
    access_log /var/log/nginx/propart-admin-access.log;
    error_log /var/log/nginx/propart-admin-error.log;
}
NGINX_EOF

# Створюємо nginx-propart-http.conf
cat > deploy/nginx-propart-http.conf << 'NGINX_HTTP_EOF'
# Тимчасова конфігурація Nginx БЕЗ SSL для system.pro-part.online
# Використовуйте для тестування або якщо SSL ще не налаштовано

server {
    listen 80;
    server_name system.pro-part.online;

    # Gzip Compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss application/json application/javascript;

    # Client Max Body Size (для завантаження зображень)
    client_max_body_size 10M;

    # Proxy до Next.js Frontend
    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }

    # Proxy до Backend API
    location /api {
        proxy_pass http://127.0.0.1:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
        # Додаткові налаштування для стабільності
        proxy_buffering off;
        proxy_request_buffering off;
    }

    # Static files для uploads
    location /uploads {
        proxy_pass http://127.0.0.1:4000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_cache_valid 200 1h;
    }

    # Health check endpoint
    location /health {
        access_log off;
        return 200 "healthy\n";
        add_header Content-Type text/plain;
    }

    # Logging
    access_log /var/log/nginx/propart-admin-access.log;
    error_log /var/log/nginx/propart-admin-error.log;
}
NGINX_HTTP_EOF

# Створюємо fix-propart-nginx.sh
cat > deploy/fix-propart-nginx.sh << 'FIX_EOF'
#!/bin/bash

set -e

PROJECT_DIR="/opt/admin-panel"
DOMAIN="system.pro-part.online"
NGINX_CONFIG="/etc/nginx/sites-available/${DOMAIN}"

echo "🔧 Виправлення Nginx конфігурації для ${DOMAIN}..."
echo ""

# Перевірка чи є проект
if [ ! -d "$PROJECT_DIR" ]; then
    echo "❌ Проект не знайдено в $PROJECT_DIR"
    echo "💡 Використовуйте: PROJECT_DIR=/path/to/project $0"
    PROJECT_DIR=$(pwd)
    echo "📁 Використовую поточну директорію: $PROJECT_DIR"
fi

# Вибір конфігурації (HTTP або HTTPS)
USE_SSL="${USE_SSL:-true}"
if [ "$USE_SSL" = "true" ]; then
    NGINX_CONF_FILE="$PROJECT_DIR/deploy/nginx-propart.conf"
else
    NGINX_CONF_FILE="$PROJECT_DIR/deploy/nginx-propart-http.conf"
    echo "⚠️  Використовується HTTP конфігурація (без SSL)"
fi

# Перевірка чи є конфігурація
if [ ! -f "$NGINX_CONF_FILE" ]; then
    echo "❌ Не знайдено $NGINX_CONF_FILE"
    exit 1
fi

# Перевірка чи працює бекенд
echo "🔍 Перевірка статусу бекенду..."
if curl -s http://127.0.0.1:4000/api/health > /dev/null 2>&1; then
    echo "✅ Бекенд працює на порту 4000"
else
    echo "⚠️  Бекенд не відповідає на порту 4000"
    echo "📋 Перевірте статус Docker контейнерів:"
    echo "   docker ps | grep backend"
    echo ""
    echo "🔄 Спробуйте перезапустити бекенд:"
    echo "   cd $PROJECT_DIR && docker-compose -f docker-compose.prod.yml restart admin-panel-backend"
    echo ""
    read -p "Продовжити з налаштуванням nginx? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Перевірка чи працює фронтенд
echo "🔍 Перевірка статусу фронтенду..."
if curl -s http://127.0.0.1:3001 > /dev/null 2>&1; then
    echo "✅ Фронтенд працює на порту 3001"
else
    echo "⚠️  Фронтенд не відповідає на порту 3001"
    echo "📋 Перевірте статус Docker контейнерів:"
    echo "   docker ps | grep frontend"
fi

# Копіюємо конфігурацію
echo ""
echo "📋 Копіювання конфігурації Nginx..."
cp $NGINX_CONF_FILE $NGINX_CONFIG

# Створюємо симлінк
echo "🔗 Створення симлінку..."
ln -sf $NGINX_CONFIG /etc/nginx/sites-enabled/${DOMAIN}

# Перевірка конфігурації
echo "✅ Перевірка конфігурації Nginx..."
if nginx -t; then
    echo "✅ Конфігурація валідна"
else
    echo "❌ Помилка в конфігурації Nginx!"
    echo "📋 Деталі помилки вище"
    exit 1
fi

# Перезапуск Nginx
echo "🔄 Перезапуск Nginx..."
systemctl restart nginx

# Перевірка статусу
if systemctl is-active --quiet nginx; then
    echo "✅ Nginx успішно перезапущено"
else
    echo "❌ Помилка перезапуску Nginx!"
    systemctl status nginx --no-pager
    exit 1
fi

echo ""
echo "✅ Nginx налаштовано для ${DOMAIN}!"
echo ""
echo "📊 Статус сервісів:"
echo "   Nginx: $(systemctl is-active nginx)"
echo "   Бекенд: $(curl -s http://127.0.0.1:4000/api/health > /dev/null 2>&1 && echo '✅ Працює' || echo '❌ Не працює')"
echo "   Фронтенд: $(curl -s http://127.0.0.1:3001 > /dev/null 2>&1 && echo '✅ Працює' || echo '❌ Не працює')"
echo ""

if [ "$USE_SSL" = "true" ]; then
    echo "🌐 Сайт доступний: https://${DOMAIN}"
    echo ""
    echo "💡 Якщо SSL сертифікат не встановлено, виконайте:"
    echo "   certbot --nginx -d ${DOMAIN} --non-interactive --agree-tos --email admin@foryou-realestate.com"
else
    echo "🌐 Сайт доступний: http://${DOMAIN}"
    echo ""
    echo "💡 Для встановлення SSL виконайте:"
    echo "   USE_SSL=true $0"
fi

echo ""
echo "📝 Перевірте логи якщо є проблеми:"
echo "   tail -f /var/log/nginx/propart-admin-error.log"
echo "   docker logs for-you-admin-panel-backend-prod"
FIX_EOF

chmod +x deploy/fix-propart-nginx.sh

echo "✅ Файли створено!"
echo ""
echo "Тепер виконайте:"
echo "  USE_SSL=true ./deploy/fix-propart-nginx.sh"





