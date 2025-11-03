#!/bin/bash

# Створення адміністратора
# ВИКОРИСТОВУЙТЕ ЦЕЙ СКРИПТ НА СЕРВЕРІ!

set -e

PROJECT_DIR="/opt/admin-panel"
DB_CONTAINER="for-you-admin-panel-postgres-prod"

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

# Генеруємо унікальний телефон (використовуємо email hash + random)
PHONE_PART=$(echo -n "${EMAIL}" | md5sum | cut -c1-8)
PHONE="+380${PHONE_PART}"

echo "👤 Створення адміністратора..."
echo ""
echo "Email: ${EMAIL}"
echo "Phone: ${PHONE}"
echo "Ім'я: ${FIRST_NAME} ${LAST_NAME}"
echo "Роль: ADMIN"
echo ""
echo "🔑 Генеруємо пароль..."

# Хешуємо пароль через Node.js (через контейнер backend)
PASSWORD_HASH=$(docker exec for-you-admin-panel-backend-prod node -e "
const bcrypt = require('bcrypt');
bcrypt.hash('${PASSWORD}', 10).then(hash => {
  console.log(hash);
  process.exit(0);
});
" 2>/dev/null)

if [ -z "$PASSWORD_HASH" ]; then
    echo "❌ Не вдалося згенерувати хеш пароля"
    echo "Спробуємо через Python..."
    
    # Альтернатива через Python (якщо є в контейнері)
    PASSWORD_HASH=$(docker exec for-you-admin-panel-backend-prod python3 -c "
import bcrypt
import sys
password = '${PASSWORD}'
hashed = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt(rounds=10))
print(hashed.decode('utf-8'))
" 2>/dev/null) || echo "Потрібен Node.js або Python з bcrypt"
    
    if [ -z "$PASSWORD_HASH" ]; then
        echo "❌ Не вдалося згенерувати хеш. Створюємо користувача через API..."
        echo "Потрібно використати інший спосіб (через API або вручну в БД)"
        exit 1
    fi
fi

echo "✅ Пароль згенеровано"
echo ""

# Перевірка чи користувач вже існує
EXISTING=$(docker exec ${DB_CONTAINER} psql -U admin -d admin_panel -t -c "SELECT COUNT(*) FROM users WHERE email = '${EMAIL}';" | tr -d ' ')

if [ "$EXISTING" != "0" ]; then
    echo "⚠️  Користувач з email ${EMAIL} вже існує!"
    echo ""
    read -p "Оновити пароль? (yes/no): " update
    if [ "$update" = "yes" ]; then
        docker exec ${DB_CONTAINER} psql -U admin -d admin_panel -c "UPDATE users SET password_hash = '${PASSWORD_HASH}', role = 'ADMIN', status = 'ACTIVE' WHERE email = '${EMAIL}';"
        echo "✅ Пароль оновлено"
    else
        echo "Скасовано"
        exit 0
    fi
else
    # Створюємо нового користувача
    echo "📝 Додаємо користувача в БД..."
    
    docker exec ${DB_CONTAINER} psql -U admin -d admin_panel -c "
    INSERT INTO users (id, email, phone, password_hash, first_name, last_name, role, status, created_at, updated_at)
    VALUES (
        gen_random_uuid(),
        '${EMAIL}',
        '${PHONE}',
        '${PASSWORD_HASH}',
        '${FIRST_NAME}',
        '${LAST_NAME}',
        'ADMIN',
        'ACTIVE',
        NOW(),
        NOW()
    );
    "
    
    echo "✅ Користувач створено"
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

