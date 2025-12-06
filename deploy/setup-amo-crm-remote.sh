#!/bin/bash

# Скрипт для налаштування AMO CRM на сервері через SSH
# Використання: ./deploy/setup-amo-crm-remote.sh

set -e

SERVER_IP="135.181.201.185"
SERVER_USER="root"
SERVER_PASSWORD="FNrtVkfCRwgW"

# Шлях до проекту на сервері (може відрізнятися)
PROJECT_DIR="/root/admin_for_you"

echo -e "\n\033[0;34m═══════════════════════════════════════════════════════\033[0m"
echo -e "\033[0;34m  🚀 Налаштування AMO CRM на сервері\033[0m"
echo -e "\033[0;34m═══════════════════════════════════════════════════════\033[0m\n"

# Створюємо скрипт для виконання на сервері
cat > /tmp/setup_amo_crm_remote.sh << 'REMOTE_SCRIPT'
#!/bin/bash
set -e

cd /root/admin_for_you/admin-panel-backend || cd /root/admin_for_you || { echo "❌ Не знайдено директорію проекту"; exit 1; }

echo "📝 Крок 1: Додавання змінних оточення..."

# Додаємо змінні в .env, якщо їх ще немає
ENV_FILE="admin-panel-backend/.env"
if [ ! -f "$ENV_FILE" ]; then
  ENV_FILE=".env"
fi

if [ ! -f "$ENV_FILE" ]; then
  echo "❌ Файл .env не знайдено!"
  exit 1
fi

# Перевіряємо чи вже є AMO CRM змінні
if ! grep -q "AMO_DOMAIN=" "$ENV_FILE"; then
  echo "   Додаю AMO CRM змінні..."
  cat >> "$ENV_FILE" << 'EOF'

# AMO CRM налаштування
AMO_DOMAIN=reforyou.amocrm.ru
AMO_CLIENT_ID=2912780f-a1e4-4d5d-a069-ee01422d8bef
AMO_CLIENT_SECRET=PW0FFyI4WRLzGgKeD7ZTdTFykSMhMNPkCk1WJ6fBzdvmjvc2RQEt1eO6t88fPBhH
AMO_ACCOUNT_ID=31920194
AMO_API_DOMAIN=api-b.amocrm.ru
AMO_REDIRECT_URI=https://admin.foryou-realestate.com/api/amo-crm/callback

# API ключ для комунікації з Main Backend
MAIN_BACKEND_API_KEY=your-secure-api-key-here
MAIN_BACKEND_URL=https://foryou-realestate.com/api/v1
EOF
  echo "   ✅ Змінні додано"
else
  echo "   ✅ Змінні вже присутні"
fi

echo ""
echo "🗄️  Крок 2: Створення таблиці токенів..."

# Знаходимо SQL файл
SQL_FILE="admin-panel-backend/src/scripts/create-amo-crm-tokens-table.sql"
if [ ! -f "$SQL_FILE" ]; then
  SQL_FILE="src/scripts/create-amo-crm-tokens-table.sql"
fi

if [ -f "$SQL_FILE" ]; then
  if docker exec -i for-you-admin-panel-postgres-prod psql -U admin -d admin_panel < "$SQL_FILE" 2>&1 | grep -q "CREATE TABLE\|already exists"; then
    echo "   ✅ Таблиця створена або вже існує"
  else
    echo "   ⚠️  Можлива помилка, але продовжуємо"
  fi
else
  echo "   ❌ SQL файл не знайдено: $SQL_FILE"
  exit 1
fi

echo ""
echo "🔄 Крок 3: Перезапуск backend..."

if docker compose restart for-you-admin-panel-backend-prod 2>&1; then
  echo "   ✅ Backend перезапущено"
  echo "   ⏳ Чекаємо 10 секунд для ініціалізації..."
  sleep 10
else
  echo "   ❌ Помилка перезапуску"
  exit 1
fi

echo ""
echo "🔑 Крок 4: Встановлення токенів..."

# Знаходимо скрипт встановлення токенів
TOKEN_SCRIPT="admin-panel-backend/src/scripts/set-initial-amo-tokens.sh"
if [ ! -f "$TOKEN_SCRIPT" ]; then
  TOKEN_SCRIPT="src/scripts/set-initial-amo-tokens.sh"
fi

if [ -f "$TOKEN_SCRIPT" ]; then
  chmod +x "$TOKEN_SCRIPT"
  if bash "$TOKEN_SCRIPT" 2>&1; then
    echo "   ✅ Токени встановлено"
  else
    echo "   ⚠️  Можлива помилка встановлення токенів (перевірте вручну)"
  fi
else
  echo "   ❌ Скрипт не знайдено: $TOKEN_SCRIPT"
  echo "   Встановіть токени вручну через API"
fi

echo ""
echo "✅ Налаштування завершено!"
REMOTE_SCRIPT

chmod +x /tmp/setup_amo_crm_remote.sh

echo "📤 Завантаження скрипту на сервер..."

# Перевірка чи встановлено sshpass
if ! command -v sshpass &> /dev/null; then
  echo "⚠️  sshpass не встановлено. Спробуємо встановити..."
  if [[ "$OSTYPE" == "darwin"* ]]; then
    brew install hudochenkov/sshpass/sshpass 2>/dev/null || {
      echo "❌ Не вдалося встановити sshpass"
      echo "Встановіть вручну: brew install hudochenkov/sshpass/sshpass"
      exit 1
    }
  else
    sudo apt-get install -y sshpass 2>/dev/null || {
      echo "❌ Не вдалося встановити sshpass"
      echo "Встановіть вручну: sudo apt-get install sshpass"
      exit 1
    }
  fi
fi

# Завантажуємо скрипт на сервер
if sshpass -p "${SERVER_PASSWORD}" scp -o StrictHostKeyChecking=no /tmp/setup_amo_crm_remote.sh ${SERVER_USER}@${SERVER_IP}:/tmp/setup_amo_crm_remote.sh 2>&1; then
  echo "✅ Скрипт завантажено"
else
  echo "❌ Помилка завантаження скрипту"
  exit 1
fi

echo ""
echo "🚀 Виконання скрипту на сервері..."
echo ""

# Виконуємо скрипт на сервері
if sshpass -p "${SERVER_PASSWORD}" ssh -o StrictHostKeyChecking=no ${SERVER_USER}@${SERVER_IP} 'bash /tmp/setup_amo_crm_remote.sh' 2>&1; then
  echo ""
  echo "✅ Налаштування AMO CRM завершено успішно!"
  echo ""
  echo "📋 Наступні кроки:"
  echo "   1. Налаштуйте webhook в AMO CRM:"
  echo "      URL: https://admin.foryou-realestate.com/api/amo-crm/webhook"
  echo "   2. Перевірте статус:"
  echo "      curl -X GET https://admin.foryou-realestate.com/api/amo-crm/status \\"
  echo "        -H \"Authorization: Bearer <admin-token>\""
else
  echo ""
  echo "❌ Помилка виконання скрипту на сервері"
  echo "Виконайте вручну:"
  echo "  ssh ${SERVER_USER}@${SERVER_IP}"
  echo "  bash /tmp/setup_amo_crm_remote.sh"
  exit 1
fi

# Очищаємо тимчасовий файл
rm -f /tmp/setup_amo_crm_remote.sh

echo ""

