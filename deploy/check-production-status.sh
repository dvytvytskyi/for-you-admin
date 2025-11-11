#!/bin/bash

# Скрипт для перевірки статусу на продакшн
# Використання: ./deploy/check-production-status.sh

SERVER_IP="135.181.201.185"
SERVER_USER="root"
SERVER_PASSWORD="FNrtVkfCRwgW"
PROJECT_DIR="/opt/admin-panel"

echo "🔍 Перевірка статусу на продакшн..."
echo ""

# Перевірка чи встановлено sshpass
if ! command -v sshpass &> /dev/null; then
    echo "⚠️  sshpass не встановлено. Встановлюємо..."
    if [[ "$OSTYPE" == "darwin"* ]]; then
        if ! command -v brew &> /dev/null; then
            echo "❌ Homebrew не встановлено. Встановіть sshpass вручну"
            exit 1
        fi
        brew install hudochenkov/sshpass/sshpass 2>/dev/null || true
    fi
fi

# Створюємо скрипт для перевірки на сервері
cat > /tmp/check_production_status.sh << 'REMOTE_SCRIPT'
#!/bin/bash
set -e

PROJECT_DIR="/opt/admin-panel"
cd ${PROJECT_DIR}

echo "📊 Перевірка статусу на продакшн:"
echo ""

echo "1️⃣ Останній коміт в Git:"
git log --oneline -1 || echo "   ⚠️  Не вдалося отримати інформацію про Git"

echo ""
echo "2️⃣ Наявність all_properties.json:"
if [ -f "${PROJECT_DIR}/all_properties.json" ]; then
    FILE_SIZE=$(du -h ${PROJECT_DIR}/all_properties.json | cut -f1)
    echo "   ✅ Файл існує (розмір: ${FILE_SIZE})"
else
    echo "   ❌ Файл не знайдено"
fi

echo ""
echo "3️⃣ Статус контейнерів:"
docker-compose -f docker-compose.prod.yml ps admin-panel-backend admin-panel-db 2>/dev/null || echo "   ⚠️  Не вдалося отримати статус контейнерів"

echo ""
echo "4️⃣ Статистика БД (якщо можливо):"
docker exec for-you-admin-panel-backend-prod npm run count:properties 2>&1 | tail -10 || {
    echo "   ⚠️  Не вдалося виконати скрипт (контейнер може бути не запущений або скрипт не скомпільований)"
}

echo ""
echo "5️⃣ Останні зміни в коді бекенду:"
cd admin-panel-backend
echo "   - properties.routes.ts остання зміна:"
stat -f "%Sm" -t "%Y-%m-%d %H:%M:%S" src/routes/properties.routes.ts 2>/dev/null || stat -c "%y" src/routes/properties.routes.ts 2>/dev/null || echo "      Не вдалося отримати дату"
echo "   - Наявність скриптів:"
[ -f "src/scripts/import-all-properties.ts" ] && echo "      ✅ import-all-properties.ts" || echo "      ❌ import-all-properties.ts"
[ -f "src/scripts/clear-offplan-properties.ts" ] && echo "      ✅ clear-offplan-properties.ts" || echo "      ❌ clear-offplan-properties.ts"
[ -f "src/scripts/remove-secondary-duplicates.ts" ] && echo "      ✅ remove-secondary-duplicates.ts" || echo "      ❌ remove-secondary-duplicates.ts"

echo ""
echo "6️⃣ Компільовані скрипти (dist/scripts):"
if [ -d "dist/scripts" ]; then
    echo "   Скрипти в dist:"
    ls -la dist/scripts/*.js 2>/dev/null | head -5 | awk '{print "      - " $9}' || echo "      Немає скомпільованих скриптів"
else
    echo "   ❌ Директорія dist/scripts не існує"
fi

echo ""
echo "✅ Перевірка завершена"
REMOTE_SCRIPT

chmod +x /tmp/check_production_status.sh

echo "📤 Завантаження скрипту на сервер..."
sshpass -p "${SERVER_PASSWORD}" scp -o StrictHostKeyChecking=no /tmp/check_production_status.sh ${SERVER_USER}@${SERVER_IP}:/tmp/check_production_status.sh

echo ""
echo "▶️  Виконання перевірки на сервері..."
sshpass -p "${SERVER_PASSWORD}" ssh -o StrictHostKeyChecking=no ${SERVER_USER}@${SERVER_IP} 'bash /tmp/check_production_status.sh'

