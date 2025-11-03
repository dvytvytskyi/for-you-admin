# Інструкції для деплою Admin Panel

## Серверні дані
- **IP**: 135.181.201.185
- **Домен**: admin.foryou-realestate.com
- **Root Password**: FNrtVkfCRwgW

---

## Крок 1: Підключення до сервера

```bash
ssh root@135.181.201.185
```

Введіть пароль: `FNrtVkfCRwgW`

---

## Крок 2: Базова налаштування сервера

Завантажте та запустіть скрипт налаштування:

```bash
# Завантажити скрипт (замініть на ваш спосіб)
wget https://your-repo/deploy/setup-server.sh
# або скопіюйте файл вручну

chmod +x setup-server.sh
./setup-server.sh
```

Це встановить:
- Docker та Docker Compose
- Nginx
- Certbot (для SSL)
- Fail2ban (захист від брутфорсу)
- UFW (firewall)

---

## Крок 3: Завантаження проекту на сервер

### Варіант A: Через Git (рекомендовано)

```bash
cd /opt/admin-panel
git clone <your-repo-url> .
```

### Варіант B: Через SCP з локальної машини

На вашому локальному комп'ютері:

```bash
scp -r /Users/vytvytskyi/admin_for_you/* root@135.181.201.185:/opt/admin-panel/
```

---

## Крок 4: Налаштування змінних середовища

### Backend (.env)

```bash
cd /opt/admin-panel
nano admin-panel-backend/.env
```

Скопіюйте з `deploy/.env.production.example` та замініть значення:

```env
# Database
DATABASE_URL=postgresql://admin:ВАШ_ПАРОЛЬ_БД@admin-panel-db:5432/admin_panel
DB_PASSWORD=ВАШ_ПАРОЛЬ_БД

# Auth
ADMIN_EMAIL=admin@foryou-realestate.com
ADMIN_PASSWORD=ВАШ_БЕЗПЕЧНИЙ_ПАРОЛЬ
ADMIN_JWT_SECRET=$(openssl rand -base64 32)

# Server
NODE_ENV=production
PORT=4000

# Cloudinary
CLOUDINARY_CLOUD_NAME=dgv0rxd60
CLOUDINARY_API_KEY=GgziMAcVfQvOGD44Yj0OlNqitPg
CLOUDINARY_API_SECRET=ВАШ_CLOUDINARY_SECRET
```

### Frontend (.env.production)

```bash
nano admin-panel/.env.production
```

```env
NEXT_PUBLIC_API_URL=https://admin.foryou-realestate.com/api
```

---

## Крок 5: Оновлення docker-compose.prod.yml

Переконайтеся, що в `docker-compose.prod.yml` використовуються змінні з `.env` файлу:

```bash
cd /opt/admin-panel
nano docker-compose.prod.yml
```

---

## Крок 6: Запуск деплою

### Автоматичний деплой (рекомендовано):

```bash
chmod +x deploy/deploy.sh
./deploy/deploy.sh
```

### Ручний деплой:

```bash
# 1. Збудувати та запустити контейнери
docker-compose -f docker-compose.prod.yml build
docker-compose -f docker-compose.prod.yml up -d

# 2. Налаштувати Nginx
cp deploy/nginx.conf /etc/nginx/sites-available/admin.foryou-realestate.com
ln -s /etc/nginx/sites-available/admin.foryou-realestate.com /etc/nginx/sites-enabled/
nginx -t
systemctl restart nginx

# 3. Отримати SSL сертифікат
certbot --nginx -d admin.foryou-realestate.com --non-interactive --agree-tos --email admin@foryou-realestate.com
```

---

## Крок 7: Перевірка

1. Перевірте статус контейнерів:
```bash
docker-compose -f docker-compose.prod.yml ps
```

2. Перевірте логи:
```bash
# Backend
docker-compose -f docker-compose.prod.yml logs admin-panel-backend

# Frontend
docker-compose -f docker-compose.prod.yml logs admin-panel-frontend
```

3. Відкрийте в браузері:
```
https://admin.foryou-realestate.com
```

---

## Корисні команди

### Перезапуск сервісів
```bash
docker-compose -f docker-compose.prod.yml restart
```

### Перегляд логів
```bash
docker-compose -f docker-compose.prod.yml logs -f
```

### Зупинка сервісів
```bash
docker-compose -f docker-compose.prod.yml down
```

### Оновлення після змін у коді
```bash
cd /opt/admin-panel
git pull
docker-compose -f docker-compose.prod.yml build
docker-compose -f docker-compose.prod.yml up -d
```

### Backup бази даних
```bash
docker exec for-you-admin-panel-postgres-prod pg_dump -U admin admin_panel > /opt/admin-panel/backups/backup_$(date +%Y%m%d_%H%M%S).sql
```

---

## Troubleshooting

### Проблема: Контейнери не запускаються
```bash
docker-compose -f docker-compose.prod.yml logs
```

### Проблема: Nginx не працює
```bash
nginx -t
systemctl status nginx
tail -f /var/log/nginx/admin-panel-error.log
```

### Проблема: SSL сертифікат не встановився
```bash
certbot certificates
certbot renew --dry-run
```

### Проблема: Порт зайнятий
```bash
netstat -tulpn | grep :3001
netstat -tulpn | grep :4000
```

---

## Безпека

1. ✅ Змініть root пароль після першого входу
2. ✅ Використовуйте SSH ключі замість паролів
3. ✅ Оновіть всі паролі в `.env` файлах
4. ✅ Регулярно робіть backup бази даних
5. ✅ Налаштуйте моніторинг (опціонально)

---

## Підтримка

Якщо виникли проблеми, перевірте:
- Логи Docker: `docker-compose -f docker-compose.prod.yml logs`
- Логи Nginx: `/var/log/nginx/admin-panel-error.log`
- Статус сервісів: `systemctl status nginx docker`

