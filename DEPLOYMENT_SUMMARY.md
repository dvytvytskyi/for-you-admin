# 📋 Підсумок підготовки до деплою

## ✅ Що створено

### Docker конфігурації
- ✅ `docker-compose.prod.yml` - Production Docker Compose
- ✅ `admin-panel-backend/Dockerfile` - Backend Docker образ
- ✅ `admin-panel/Dockerfile` - Frontend Docker образ
- ✅ Оновлено `admin-panel/next.config.js` для standalone режиму

### Nginx та інфраструктура
- ✅ `deploy/nginx.conf` - Конфігурація Nginx з SSL
- ✅ Налаштовано проксування до frontend (порт 3001) та backend (порт 4000)

### Скрипти деплою
- ✅ `deploy/setup-server.sh` - Первинне налаштування сервера
- ✅ `deploy/deploy.sh` - Повний автоматичний деплой
- ✅ `deploy/quick-deploy.sh` - Швидкий деплой для оновлень

### Документація
- ✅ `deploy/DEPLOY.md` - Детальні інструкції деплою
- ✅ `deploy/README.md` - Швидкий старт
- ✅ `deploy/.env.production.example` - Приклад production змінних

---

## 📝 Що потрібно зробити на сервері

### 1. Створити .env файли

**Корінь проекту (`/opt/admin-panel/.env`):**
```env
DB_PASSWORD=your_secure_password_here
```

**Backend (`/opt/admin-panel/admin-panel-backend/.env`):**
```env
DATABASE_URL=postgresql://admin:your_secure_password_here@admin-panel-db:5432/admin_panel
ADMIN_EMAIL=admin@foryou-realestate.com
ADMIN_PASSWORD=your_secure_admin_password
ADMIN_JWT_SECRET=generate_secure_random_32_chars_minimum
NODE_ENV=production
PORT=4000
CLOUDINARY_CLOUD_NAME=dgv0rxd60
CLOUDINARY_API_KEY=GgziMAcVfQvOGD44Yj0OlNqitPg
CLOUDINARY_API_SECRET=your_cloudinary_secret
```

**Frontend (`/opt/admin-panel/admin-panel/.env.production`):**
```env
NEXT_PUBLIC_API_URL=https://admin.foryou-realestate.com/api
```

### 2. Запустити деплой

```bash
cd /opt/admin-panel
./deploy/setup-server.sh    # Перший раз
./deploy/deploy.sh          # Повний деплой
```

---

## 🔧 Технічні деталі

### Порты
- **Frontend**: 3001 (внутрішній, доступ через Nginx)
- **Backend**: 4000 (внутрішній, доступ через Nginx)
- **Database**: 5435 (тільки localhost)
- **HTTP/HTTPS**: 80/443 (публічні, Nginx)

### Домен
- **Production**: `admin.foryou-realestate.com`
- **IP**: `135.181.201.185`

### Безпека
- ✅ SSL через Let's Encrypt (автоматично)
- ✅ Firewall (UFW) налаштований
- ✅ Fail2ban для захисту від брутфорсу
- ✅ Контейнери використовують локальні порти (127.0.0.1)

---

## 📦 Структура на сервері

```
/opt/admin-panel/
├── admin-panel/              # Next.js frontend
├── admin-panel-backend/       # Express backend
├── deploy/                   # Скрипти деплою
├── docker-compose.prod.yml   # Production compose
├── .env                      # Змінні для docker-compose
└── backups/                  # Backups БД (створити)
```

---

## 🚀 Команди для управління

### Перезапуск
```bash
docker-compose -f docker-compose.prod.yml restart
```

### Логи
```bash
docker-compose -f docker-compose.prod.yml logs -f
```

### Оновлення
```bash
git pull
docker-compose -f docker-compose.prod.yml build
docker-compose -f docker-compose.prod.yml up -d
```

### Backup БД
```bash
docker exec for-you-admin-panel-postgres-prod pg_dump -U admin admin_panel > backups/backup_$(date +%Y%m%d).sql
```

---

## ⚠️ Важливо

1. **Змініть всі паролі** перед першим деплоєм
2. **Генеруйте безпечні ключі** для `ADMIN_JWT_SECRET`
3. **Налаштуйте Cloudinary** з реальним API secret
4. **Зробіть backup БД** перед деплоєм
5. **Перевірте домен** що він вказує на IP сервера

---

## 📞 Наступні кроки

1. Підключіться до сервера: `ssh root@135.181.201.185`
2. Скопіюйте проект в `/opt/admin-panel`
3. Створіть `.env` файли з реальними значеннями
4. Запустіть `./deploy/setup-server.sh`
5. Запустіть `./deploy/deploy.sh`
6. Перевірте сайт: https://admin.foryou-realestate.com

---

**Все готово до деплою! 🎉**

