#!/bin/bash

# Скрипт для зміни паролю адміна
# ВИКОРИСТОВУЙТЕ ЦЕЙ СКРИПТ НА СЕРВЕРІ!

set -e

PROJECT_DIR="/opt/admin-panel"

if [ ! -d "${PROJECT_DIR}" ]; then
    echo "❌ Помилка: Цей скрипт має виконуватися на сервері!"
    echo "📝 Підключіться до сервера через SSH:"
    echo "   ssh root@135.181.201.185"
    exit 1
fi

cd ${PROJECT_DIR}

# Перевірка чи існує .env файл
if [ ! -f "${PROJECT_DIR}/admin-panel-backend/.env" ]; then
    echo "❌ Файл .env не знайдено!"
    exit 1
fi

echo "🔐 Зміна паролю адміна..."
echo ""

# Генеруємо новий пароль
NEW_PASSWORD=$(openssl rand -base64 16 | tr -d "=+/" | cut -c1-16)

echo "📧 Поточний email:"
CURRENT_EMAIL=$(grep "ADMIN_EMAIL" ${PROJECT_DIR}/admin-panel-backend/.env | cut -d '=' -f2)
echo "${CURRENT_EMAIL}"
echo ""

echo "🔑 Новий пароль буде згенеровано автоматично..."
echo ""

# Оновлюємо .env файл
sed -i "s/ADMIN_PASSWORD=.*/ADMIN_PASSWORD=${NEW_PASSWORD}/" ${PROJECT_DIR}/admin-panel-backend/.env

# Перезапускаємо backend щоб застосувати зміни
echo "🔄 Перезапуск backend контейнера..."
docker-compose -f docker-compose.prod.yml restart admin-panel-backend

echo ""
echo "✅ Пароль змінено!"
echo ""
echo "📧 Дані для входу:"
echo "   Email: ${CURRENT_EMAIL}"
echo "   Password: ${NEW_PASSWORD}"
echo ""
echo "🌐 URL: https://admin.foryou-realestate.com"
echo ""
echo "⚠️  Збережіть цей пароль в безпечному місці!"

