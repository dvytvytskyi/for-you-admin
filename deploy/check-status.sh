#!/bin/bash

echo "🔍 Перевірка статусу деплою..."
echo ""

echo "1️⃣ Перевірка чи є проект:"
ls -la /opt/admin-panel 2>/dev/null || echo "❌ Проект НЕ знайдено в /opt/admin-panel"

echo ""
echo "2️⃣ Перевірка Docker контейнерів:"
docker ps -a | grep -E "admin|NAME" || echo "❌ Немає admin контейнерів"

echo ""
echo "3️⃣ Перевірка Nginx конфігурації:"
ls -la /etc/nginx/sites-enabled/ | grep -v "^total" || echo "❌ Проблема з Nginx"

echo ""
echo "4️⃣ Перевірка що Nginx обслуговує:"
nginx -T 2>&1 | grep -E "server_name|listen" | head -20

echo ""
echo "5️⃣ Перевірка чи є Git репозиторій:"
cd /opt/admin-panel 2>/dev/null && git remote -v || echo "❌ Немає Git репозиторію"

echo ""
echo "6️⃣ Статус диску:"
df -h / | tail -1

echo ""
echo "✅ Перевірка завершена!"

