#!/bin/bash

set -e

PROJECT_DIR="/opt/admin-panel"
DOMAIN="admin.foryou-realestate.com"

echo "🔧 Виправлення Nginx та деплой адмін панелі..."
echo ""

# Перевірка чи є проект
if [ ! -d "$PROJECT_DIR" ]; then
    echo "📥 Клонування проекту..."
    mkdir -p $PROJECT_DIR
    cd $PROJECT_DIR
    git clone https://github.com/dvytvytskyi/for-you-admin.git .
else
    echo "📦 Оновлення проекту..."
    cd $PROJECT_DIR
    git pull origin main || echo "⚠️  Git pull не вдався, можливо немає репозиторію"
fi

# Генеруємо паролі якщо немає .env
if [ ! -f "$PROJECT_DIR/.env" ]; then
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
fi

# Зупиняємо старі контейнери
echo "🛑 Зупинка старих контейнерів..."
cd $PROJECT_DIR
docker-compose -f docker-compose.prod.yml down 2>/dev/null || true

# Будівництво
echo "🔨 Будівництво образів..."
docker-compose -f docker-compose.prod.yml build --no-cache

# Запуск
echo "🚀 Запуск контейнерів..."
docker-compose -f docker-compose.prod.yml up -d

echo "⏳ Очікування запуску (15 секунд)..."
sleep 15

# Налаштування Nginx
echo "🌐 Налаштування Nginx..."

# Видаляємо старі конфігурації для нашого домену
rm -f /etc/nginx/sites-enabled/*admin* 2>/dev/null || true
rm -f /etc/nginx/sites-available/*admin* 2>/dev/null || true

# Копіюємо нову конфігурацію
cp $PROJECT_DIR/deploy/nginx.conf /etc/nginx/sites-available/${DOMAIN}

# Створюємо симлінк
ln -sf /etc/nginx/sites-available/${DOMAIN} /etc/nginx/sites-enabled/

# Видаляємо default якщо він конфліктує
if grep -q "admin.foryou-realestate.com" /etc/nginx/sites-enabled/default 2>/dev/null; then
    rm -f /etc/nginx/sites-enabled/default
fi

# Перевірка конфігурації
echo "✅ Перевірка конфігурації Nginx..."
nginx -t

# Перезапуск Nginx
echo "🔄 Перезапуск Nginx..."
systemctl restart nginx

# SSL (якщо ще не встановлено)
if [ ! -f "/etc/letsencrypt/live/${DOMAIN}/fullchain.pem" ]; then
    echo "🔒 Спроба отримати SSL сертифікат..."
    certbot --nginx -d ${DOMAIN} --non-interactive --agree-tos --email admin@foryou-realestate.com --redirect 2>/dev/null || {
        echo "⚠️  SSL не встановлено. Встановіть вручну пізніше:"
        echo "   certbot --nginx -d ${DOMAIN}"
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

