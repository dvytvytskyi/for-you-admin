# Швидке виправлення: адмінка на основному домені

## Проблема
Адмінка показується на `foryou-realestate.com` замість `admin.foryou-realestate.com`

## Швидке виправлення (1 команда)

```bash
cd /opt/admin-panel && chmod +x deploy/fix-admin-on-main-domain.sh && ./deploy/fix-admin-on-main-domain.sh
```

## Що робить скрипт

1. 🔍 Знаходить всі конфігурації nginx, де `foryou-realestate.com` проксує на порт 3001 (адмінка)
2. 💾 Створює резервні копії перед видаленням
3. 🗑️ Видаляє проблемні конфігурації
4. ✅ Перевіряє та виправляє конфігурацію адмінки
5. 🔄 Перезапускає nginx

## Після виконання

Перевірте в браузері:
- ✅ `https://admin.foryou-realestate.com` - має показувати адмінку
- ✅ `https://foryou-realestate.com` - НЕ має показувати адмінку

## Якщо основний сайт не працює

Якщо після виправлення основний сайт не працює, налаштуйте його:

```bash
cd /opt/admin-panel
./deploy/setup-main-site.sh
```

Або інтерактивно:
```bash
./deploy/setup-main-site-interactive.sh
```
