# 🔧 Виправлення: Адмінка показується на основному домені

## Проблема

На `foryou-realestate.com` показується адмінка замість основного сайту. В `/var/www/foryou-realestate` змішаний код адмінки (ThemeProvider, SidebarProvider) та основного сайту.

## Діагностика

### Крок 1: Перевірка вмісту на сервері

Виконайте на сервері:

```bash
cd /opt/admin-panel
git pull origin main
chmod +x deploy/check-main-site-contents.sh
./deploy/check-main-site-contents.sh
```

Скрипт перевірить:
- ✅ Чи існує `/var/www/foryou-realestate`
- ✅ Чи є файли адмінки (ThemeProvider, SidebarProvider)
- ✅ Чи `layout.tsx` містить адмінку
- ✅ Чи `page.tsx` перенаправляє на dashboard
- ✅ Чи nginx проксує на порт 3001

## Виправлення

### Варіант 1: Автоматичне виправлення

```bash
cd /opt/admin-panel
chmod +x deploy/fix-main-site-mixed-content.sh
./deploy/fix-main-site-mixed-content.sh
```

Скрипт:
- 💾 Створить резервну копію
- 🗑️ Видалить файли адмінки
- ✅ Виправить `layout.tsx` (видалить ThemeProvider/SidebarProvider)
- ✅ Виправить `page.tsx` (видалить перенаправлення на dashboard)
- ✅ Перевірить nginx конфігурацію

### Варіант 2: Ручне виправлення

#### 1. Перевірте вміст директорії

```bash
ls -la /var/www/foryou-realestate
```

#### 2. Знайдіть файли адмінки

```bash
grep -r "ThemeProvider\|SidebarProvider" /var/www/foryou-realestate
```

#### 3. Перевірте layout.tsx

```bash
find /var/www/foryou-realestate -name "layout.tsx" -exec grep -l "ThemeProvider\|SidebarProvider" {} \;
```

#### 4. Перевірте page.tsx

```bash
find /var/www/foryou-realestate -name "page.tsx" -exec grep -l "dashboard\|router.push" {} \;
```

#### 5. Видаліть або виправте файли

```bash
# Створіть резервну копію
cp -r /var/www/foryou-realestate /var/www/foryou-realestate.backup

# Видаліть файли адмінки (якщо знайдено)
# Або виправте layout.tsx та page.tsx
```

## Налаштування основного сайту

### Якщо основного сайту ще немає

1. **Створіть окремий проект для основного сайту** (не адмінка!)
2. **Або використайте статичний сайт** з правильними компонентами (Header, Hero, Statistics, Footer)

### Якщо основний сайт вже є

1. **Переконайтеся, що він не містить коду адмінки**
2. **Перевірте, що nginx не проксує на порт 3001**
3. **Перезапустіть nginx**

```bash
nginx -t
systemctl restart nginx
```

## Перевірка після виправлення

```bash
# Перевірка nginx конфігурації
nginx -T 2>&1 | grep -E "server_name|proxy_pass" | grep "foryou-realestate.com"

# Перевірка вмісту
ls -la /var/www/foryou-realestate

# Перевірка в браузері
curl -I https://foryou-realestate.com
```

## Очікуваний результат

- ✅ `https://admin.foryou-realestate.com` → показує адмінку
- ✅ `https://foryou-realestate.com` → показує основний сайт (НЕ адмінку)

## Додаткові скрипти

- `check-main-site-contents.sh` - діагностика вмісту
- `fix-main-site-mixed-content.sh` - автоматичне виправлення
- `fix-admin-on-main-domain.sh` - виправлення nginx конфігурації
