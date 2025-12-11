#!/bin/bash

# Скрипт для імпорту всіх CSV файлів на сервері
# Виконується через SSH на сервері

set -e

SERVER_IP="135.181.201.185"
SERVER_USER="root"
SERVER_PASSWORD="xTVvPEwrpaF4"
PROJECT_DIR="/root/admin-panel"

echo "🚀 Імпорт всіх CSV файлів на сервері..."
echo ""

# Копіюємо CSV файли на сервер
echo "📤 Завантаження CSV файлів на сервер..."
sshpass -p "${SERVER_PASSWORD}" scp -o StrictHostKeyChecking=no \
  properties-full-export.csv \
  countries-export.csv \
  cities-export.csv \
  areas-export.csv \
  developers-full-export.csv \
  ${SERVER_USER}@${SERVER_IP}:${PROJECT_DIR}/admin-panel-backend/

echo ""
echo "🚀 Виконання імпорту на сервері..."

sshpass -p "${SERVER_PASSWORD}" ssh -o StrictHostKeyChecking=no ${SERVER_USER}@${SERVER_IP} << 'ENDSSH'
set -e

PROJECT_DIR="/root/admin-panel"
cd ${PROJECT_DIR}/admin-panel-backend

echo "1️⃣ Імпорт країн..."
npm run import:countries || echo "⚠️  Помилка імпорту країн"

echo ""
echo "2️⃣ Імпорт міст..."
npm run import:cities || echo "⚠️  Помилка імпорту міст"

echo ""
echo "3️⃣ Імпорт районів..."
npm run import:areas || echo "⚠️  Помилка імпорту районів"

echo ""
echo "4️⃣ Імпорт девелоперів..."
npm run import:developers || echo "⚠️  Помилка імпорту девелоперів"

echo ""
echo "5️⃣ Імпорт проектів..."
npm run import:csv || echo "⚠️  Помилка імпорту проектів"

echo ""
echo "✅ Всі імпорти завершено!"
ENDSSH

echo ""
echo "✅ Готово!"
