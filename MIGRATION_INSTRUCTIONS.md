# Інструкції для виконання міграції AMO CRM

## Варіант 1: Автоматично (якщо SSH працює)

1. Завантажте скрипт на сервер:
```bash
scp deploy/run-migration-on-server.sh root@135.181.201.185:/root/
```

2. Підключіться до сервера:
```bash
ssh root@135.181.201.185
```

3. Виконайте скрипт:
```bash
cd /root/admin-panel
bash /root/run-migration-on-server.sh
```

---

## Варіант 2: Вручну через SSH

1. Підключіться до сервера:
```bash
ssh root@135.181.201.185
```

2. Перейдіть в директорію проекту:
```bash
cd /root/admin-panel
```

3. Знайдіть PostgreSQL контейнер:
```bash
docker ps | grep postgres
```

4. Виконайте міграцію (замініть `CONTAINER_ID` на ID контейнера):
```bash
docker exec -i $(docker ps | grep postgres | awk '{print $1}' | head -1) psql -U admin -d admin_panel << 'SQLMIGRATION'
-- Міграція 009: Додати user_id в amo_crm_tokens
ALTER TABLE amo_crm_tokens ADD COLUMN IF NOT EXISTS user_id UUID;

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

CREATE INDEX IF NOT EXISTS idx_amo_crm_tokens_user_id ON amo_crm_tokens(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_amo_crm_tokens_user_id_unique 
ON amo_crm_tokens(user_id) WHERE user_id IS NOT NULL;

COMMENT ON COLUMN amo_crm_tokens.user_id IS 'ID користувача. NULL означає глобальний токен (для адмінів)';

SELECT 'Migration 009 completed successfully' AS status;
SQLMIGRATION
```

5. Перезапустіть backend:
```bash
# Знайти backend контейнер
BACKEND_CONTAINER=$(docker ps | grep backend | grep -v postgres | awk '{print $1}' | head -1)

# Перезапустити
docker restart $BACKEND_CONTAINER

# Перевірити статус
docker ps | grep backend
```

---

## Варіант 3: Через файл міграції

1. Підключіться до сервера:
```bash
ssh root@135.181.201.185
```

2. Перейдіть в директорію проекту:
```bash
cd /root/admin-panel
```

3. Оновіть код з git (якщо ще не оновлено):
```bash
git pull origin main
```

4. Виконайте міграцію:
```bash
docker exec -i $(docker ps | grep postgres | awk '{print $1}' | head -1) psql -U admin -d admin_panel < admin-panel-backend/src/migrations/009-add-user-id-to-amo-crm-tokens.sql
```

5. Перезапустіть backend:
```bash
docker restart $(docker ps | grep backend | grep -v postgres | awk '{print $1}' | head -1)
```

---

## Перевірка міграції

Після виконання міграції перевірте:

```bash
docker exec -i $(docker ps | grep postgres | awk '{print $1}' | head -1) psql -U admin -d admin_panel -c "\d amo_crm_tokens"
```

Має показати колонку `user_id` з типом `uuid`.

---

## Перевірка backend

Перевірте логи backend:

```bash
docker logs $(docker ps | grep backend | grep -v postgres | awk '{print $1}' | head -1) --tail 50
```

Має не бути помилок про відсутність колонки `user_id`.

---

## Якщо виникли проблеми

1. **Помилка "column already exists"** - це нормально, міграція вже виконана
2. **Помилка "constraint already exists"** - це нормально, constraint вже створено
3. **Backend не запускається** - перевірте логи та переконайтеся, що код оновлено з git

---

**Останнє оновлення:** Грудень 2025

