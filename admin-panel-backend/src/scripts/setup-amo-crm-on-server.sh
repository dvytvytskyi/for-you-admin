#!/bin/bash

# Скрипт для повного налаштування AMO CRM на сервері
# Використання: ./setup-amo-crm-on-server.sh

set -e

echo -e "\n\033[0;34m═══════════════════════════════════════════════════════\033[0m"
echo -e "\033[0;34m  🚀 Налаштування AMO CRM на сервері\033[0m"
echo -e "\033[0;34m═══════════════════════════════════════════════════════\033[0m\n"

# Крок 1: Перевірка змінних оточення
echo -e "\033[1;33m📝 Крок 1: Перевірка змінних оточення...\033[0m"

ENV_FILE=".env"
if [ ! -f "$ENV_FILE" ]; then
  echo -e "  \033[0;31m❌ Файл .env не знайдено!\033[0m"
  echo "   Створіть файл .env з необхідними змінними"
  exit 1
fi

# Перевірка наявності AMO CRM змінних
REQUIRED_VARS=(
  "AMO_DOMAIN"
  "AMO_CLIENT_ID"
  "AMO_CLIENT_SECRET"
  "AMO_ACCOUNT_ID"
  "AMO_API_DOMAIN"
  "AMO_REDIRECT_URI"
)

MISSING_VARS=()
for var in "${REQUIRED_VARS[@]}"; do
  if ! grep -q "^${var}=" "$ENV_FILE"; then
    MISSING_VARS+=("$var")
  fi
done

if [ ${#MISSING_VARS[@]} -gt 0 ]; then
  echo -e "  \033[0;33m⚠️  Відсутні змінні:\033[0m"
  for var in "${MISSING_VARS[@]}"; do
    echo "     - $var"
  done
  echo ""
  echo "   Додайте їх до .env файлу:"
  echo "   AMO_DOMAIN=reforyou.amocrm.ru"
  echo "   AMO_CLIENT_ID=2912780f-a1e4-4d5d-a069-ee01422d8bef"
  echo "   AMO_CLIENT_SECRET=PW0FFyI4WRLzGgKeD7ZTdTFykSMhMNPkCk1WJ6fBzdvmjvc2RQEt1eO6t88fPBhH"
  echo "   AMO_ACCOUNT_ID=31920194"
  echo "   AMO_API_DOMAIN=api-b.amocrm.ru"
  echo "   AMO_REDIRECT_URI=https://admin.foryou-realestate.com/api/amo-crm/callback"
  echo ""
  read -p "   Продовжити все одно? (y/n) " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 1
  fi
else
  echo -e "  \033[0;32m✅ Всі необхідні змінні присутні\033[0m"
fi

# Крок 2: Створення таблиці токенів
echo -e "\n\033[1;33m🗄️  Крок 2: Створення таблиці токенів в БД...\033[0m"

SQL_FILE="src/scripts/create-amo-crm-tokens-table.sql"
if [ ! -f "$SQL_FILE" ]; then
  echo -e "  \033[0;31m❌ SQL файл не знайдено: $SQL_FILE\033[0m"
  exit 1
fi

# Виконання SQL через docker exec
if docker exec -i for-you-admin-panel-postgres-prod psql -U admin -d admin_panel < "$SQL_FILE" 2>&1; then
  echo -e "  \033[0;32m✅ Таблиця створена успішно\033[0m"
else
  echo -e "  \033[0;33m⚠️  Можлива помилка при створенні таблиці (можливо вже існує)\033[0m"
fi

# Крок 3: Перезапуск backend
echo -e "\n\033[1;33m🔄 Крок 3: Перезапуск backend...\033[0m"

if docker compose restart for-you-admin-panel-backend-prod 2>&1; then
  echo -e "  \033[0;32m✅ Backend перезапущено\033[0m"
  echo -e "  \033[0;36m   Чекаємо 5 секунд для ініціалізації...\033[0m"
  sleep 5
else
  echo -e "  \033[0;31m❌ Помилка перезапуску backend\033[0m"
  exit 1
fi

# Крок 4: Встановлення токенів
echo -e "\n\033[1;33m🔑 Крок 4: Встановлення AMO CRM токенів...\033[0m"

TOKEN_SCRIPT="src/scripts/set-initial-amo-tokens.sh"
if [ -f "$TOKEN_SCRIPT" ]; then
  chmod +x "$TOKEN_SCRIPT"
  if bash "$TOKEN_SCRIPT"; then
    echo -e "\n\033[0;32m✅ Токени встановлено успішно!\033[0m"
  else
    echo -e "\n\033[0;31m❌ Помилка встановлення токенів\033[0m"
    exit 1
  fi
else
  echo -e "  \033[0;31m❌ Скрипт встановлення токенів не знайдено: $TOKEN_SCRIPT\033[0m"
  exit 1
fi

echo -e "\n\033[0;34m═══════════════════════════════════════════════════════\033[0m"
echo -e "\033[0;32m  ✅ Налаштування AMO CRM завершено!\033[0m"
echo -e "\033[0;34m═══════════════════════════════════════════════════════\033[0m\n"

echo -e "\033[0;36m📋 Наступні кроки:\033[0m"
echo -e "   1. Налаштуйте webhook в AMO CRM:"
echo -e "      URL: https://admin.foryou-realestate.com/api/amo-crm/webhook"
echo -e "   2. Перевірте статус:"
echo -e "      ./test-amo-crm.sh"
echo ""

