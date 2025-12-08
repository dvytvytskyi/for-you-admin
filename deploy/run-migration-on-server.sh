#!/bin/bash

# Скрипт для виконання міграції AMO CRM на сервері
# Використання: скопіюйте цей скрипт на сервер та виконайте

echo "🚀 Виконання міграції AMO CRM..."

# Знайти PostgreSQL контейнер
POSTGRES_CONTAINER=$(docker ps | grep postgres | awk '{print $1}' | head -1)

if [ -z "$POSTGRES_CONTAINER" ]; then
  echo "❌ Не вдалося знайти PostgreSQL контейнер"
  exit 1
fi

echo "✅ PostgreSQL контейнер: $POSTGRES_CONTAINER"

# Виконати міграцію
echo "📊 Виконую міграцію..."

docker exec -i $POSTGRES_CONTAINER psql -U admin -d admin_panel << 'SQLMIGRATION'
-- Міграція 009: Додати user_id в amo_crm_tokens для підтримки мобільної авторизації

-- Додати колонку user_id
ALTER TABLE amo_crm_tokens 
ADD COLUMN IF NOT EXISTS user_id UUID;

-- Додати foreign key на users(id)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'fk_amo_crm_tokens_user_id'
  ) THEN
    ALTER TABLE amo_crm_tokens
    ADD CONSTRAINT fk_amo_crm_tokens_user_id 
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Створити індекс для швидкого пошуку по user_id
CREATE INDEX IF NOT EXISTS idx_amo_crm_tokens_user_id ON amo_crm_tokens(user_id);

-- Створити унікальний індекс для user_id (один токен на користувача)
-- Використовуємо partial index для NULL значень (глобальні токени)
CREATE UNIQUE INDEX IF NOT EXISTS idx_amo_crm_tokens_user_id_unique 
ON amo_crm_tokens(user_id) 
WHERE user_id IS NOT NULL;

-- Коментарі
COMMENT ON COLUMN amo_crm_tokens.user_id IS 'ID користувача. NULL означає глобальний токен (для адмінів)';

-- Перевірка
SELECT 'Migration 009 completed successfully' AS status;
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'amo_crm_tokens' AND column_name = 'user_id';
SQLMIGRATION

if [ $? -eq 0 ]; then
  echo ""
  echo "✅ Міграція виконана успішно!"
  echo ""
  echo "🔄 Перезапускаю backend..."
  
  # Знайти backend контейнер
  BACKEND_CONTAINER=$(docker ps | grep backend | grep -v postgres | awk '{print $1}' | head -1)
  
  if [ -z "$BACKEND_CONTAINER" ]; then
    echo "⚠️  Backend контейнер не знайдено, спробую через docker-compose"
    docker-compose -f docker-compose.prod.yml restart admin-panel-backend 2>/dev/null || docker-compose restart admin-panel-backend
  else
    echo "✅ Backend контейнер: $BACKEND_CONTAINER"
    docker restart $BACKEND_CONTAINER
    echo "⏳ Чекаю 5 секунд для запуску..."
    sleep 5
    echo "📊 Статус backend:"
    docker ps | grep $BACKEND_CONTAINER
  fi
  
  echo ""
  echo "✅ Готово!"
else
  echo "❌ Помилка при виконанні міграції"
  exit 1
fi

