#!/bin/bash

set -e

echo "🔧 Налаштування сервера для Admin Panel..."

# Кольори
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Перевірка root
if [ "$EUID" -ne 0 ]; then 
    echo -e "${RED}Запустіть з root правами: sudo bash setup-server.sh${NC}"
    exit 1
fi

echo -e "${YELLOW}📦 Оновлення системи...${NC}"
apt update && apt upgrade -y

echo -e "${YELLOW}📦 Встановлення базових пакетів...${NC}"
apt install -y \
    curl \
    git \
    wget \
    vim \
    ufw \
    fail2ban \
    docker.io \
    docker-compose \
    nginx \
    certbot \
    python3-certbot-nginx

echo -e "${YELLOW}🐳 Налаштування Docker...${NC}"
systemctl enable docker
systemctl start docker

echo -e "${YELLOW}🔥 Налаштування Firewall...${NC}"
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp   # SSH
ufw allow 80/tcp   # HTTP
ufw allow 443/tcp  # HTTPS
ufw --force enable

echo -e "${YELLOW}🔒 Налаштування Fail2ban...${NC}"
systemctl enable fail2ban
systemctl start fail2ban

echo -e "${YELLOW}📁 Створення структури директорій...${NC}"
mkdir -p /opt/admin-panel
mkdir -p /opt/admin-panel/backups

echo -e "${GREEN}✅ Базова налаштування сервера завершено!${NC}"
echo -e "${YELLOW}📝 Наступні кроки:${NC}"
echo -e "1. Скопіюйте проект в /opt/admin-panel"
echo -e "2. Створіть .env файли"
echo -e "3. Запустіть deploy.sh"

