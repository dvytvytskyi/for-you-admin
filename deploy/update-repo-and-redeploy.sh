#!/bin/bash

# Скрипт для оновлення репозиторію та перебудови фронтенду
# Використання: ./deploy/update-repo-and-redeploy.sh

set -e

SERVER_IP="135.181.201.185"
SERVER_USER="root"
SERVER_PASSWORD="FNrtVkfCRwgW"
PROJECT_DIR="/opt/admin-panel"

echo "🔄 Оновлення репозиторію та перебудова фронтенду..."
echo ""

# Перевіряємо чи є sshpass
if ! command -v sshpass &> /dev/null; then
    echo "⚠️  sshpass не знайдено. Встановлюємо..."
    if [[ "$OSTYPE" == "darwin"* ]]; then
        if ! command -v brew &> /dev/null; then
            echo "❌ Homebrew не встановлено. Встановіть вручну:"
            echo "   brew install hudochenkov/sshpass/sshpass"
            exit 1
        fi
        brew install hudochenkov/sshpass/sshpass 2>/dev/null || {
            echo "❌ Не вдалося встановити sshpass автоматично"
            exit 1
        }
    else
        sudo apt-get install -y sshpass 2>/dev/null || {
            echo "❌ Не вдалося встановити sshpass"
            exit 1
        }
    fi
fi

echo "📤 Підключення до сервера та оновлення..."
echo ""

# Створюємо скрипт для виконання на сервері
DEPLOY_SCRIPT=$(cat << 'EOF'
#!/bin/bash
set -e
cd /opt/admin-panel

echo "🔄 Оновлення remote репозиторію..."
git remote set-url origin https://github.com/dvytvytskyi/for-you-admin.git
git remote -v

echo ""
echo "📥 Оновлення коду з правильного репозиторію..."
git fetch origin
git reset --hard origin/main

echo ""
echo "✅ Код оновлено!"
echo ""
echo "🏗️  Перебудова фронтенду..."
docker stop for-you-admin-panel-frontend-prod 2>/dev/null || true
docker rm -f for-you-admin-panel-frontend-prod 2>/dev/null || true
docker-compose -f docker-compose.prod.yml build --no-cache admin-panel-frontend
docker-compose -f docker-compose.prod.yml up -d admin-panel-frontend

echo ""
echo "✅ Фронтенд перебудовано та запущено!"
echo ""
echo "📋 Статус контейнера:"
docker ps | grep frontend || echo "⚠️  Контейнер не знайдено"

EOF
)

# Виконуємо через SSH
sshpass -p "${SERVER_PASSWORD}" ssh -o StrictHostKeyChecking=no ${SERVER_USER}@${SERVER_IP} "${DEPLOY_SCRIPT}"

echo ""
echo "✅ Оновлення завершено!"
echo ""
echo "🌐 Перевірте сайт: https://admin.foryou-realestate.com"

