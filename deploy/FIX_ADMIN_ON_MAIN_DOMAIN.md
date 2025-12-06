# Виправлення проблеми: адмінка показується на основному домені

## Проблема
Адмінка показується на домені `foryou-realestate.com` замість `admin.foryou-realestate.com`.

## Структура проекту

Адмінка знаходиться в **окремій директорії** `admin-panel/` в тому ж проекті:
```
admin_for_you/
├── admin-panel/          # Frontend адмінки (Next.js)
├── admin-panel-backend/  # Backend адмінки (Node.js/Express)
└── deploy/               # Скрипти деплою та конфігурації
```

## Причини проблеми

1. **Конфігурація nginx для основного домену проксує на порт 3001** (адмінка)
2. **Default конфігурація nginx містить основний домен і перенаправляє на адмінку**
3. **Конфігурація адмінки містить основний домен в server_name**

## Рішення

### Автоматичне виправлення (РЕКОМЕНДОВАНО)

Виконайте на сервері:

```bash
cd /opt/admin-panel
chmod +x deploy/fix-admin-on-main-domain.sh
./deploy/fix-admin-on-main-domain.sh
```

Скрипт автоматично:
- ✅ Знайде всі конфігурації, де основний домен проксує на адмінку
- ✅ Створить резервні копії перед видаленням
- ✅ Виправить конфігурацію адмінки (залишить тільки `admin.foryou-realestate.com`)
- ✅ Видалить проблемні конфігурації
- ✅ Перевірить валідність і перезапустить nginx

Скрипт:
- ✅ Знайде всі конфігурації, де основний домен проксує на адмінку
- ✅ Виправить конфігурацію адмінки (залишить тільки `admin.foryou-realestate.com`)
- ✅ Перевірить валідність конфігурації nginx
- ✅ Перезапустить nginx

### Ручне виправлення

1. **Перевірте активні конфігурації:**
   ```bash
   ls -la /etc/nginx/sites-enabled/
   ```

2. **Перевірте чи є конфігурація для основного домену:**
   ```bash
   grep -r "foryou-realestate.com" /etc/nginx/sites-enabled/
   ```

3. **Перевірте чи основний домен не проксує на порт 3001:**
   ```bash
   grep -A 10 "server_name.*foryou-realestate.com" /etc/nginx/sites-enabled/* | grep "proxy_pass.*3001"
   ```

4. **Якщо знайдено проблему, видаліть або виправте конфігурацію:**
   ```bash
   # Видаліть проблемну конфігурацію
   rm /etc/nginx/sites-enabled/проблемна-конфігурація
   
   # Перевірте валідність
   nginx -t
   
   # Перезапустіть nginx
   systemctl restart nginx
   ```

## Налаштування основного сайту

Якщо основний сайт `foryou-realestate.com` ще не налаштований, використайте:

```bash
cd /opt/admin-panel
./deploy/setup-main-site.sh
```

Або інтерактивний скрипт:
```bash
./deploy/setup-main-site-interactive.sh
```

## Очікувана конфігурація

### Адмінка (`admin.foryou-realestate.com`)
- **Файл:** `/etc/nginx/sites-available/admin.foryou-realestate.com`
- **Порт:** 3001 (frontend), 4000 (backend API)
- **server_name:** `admin.foryou-realestate.com`

### Основний сайт (`foryou-realestate.com`)
- **Файл:** `/etc/nginx/sites-available/foryou-realestate.com`
- **Порт:** залежить від типу сайту (3000, 5000, або статичний)
- **server_name:** `foryou-realestate.com www.foryou-realestate.com`

## Перевірка після виправлення

```bash
# Перевірка активних конфігурацій
nginx -T 2>&1 | grep -E "server_name|listen" | grep -E "foryou-realestate.com"

# Перевірка статусу nginx
systemctl status nginx

# Перевірка в браузері
curl -I https://foryou-realestate.com
curl -I https://admin.foryou-realestate.com
```

## Додаткові скрипти

- `fix-domain-redirects.sh` - видаляє перенаправлення з основного домену на адмінку
- `setup-main-site.sh` - налаштовує основний сайт
- `check-status.sh` - перевіряє статус деплою
