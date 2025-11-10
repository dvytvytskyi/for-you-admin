#!/bin/bash

# Скрипт для оновлення коду та перебудови бекенду на продакшені
# Використання: ./deploy/update-and-rebuild-backend.sh

set -e

SERVER_IP="135.181.201.185"
SERVER_USER="root"
SERVER_PASSWORD="FNrtVkfCRwgW"
PROJECT_DIR="/opt/admin-panel"

echo "🚀 Оновлення коду та перебудова бекенду..."
echo ""

# Перевірка чи встановлено sshpass
if ! command -v sshpass &> /dev/null; then
    echo "⚠️  sshpass не встановлено. Встановлюємо..."
    if [[ "$OSTYPE" == "darwin"* ]]; then
        if ! command -v brew &> /dev/null; then
            echo "❌ Homebrew не встановлено. Встановіть sshpass вручну:"
            echo "   brew install hudochenkov/sshpass/sshpass"
            exit 1
        fi
        brew install hudochenkov/sshpass/sshpass 2>/dev/null || {
            echo "❌ Не вдалося встановити sshpass автоматично"
            echo "   Встановіть вручну: brew install hudochenkov/sshpass/sshpass"
            exit 1
        }
    else
        sudo apt-get update -qq
        sudo apt-get install -y sshpass 2>/dev/null || {
            echo "❌ Не вдалося встановити sshpass"
            exit 1
        }
    fi
fi

# Створюємо скрипт для виконання на сервері
cat > /tmp/update_backend_remote.sh << 'REMOTE_SCRIPT'
#!/bin/bash
set -e

PROJECT_DIR="/opt/admin-panel"
cd ${PROJECT_DIR} || {
    echo "❌ Проект не знайдено в ${PROJECT_DIR}"
    exit 1
}

echo "📥 Оновлення коду з Git..."
git pull origin main || {
    echo "⚠️  Не вдалося оновити код з Git"
    echo "   Перевірте чи є зміни для коміту"
}

echo ""
echo "🔨 Перебудова бекенду..."
docker-compose -f docker-compose.prod.yml build admin-panel-backend || {
    echo "❌ Помилка перебудови бекенду"
    exit 1
}

echo ""
echo "🛑 Зупинка та видалення старого контейнера..."
docker-compose -f docker-compose.prod.yml stop admin-panel-backend 2>/dev/null || true
docker rm -f for-you-admin-panel-backend-prod 2>/dev/null || true

echo ""
echo "🔄 Запуск нового контейнера..."
docker-compose -f docker-compose.prod.yml up -d admin-panel-backend || {
    echo "❌ Помилка запуску бекенду"
    exit 1
}

echo ""
echo "⏳ Очікування запуску (10 секунд)..."
sleep 10

echo ""
echo "📊 Статус контейнерів:"
docker-compose -f docker-compose.prod.yml ps admin-panel-backend

echo ""
echo "📋 Останні 30 рядків логів бекенду:"
docker-compose -f docker-compose.prod.yml logs --tail 30 admin-panel-backend

echo ""
echo "✅ Готово!"
REMOTE_SCRIPT

chmod +x /tmp/update_backend_remote.sh

echo "📤 Завантаження скрипту на сервер..."
sshpass -p "${SERVER_PASSWORD}" scp -o StrictHostKeyChecking=no /tmp/update_backend_remote.sh ${SERVER_USER}@${SERVER_IP}:/tmp/update_backend_remote.sh

echo ""
echo "▶️  Виконання скрипту на сервері..."
sshpass -p "${SERVER_PASSWORD}" ssh -o StrictHostKeyChecking=no ${SERVER_USER}@${SERVER_IP} 'bash /tmp/update_backend_remote.sh'

echo ""
echo "✅ Оновлення завершено!"

