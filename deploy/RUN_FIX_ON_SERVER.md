# Виконання виправлення на сервері

## Дані для підключення

- **IP:** 88.99.38.25
- **User:** root
- **Password:** PgTeNqcgnwWu

## Швидке виправлення

### Крок 1: Підключіться до сервера

```bash
ssh root@88.99.38.25
```

Введіть пароль: `PgTeNqcgnwWu`

### Крок 2: Виконайте скрипт виправлення

```bash
cd /opt/admin-panel
git pull origin main
chmod +x deploy/fix-admin-on-main-domain.sh
./deploy/fix-admin-on-main-domain.sh
```

## Альтернатива: Виконання через одну команду (з локальної машини)

Якщо у вас налаштований SSH без пароля або ви хочете виконати через одну команду:

```bash
ssh root@88.99.38.25 "cd /opt/admin-panel && git pull origin main && chmod +x deploy/fix-admin-on-main-domain.sh && ./deploy/fix-admin-on-main-domain.sh"
```

Вам буде запропоновано ввести пароль.

## Що робить скрипт

1. 🔍 Знаходить всі конфігурації nginx, де `foryou-realestate.com` проксує на адмінку
2. 💾 Створює резервні копії
3. 🗑️ Видаляє проблемні конфігурації
4. ✅ Виправляє конфігурацію адмінки
5. 🔄 Перезапускає nginx

## Після виконання

Перевірте в браузері:
- ✅ `https://admin.foryou-realestate.com` - має показувати адмінку
- ✅ `https://foryou-realestate.com` - НЕ має показувати адмінку

## Якщо потрібна додаткова допомога

```bash
# Перевірка статусу nginx
systemctl status nginx

# Перевірка активних конфігурацій
ls -la /etc/nginx/sites-enabled/

# Перевірка що обслуговує nginx
nginx -T 2>&1 | grep -E "server_name|listen" | grep -E "foryou-realestate.com"
```
