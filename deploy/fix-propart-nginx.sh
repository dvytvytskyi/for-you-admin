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
echo ""
echo "🔍 Для діагностики виконайте:"
echo "   ${PROJECT_DIR}/deploy/diagnose-propart.sh"

