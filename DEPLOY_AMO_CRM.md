# 🚀 Деплой AMO CRM на сервер

## Швидке виконання

Виконайте на сервері в директорії проекту:

```bash
cd /path/to/admin-panel-backend
./src/scripts/setup-amo-crm-on-server.sh
```

## Або виконайте кроки вручну:

### 1. Додати змінні в .env

```bash
cd admin-panel-backend
cat >> .env << 'EOF'

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
```

### 2. Створити таблицю токенів

```bash
docker exec -i for-you-admin-panel-postgres-prod psql -U admin -d admin_panel < admin-panel-backend/src/scripts/create-amo-crm-tokens-table.sql
```

### 3. Перезапустити backend

```bash
docker compose restart for-you-admin-panel-backend-prod
```

### 4. Встановити токени

```bash
cd admin-panel-backend/src/scripts
chmod +x set-initial-amo-tokens.sh
./set-initial-amo-tokens.sh
```

### 5. Перевірити статус

```bash
cd admin-panel-backend
./test-amo-crm.sh
```

## Перевірка після встановлення

```bash
# Перевірити статус підключення
curl -X GET https://admin.foryou-realestate.com/api/amo-crm/status \
  -H "Authorization: Bearer $(curl -s -X POST https://admin.foryou-realestate.com/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"admin@foryou-realestate.com","password":"REDACTED_PASSWORD"}' \
    | python3 -c "import sys, json; print(json.load(sys.stdin)['data']['token'])")"
```

