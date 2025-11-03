#!/bin/bash

set -e

PROJECT_DIR="/opt/admin-panel"
DOMAIN="admin.foryou-realestate.com"

echo "🚀 Повний деплой адмін панелі..."
echo ""

# 1. Оновлення проекту
echo "📦 Оновлення проекту з GitHub..."
cd $PROJECT_DIR
git pull origin main || {
    echo "⚠️  Git pull не вдався, спробуємо reset..."
    git fetch origin main
    git reset --hard origin/main
}

# Видаляємо стару папку якщо є
if [ -d "$PROJECT_DIR/free-nextjs-admin-dashboard-main" ]; then
    echo "🗑️  Видаляю стару папку free-nextjs-admin-dashboard-main..."
    rm -rf $PROJECT_DIR/free-nextjs-admin-dashboard-main
fi

# 2. Створення .env якщо немає
if [ ! -f "$PROJECT_DIR/.env" ] || [ ! -s "$PROJECT_DIR/.env" ]; then
    echo "📝 Створення .env файлів..."
    
    DB_PASSWORD=$(openssl rand -base64 24 | tr -d "=+/" | cut -c1-24)
    ADMIN_PASSWORD=$(openssl rand -base64 16 | tr -d "=+/" | cut -c1-16)
    JWT_SECRET=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-32)
    
    cat > $PROJECT_DIR/.env << EOF
DB_PASSWORD=${DB_PASSWORD}
EOF

    cat > $PROJECT_DIR/admin-panel-backend/.env << EOF
DATABASE_URL=postgresql://admin:${DB_PASSWORD}@admin-panel-db:5432/admin_panel
ADMIN_EMAIL=admin@foryou-realestate.com
ADMIN_PASSWORD=${ADMIN_PASSWORD}
ADMIN_JWT_SECRET=${JWT_SECRET}
NODE_ENV=production
PORT=4000
CLOUDINARY_CLOUD_NAME=dgv0rxd60
CLOUDINARY_API_KEY=GgziMAcVfQvOGD44Yj0OlNqitPg
CLOUDINARY_API_SECRET=your-cloudinary-api-secret
EOF

    cat > $PROJECT_DIR/admin-panel/.env.production << EOF
NEXT_PUBLIC_API_URL=https://${DOMAIN}/api
EOF

    echo "✅ .env файли створено"
    echo "📧 Дані для входу:"
    echo "   Email: admin@foryou-realestate.com"
    echo "   Password: ${ADMIN_PASSWORD}"
    echo ""
fi

# 3. Зупинка старих контейнерів
echo "🛑 Зупинка старих контейнерів..."
cd $PROJECT_DIR
docker-compose -f docker-compose.prod.yml down 2>/dev/null || true

# 4. Будівництво
echo "🔨 Будівництво Docker образів (це може зайняти кілька хвилин)..."
docker-compose -f docker-compose.prod.yml build --no-cache

# 5. Запуск
echo "🚀 Запуск контейнерів..."
docker-compose -f docker-compose.prod.yml up -d

echo "⏳ Очікування запуску сервісів (20 секунд)..."
sleep 20

# 6. Налаштування Nginx
echo "🌐 Налаштування Nginx..."

# Видаляємо старі конфігурації для нашого домену
rm -f /etc/nginx/sites-enabled/${DOMAIN} 2>/dev/null || true
rm -f /etc/nginx/sites-available/${DOMAIN} 2>/dev/null || true

# Копіюємо конфігурацію
cp $PROJECT_DIR/deploy/nginx.conf /etc/nginx/sites-available/${DOMAIN}

# Створюємо симлінк
ln -sf /etc/nginx/sites-available/${DOMAIN} /etc/nginx/sites-enabled/

# Перевірка конфігурації
echo "✅ Перевірка конфігурації Nginx..."
if nginx -t; then
    echo "✅ Конфігурація валідна"
else
    echo "❌ Помилка в конфігурації Nginx!"
    exit 1
fi

# Перезапуск Nginx
echo "🔄 Перезапуск Nginx..."
systemctl restart nginx

# 7. SSL (якщо ще не встановлено)
if [ ! -f "/etc/letsencrypt/live/${DOMAIN}/fullchain.pem" ]; then
    echo "🔒 Спроба отримати SSL сертифікат..."
    certbot --nginx -d ${DOMAIN} --non-interactive --agree-tos --email admin@foryou-realestate.com --redirect 2>/dev/null || {
        echo "⚠️  SSL не встановлено. HTTP працює, але HTTPS потребує налаштування"
        echo "   Встановіть вручну: certbot --nginx -d ${DOMAIN}"
    }
    systemctl restart nginx
fi

echo ""
echo "✅ Деплой завершено!"
echo ""
echo "📊 Статус контейнерів:"
docker-compose -f $PROJECT_DIR/docker-compose.prod.yml ps

echo ""
echo "🌐 Сайт: https://${DOMAIN}"
echo "📝 Логи: docker-compose -f $PROJECT_DIR/docker-compose.prod.yml logs -f"
echo ""
echo "🔍 Перевірка:"
echo "   curl -I http://localhost:3001  # Frontend"
echo "   curl -I http://localhost:4000/api/health  # Backend"

