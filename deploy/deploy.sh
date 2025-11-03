#!/bin/bash

set -e

echo "🚀 Початок деплою Admin Panel..."

# Кольори для виводу
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Перевірка, чи запущений скрипт з root
if [ "$EUID" -ne 0 ]; then 
    echo -e "${RED}Будь ласка, запустіть скрипт з root правами${NC}"
    exit 1
fi

# Змінні
PROJECT_DIR="/opt/admin-panel"
DOMAIN="admin.foryou-realestate.com"
EMAIL="admin@foryou-realestate.com"  # Змініть на свій email

echo -e "${YELLOW}📦 Оновлення системи...${NC}"
apt update && apt upgrade -y

echo -e "${YELLOW}📦 Встановлення необхідних пакетів...${NC}"
apt install -y curl git docker.io docker-compose nginx certbot python3-certbot-nginx

# Запуск Docker
systemctl enable docker
systemctl start docker

# Створення директорії проекту
echo -e "${YELLOW}📁 Створення директорії проекту...${NC}"
mkdir -p $PROJECT_DIR
cd $PROJECT_DIR

# Якщо проект ще не клонований
if [ ! -d "$PROJECT_DIR/.git" ]; then
    echo -e "${YELLOW}📥 Клонування репозиторію...${NC}"
    # Тут потрібно буде вказати URL вашого репозиторію
    # git clone <your-repo-url> .
    echo -e "${RED}⚠️  Будь ласка, клонуйте ваш репозиторій в $PROJECT_DIR${NC}"
fi

# Створення .env файлів (якщо не існують)
if [ ! -f "$PROJECT_DIR/admin-panel-backend/.env" ]; then
    echo -e "${YELLOW}📝 Створення .env файлів...${NC}"
    echo -e "${RED}⚠️  Будь ласка, створіть .env файли вручну${NC}"
fi

# Будівництво та запуск контейнерів
echo -e "${YELLOW}🐳 Запуск Docker контейнерів...${NC}"
cd $PROJECT_DIR
docker-compose -f docker-compose.prod.yml down
docker-compose -f docker-compose.prod.yml build --no-cache
docker-compose -f docker-compose.prod.yml up -d

# Очікування запуску контейнерів
echo -e "${YELLOW}⏳ Очікування запуску сервісів...${NC}"
sleep 10

# Налаштування Nginx
echo -e "${YELLOW}🌐 Налаштування Nginx...${NC}"
cp $PROJECT_DIR/deploy/nginx.conf /etc/nginx/sites-available/$DOMAIN
ln -sf /etc/nginx/sites-available/$DOMAIN /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Тестування конфігурації Nginx
nginx -t

# Отримання SSL сертифікату
echo -e "${YELLOW}🔒 Отримання SSL сертифікату...${NC}"
certbot --nginx -d $DOMAIN --non-interactive --agree-tos --email $EMAIL

# Перезавантаження Nginx
systemctl restart nginx
systemctl enable nginx

# Перевірка статусу
echo -e "${YELLOW}✅ Перевірка статусу сервісів...${NC}"
docker-compose -f docker-compose.prod.yml ps

echo -e "${GREEN}✅ Деплой завершено!${NC}"
echo -e "${GREEN}🌐 Сайт доступний за адресою: https://$DOMAIN${NC}"

