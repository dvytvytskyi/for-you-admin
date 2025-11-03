# Інструкції для деплою на сервер через SSH

## Підключення до сервера

```bash
ssh root@135.181.201.185
```

Пароль: `FNrtVkfCRwgW`

## Після підключення до сервера виконайте:

```bash
cd /opt/admin-panel
git pull origin main
chmod +x deploy/redeploy-frontend.sh
./deploy/redeploy-frontend.sh
```

Або якщо скрипт не працює, виконайте вручну:

```bash
cd /opt/admin-panel
git pull origin main

# Створюємо правильний .env.production
cat > admin-panel/.env.production << EOF
NEXT_PUBLIC_API_URL=https://admin.foryou-realestate.com/api
EOF

# Зупиняємо та видаляємо старий frontend
docker-compose -f docker-compose.prod.yml stop admin-panel-frontend
docker-compose -f docker-compose.prod.yml rm -f admin-panel-frontend

# Перебілд frontend
docker-compose -f docker-compose.prod.yml build --no-cache admin-panel-frontend

# Запускаємо
docker-compose -f docker-compose.prod.yml up -d admin-panel-frontend

# Чекаємо
sleep 15

# Перевіряємо
docker-compose -f docker-compose.prod.yml ps
docker-compose -f docker-compose.prod.yml logs --tail=30 admin-panel-frontend
```

## Перевірка даних для входу

```bash
cd /opt/admin-panel
./deploy/show-credentials.sh
```

## Діагностика проблем

```bash
cd /opt/admin-panel
./deploy/diagnose.sh
```

