#!/bin/bash

# Скрипт для виправлення проблеми з PostgreSQL в recovery mode
# ВИКОРИСТОВУЙТЕ ЦЕЙ СКРИПТ НА СЕРВЕРІ!

set -e

DB_CONTAINER="for-you-admin-panel-postgres-prod"

if [ ! -d "/opt/admin-panel" ]; then
    echo "❌ Помилка: Цей скрипт має виконуватися на сервері!"
    exit 1
fi

echo "🔍 Діагностика PostgreSQL..."
echo ""

# 1. Перевірка статусу контейнера
echo "📊 Статус контейнера PostgreSQL:"
docker ps -a | grep ${DB_CONTAINER} || echo "⚠️  Контейнер не знайдено"
echo ""

# 2. Перевірка логів
echo "📋 Останні 30 рядків логів PostgreSQL:"
echo "=========================================="
docker logs --tail 30 ${DB_CONTAINER} 2>&1
echo "=========================================="
echo ""

# 3. Перевірка чи контейнер працює
if ! docker ps | grep -q ${DB_CONTAINER}; then
    echo "⚠️  Контейнер не запущений. Запускаємо..."
    docker start ${DB_CONTAINER}
    echo "⏳ Очікуємо 10 секунд..."
    sleep 10
fi

# 4. Перевірка чи БД вже доступна
echo "🔍 Перевірка доступності БД..."
for i in {1..30}; do
    if docker exec ${DB_CONTAINER} psql -U admin -d admin_panel -c "SELECT 1;" > /dev/null 2>&1; then
        echo "✅ БД доступна!"
        break
    else
        echo "⏳ Очікуємо... (${i}/30)"
        sleep 2
    fi
done

# 5. Якщо все ще не доступна - перезапускаємо
if ! docker exec ${DB_CONTAINER} psql -U admin -d admin_panel -c "SELECT 1;" > /dev/null 2>&1; then
    echo ""
    echo "⚠️  БД все ще не доступна. Перезапускаємо контейнер..."
    docker restart ${DB_CONTAINER}
    echo "⏳ Очікуємо 20 секунд після перезапуску..."
    sleep 20
    
    # Знову чекаємо
    for i in {1..30}; do
        if docker exec ${DB_CONTAINER} psql -U admin -d admin_panel -c "SELECT 1;" > /dev/null 2>&1; then
            echo "✅ БД доступна після перезапуску!"
            break
        else
            echo "⏳ Очікуємо... (${i}/30)"
            sleep 2
        fi
    done
fi

# 6. Фінальна перевірка
echo ""
echo "🔍 Фінальна перевірка:"
if docker exec ${DB_CONTAINER} psql -U admin -d admin_panel -c "SELECT COUNT(*) FROM users;" > /dev/null 2>&1; then
    echo "✅ БД повністю доступна!"
    echo ""
    echo "📊 Кількість користувачів:"
    docker exec ${DB_CONTAINER} psql -U admin -d admin_panel -t -c "SELECT COUNT(*) FROM users;"
    echo ""
    echo "📋 Список таблиць:"
    docker exec ${DB_CONTAINER} psql -U admin -d admin_panel -t -c "\dt" | head -10
else
    echo "❌ БД все ще не доступна. Потрібна додаткова діагностика."
    echo ""
    echo "📋 Логи PostgreSQL:"
    docker logs --tail 50 ${DB_CONTAINER} 2>&1 | tail -20
    echo ""
    echo "💡 Можливі рішення:"
    echo "   1. Перевірте дискове сховище: df -h"
    echo "   2. Перевірте права доступу до томів Docker"
    echo "   3. Можливо потрібно відновити БД з бінарного бекапу"
    exit 1
fi

echo ""
echo "✅ PostgreSQL готовий до роботи!"

