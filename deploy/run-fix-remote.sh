#!/bin/bash

# Скрипт для виконання виправлення на сервері через SSH
# Використання: ./run-fix-remote.sh

set -e

SERVER_IP="88.99.38.25"
SERVER_USER="root"
SERVER_PASSWORD="PgTeNqcgnwWu"
PROJECT_DIR="/opt/admin-panel"

echo "🔧 Виправлення проблеми з доменами на сервері"
echo ""
echo "📡 Підключення до сервера: ${SERVER_USER}@${SERVER_IP}"
echo ""

# Перевірка чи встановлено sshpass (для автоматичного введення пароля)
if ! command -v sshpass &> /dev/null; then
    echo "⚠️  sshpass не встановлено"
    echo "   Встановіть: brew install hudochenkov/sshpass/sshpass (macOS)"
    echo "   або: apt-get install sshpass (Linux)"
    echo ""
    echo "   Або виконайте команди вручну:"
    echo ""
    echo "   ssh ${SERVER_USER}@${SERVER_IP}"
    echo "   cd ${PROJECT_DIR}"
    echo "   git pull origin main"
    echo "   chmod +x deploy/fix-admin-on-main-domain.sh"
    echo "   ./deploy/fix-admin-on-main-domain.sh"
    echo ""
    exit 1
fi

echo "📥 Оновлення коду на сервері..."
sshpass -p "${SERVER_PASSWORD}" ssh -o StrictHostKeyChecking=no ${SERVER_USER}@${SERVER_IP} << 'ENDSSH'
cd /opt/admin-panel
git pull origin main || echo "⚠️  Помилка git pull, продовжуємо..."
ENDSSH

echo ""
echo "🔧 Виконання скрипта виправлення..."
sshpass -p "${SERVER_PASSWORD}" ssh -o StrictHostKeyChecking=no ${SERVER_USER}@${SERVER_IP} << 'ENDSSH'
cd /opt/admin-panel
chmod +x deploy/fix-admin-on-main-domain.sh
./deploy/fix-admin-on-main-domain.sh
ENDSSH

echo ""
echo "✅ Готово!"
echo ""
echo "🌐 Перевірте в браузері:"
echo "   - https://admin.foryou-realestate.com (має показувати адмінку)"
echo "   - https://foryou-realestate.com (НЕ має показувати адмінку)"
