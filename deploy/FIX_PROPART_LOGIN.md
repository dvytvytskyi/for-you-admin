# Виправлення проблеми з логіном для system.pro-part.online

## Проблема
502 Bad Gateway при спробі логіну через `/api/auth/login`

## Причини
1. Відсутня конфігурація nginx для домену `system.pro-part.online`
2. Бекенд не працює або недоступний на порту 4000
3. Неправильна конфігурація proxy_pass в nginx

## Рішення

### Крок 1: Діагностика
Спочатку виконайте діагностичний скрипт для виявлення проблеми:

```bash
cd /opt/admin-panel
./deploy/diagnose-propart.sh
```

### Крок 2: Перевірка статусу контейнерів
Переконайтеся, що всі контейнери працюють:

```bash
docker ps | grep admin-panel
```

Якщо контейнери не працюють:
```bash
cd /opt/admin-panel
docker-compose -f docker-compose.prod.yml up -d
```

### Крок 3: Встановлення конфігурації nginx

#### Варіант A: З SSL (рекомендовано для продакшн)
```bash
cd /opt/admin-panel
USE_SSL=true ./deploy/fix-propart-nginx.sh
```

Якщо SSL сертифікат ще не встановлено:
```bash
certbot --nginx -d system.pro-part.online --non-interactive --agree-tos --email admin@foryou-realestate.com
```

#### Варіант B: Без SSL (для тестування)
```bash
cd /opt/admin-panel
USE_SSL=false ./deploy/fix-propart-nginx.sh
```

### Крок 4: Перевірка
Після встановлення перевірте:
1. Статус nginx: `systemctl status nginx`
2. Логи nginx: `tail -f /var/log/nginx/propart-admin-error.log`
3. Логи бекенду: `docker logs -f for-you-admin-panel-backend-prod`
4. Тестовий запит: `curl -X POST http://127.0.0.1:4000/api/auth/login -H "Content-Type: application/json" -d '{"email":"test","password":"test"}'`

## Файли конфігурації

- `nginx-propart.conf` - конфігурація з SSL
- `nginx-propart-http.conf` - конфігурація без SSL (для тестування)
- `fix-propart-nginx.sh` - скрипт для встановлення конфігурації
- `diagnose-propart.sh` - діагностичний скрипт

## Типові проблеми та рішення

### Проблема: Бекенд не відповідає
**Рішення:**
```bash
cd /opt/admin-panel
docker-compose -f docker-compose.prod.yml restart admin-panel-backend
docker logs for-you-admin-panel-backend-prod
```

### Проблема: Nginx не може з'єднатися з бекендом
**Перевірте:**
1. Чи працює бекенд: `curl http://127.0.0.1:4000/api/health`
2. Чи правильний порт в конфігурації nginx (має бути 4000)
3. Чи не блокує firewall порт 4000

### Проблема: SSL сертифікат не працює
**Рішення:**
```bash
certbot --nginx -d system.pro-part.online --non-interactive --agree-tos --email admin@foryou-realestate.com
systemctl restart nginx
```

## Контакти
Якщо проблема не вирішена, перевірте:
- Логи nginx: `/var/log/nginx/propart-admin-error.log`
- Логи бекенду: `docker logs for-you-admin-panel-backend-prod`
- Логи фронтенду: `docker logs for-you-admin-panel-frontend-prod`

