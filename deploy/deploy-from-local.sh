#!/bin/bash

# Скрипт для деплою з локальної машини на сервер
# Використання: ./deploy/deploy-from-local.sh

set -e

SERVER_IP="135.181.201.185"
SERVER_USER="root"
SERVER_PASSWORD="FNrtVkfCRwgW"
PROJECT_DIR="/opt/admin-panel"

echo "🚀 Деплой на сервер..."
echo ""

# Перевіряємо чи є sshpass
if ! command -v sshpass &> /dev/null; then
    echo "⚠️  sshpass не знайдено. Встановлюємо..."
    if [[ "$OSTYPE" == "darwin"* ]]; then
        if ! command -v brew &> /dev/null; then
            echo "❌ Homebrew не встановлено. Встановіть вручну:"
            echo "   brew install hudochenkov/sshpass/sshpass"
            echo ""
            echo "Або виконайте команди вручну:"
            echo "   ssh root@${SERVER_IP}"
            echo "   Пароль: ${SERVER_PASSWORD}"
            exit 1
        fi
        brew install hudochenkov/sshpass/sshpass 2>/dev/null || {
            echo "❌ Не вдалося встановити sshpass автоматично"
            echo "Встановіть вручну: brew install hudochenkov/sshpass/sshpass"
            exit 1
        }
    else
        sudo apt-get install -y sshpass 2>/dev/null || {
            echo "❌ Не вдалося встановити sshpass"
            echo "Встановіть вручну: sudo apt-get install -y sshpass"
            exit 1
        }
    fi
fi

echo "📤 Підключення до сервера та виконання деплою..."
echo ""

# Створюємо скрипт для виконання на сервері
DEPLOY_SCRIPT=$(cat << 'EOF'
#!/bin/bash
set -e
cd /opt/admin-panel
echo "📦 Оновлення коду..."
git pull origin main
echo ""
echo "🔄 Запуск деплою..."
chmod +x deploy/complete-deploy-new-endpoints.sh
./deploy/complete-deploy-new-endpoints.sh
EOF
)

# Виконуємо через SSH
sshpass -p "${SERVER_PASSWORD}" ssh -o StrictHostKeyChecking=no ${SERVER_USER}@${SERVER_IP} "${DEPLOY_SCRIPT}"

echo ""
echo "✅ Деплой завершено!"
echo ""
echo "🌐 Перевірте сайт: https://admin.foryou-realestate.com"
echo "📧 Дані для входу:"
echo "   Email: evelyn@admin-for-you.com"
echo "   Password: s5GhepwhhxNto1UX"

