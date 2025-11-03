#!/bin/bash

# Скрипт для перевірки на якому порту працює основний сайт foryou-realestate.com

echo "🔍 Перевірка порту основного сайту foryou-realestate.com"
echo ""

# Перевірка порту 5000
echo "📌 Перевірка порту 5000:"
if curl -s -o /dev/null -w "%{http_code}" --max-time 3 http://localhost:5000 | grep -q "200\|301\|302"; then
    echo "✅ Порт 5000 відповідає"
    echo "   Вміст заголовків:"
    curl -I http://localhost:5000 2>/dev/null | head -5
    echo ""
    read -p "Це основний сайт foryou-realestate.com? (yes/no): " is_main
    if [ "$is_main" = "yes" ]; then
        echo "✅ Основний сайт працює на порту 5000"
        exit 0
    fi
else
    echo "❌ Порт 5000 не відповідає або не доступний"
fi

echo ""
echo "📌 Перевірка порту 8080:"
if curl -s -o /dev/null -w "%{http_code}" --max-time 3 http://localhost:8080 | grep -q "200\|301\|302"; then
    echo "✅ Порт 8080 відповідає"
    curl -I http://localhost:8080 2>/dev/null | head -5
    echo ""
    read -p "Це основний сайт foryou-realestate.com? (yes/no): " is_main
    if [ "$is_main" = "yes" ]; then
        echo "✅ Основний сайт працює на порту 8080"
        exit 0
    fi
else
    echo "❌ Порт 8080 не відповідає або не доступний"
fi

echo ""
echo "📌 Перевірка порту 3000 (pro-part.online):"
echo "⚠️  Порт 3000 зайнятий pro-part.online, не foryou-realestate.com"

echo ""
echo "📋 Процеси на портах:"
echo "Порт 3000:"
netstat -tlnp 2>/dev/null | grep ":3000 " || ss -tlnp 2>/dev/null | grep ":3000 "
echo ""
echo "Порт 5000:"
netstat -tlnp 2>/dev/null | grep ":5000 " || ss -tlnp 2>/dev/null | grep ":5000 "
echo ""
echo "Порт 8080:"
netstat -tlnp 2>/dev/null | grep ":8080 " || ss -tlnp 2>/dev/null | grep ":8080 "

echo ""
echo "❓ Висновок:"
echo "   Якщо основний сайт foryou-realestate.com ще не запущений,"
echo "   ви можете:"
echo "   1) Запустити його на новому порту (наприклад 8080)"
echo "   2) Створити статичний сайт"
echo "   3) Налаштувати заглушку (maintenance page)"
echo ""
echo "   Для налаштування запустіть:"
echo "   ./deploy/setup-main-site-interactive.sh"
