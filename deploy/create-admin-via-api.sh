#!/bin/bash

# Створення адміністратора через API (якщо bcrypt не працює в контейнері)
# ВИКОРИСТОВУЙТЕ ЦЕЙ СКРИПТ НА СЕРВЕРІ!

set -e

PROJECT_DIR="/opt/admin-panel"

if [ ! -d "${PROJECT_DIR}" ]; then
    echo "❌ Помилка: Цей скрипт має виконуватися на сервері!"
    exit 1
fi

cd ${PROJECT_DIR}

# Параметри
EMAIL="${1:-evelyn@admin-for-you.com}"
FIRST_NAME="${2:-Evelyn}"
LAST_NAME="${3:-Admin}"

# Генеруємо рандомний пароль
PASSWORD=$(openssl rand -base64 16 | tr -d "=+/" | cut -c1-16)

# Генеруємо унікальний телефон
PHONE_PART=$(echo -n "${EMAIL}" | md5sum | cut -c1-8)
PHONE="+380${PHONE_PART}"

echo "👤 Створення адміністратора через API..."
echo ""

# Створюємо через API /api/auth/register
RESPONSE=$(curl -s -X POST http://localhost:4000/api/auth/register \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"${EMAIL}\",
    \"phone\": \"${PHONE}\",
    \"password\": \"${PASSWORD}\",
    \"firstName\": \"${FIRST_NAME}\",
    \"lastName\": \"${LAST_NAME}\",
    \"role\": \"ADMIN\"
  }")

if echo "$RESPONSE" | grep -q "success.*true"; then
    echo "✅ Користувач створено через API"
    
    # Оновлюємо статус на ACTIVE (API може створити з PENDING)
    docker exec for-you-admin-panel-postgres-prod psql -U admin -d admin_panel -c "
    UPDATE users SET status = 'ACTIVE' WHERE email = '${EMAIL}';
    " 2>/dev/null || true
    
else
    if echo "$RESPONSE" | grep -q "already exists"; then
        echo "⚠️  Користувач вже існує"
        echo ""
        read -p "Оновити пароль? (yes/no): " update
        if [ "$update" = "yes" ]; then
            # Оновлюємо пароль через скрипт з bcrypt
            ./deploy/create-admin.sh "${EMAIL}" "${FIRST_NAME}" "${LAST_NAME}"
            exit 0
        fi
    else
        echo "❌ Помилка створення користувача:"
        echo "$RESPONSE"
        echo ""
        echo "Спробуємо через прямий скрипт..."
        ./deploy/create-admin.sh "${EMAIL}" "${FIRST_NAME}" "${LAST_NAME}"
        exit $?
    fi
fi

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "✅ АДМІНІСТРАТОР СТВОРЕНО!"
echo "═══════════════════════════════════════════════════════════"
echo ""
echo "📧 Email:    ${EMAIL}"
echo "📱 Phone:    ${PHONE}"
echo "👤 Ім'я:     ${FIRST_NAME} ${LAST_NAME}"
echo "🔑 Пароль:   ${PASSWORD}"
echo ""
echo "⚠️  ЗБЕРЕЖІТЬ ЦЕЙ ПАРОЛЬ В БЕЗПЕЧНОМУ МІСЦІ!"
echo ""
echo "🌐 URL: https://admin.foryou-realestate.com"
echo "═══════════════════════════════════════════════════════════"

