#!/bin/bash

# Скрипт для виконання міграції AMO CRM та перезапуску backend
# Використання: ./deploy/execute-amo-migration.sh

SERVER_IP="135.181.201.185"
SERVER_USER="root"
SERVER_PASSWORD="xTVvPEwrpaF4"

echo "🚀 Виконання міграції AMO CRM та перезапуск backend..."
echo ""

# Знайти проект на сервері
echo "🔍 Шукаю проект на сервері..."
PROJECT_DIR=$(sshpass -p "${SERVER_PASSWORD}" ssh -o StrictHostKeyChecking=no ${SERVER_USER}@${SERVER_IP} "
  if [ -d '/opt/admin-panel' ]; then
    echo '/opt/admin-panel'
  elif [ -d '/root/admin_for_you' ]; then
    echo '/root/admin_for_you'
  elif [ -d '/root/admin-for-you' ]; then
    echo '/root/admin-for-you'
  else
    find /root -maxdepth 2 -type d -name '*admin*' -o -name '*for-you*' 2>/dev/null | head -1
  fi
")

if [ -z "$PROJECT_DIR" ]; then
  echo "❌ Не вдалося знайти проект на сервері"
  exit 1
fi

echo "✅ Проект знайдено: $PROJECT_DIR"
echo ""

# Виконати міграцію
echo "📊 Виконую міграцію 009-add-user-id-to-amo-crm-tokens.sql..."

# Знайти PostgreSQL контейнер
POSTGRES_CONTAINER=$(sshpass -p "${SERVER_PASSWORD}" ssh -o StrictHostKeyChecking=no ${SERVER_USER}@${SERVER_IP} "
  docker ps | grep postgres | awk '{print \$1}' | head -1
")

if [ -z "$POSTGRES_CONTAINER" ]; then
  echo "❌ Не вдалося знайти PostgreSQL контейнер"
  exit 1
fi

echo "✅ PostgreSQL контейнер: $POSTGRES_CONTAINER"
echo ""

# Виконати міграцію через docker exec
sshpass -p "${SERVER_PASSWORD}" ssh -o StrictHostKeyChecking=no ${SERVER_USER}@${SERVER_IP} << EOF
  cd ${PROJECT_DIR}
  
  # Перевірити чи існує файл міграції
  if [ ! -f "admin-panel-backend/src/migrations/009-add-user-id-to-amo-crm-tokens.sql" ]; then
    echo "❌ Файл міграції не знайдено"
    echo "📥 Оновлюю код з git..."
    git pull origin main || echo "⚠️  Не вдалося оновити з git"
  fi
  
  # Виконати міграцію
  echo "📊 Виконую міграцію..."
  docker exec -i ${POSTGRES_CONTAINER} psql -U admin -d admin_panel < admin-panel-backend/src/migrations/009-add-user-id-to-amo-crm-tokens.sql
  
  if [ \$? -eq 0 ]; then
    echo "✅ Міграція виконана успішно"
  else
    echo "⚠️  Можливо міграція вже виконана або є помилка"
  fi
  
  # Перезапустити backend
  echo ""
  echo "🔄 Перезапускаю backend..."
  
  # Знайти backend контейнер
  BACKEND_CONTAINER=\$(docker ps | grep backend | grep -v postgres | awk '{print \$1}' | head -1)
  
  if [ -z "\$BACKEND_CONTAINER" ]; then
    echo "⚠️  Backend контейнер не знайдено, спробую через docker-compose"
    cd ${PROJECT_DIR}
    docker-compose -f docker-compose.prod.yml restart admin-panel-backend || docker-compose restart admin-panel-backend
  else
    echo "✅ Backend контейнер: \$BACKEND_CONTAINER"
    docker restart \$BACKEND_CONTAINER
  fi
  
  echo ""
  echo "⏳ Чекаю 5 секунд для запуску..."
  sleep 5
  
  # Перевірити статус
  echo "📊 Статус контейнерів:"
  docker ps | grep -E "(backend|postgres)" | head -5
  
  echo ""
  echo "✅ Готово!"
EOF

echo ""
echo "🎉 Міграція виконана та backend перезапущено!"
echo ""
echo "📋 Перевірте логи backend:"
echo "   ssh ${SERVER_USER}@${SERVER_IP} 'docker logs \$(docker ps | grep backend | grep -v postgres | awk \"{print \\\$1}\" | head -1) --tail 50'"

