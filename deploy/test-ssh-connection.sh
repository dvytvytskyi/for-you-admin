#!/bin/bash

# Тест SSH підключення до сервера
# Використання: ./test-ssh-connection.sh

SERVER_IP="135.181.201.185"
SERVER_USER="root"
SERVER_PASSWORD="FNrtVkfCRwgW"

echo "🔍 Тестування підключення до сервера..."
echo ""

# 1. Ping тест
echo "1️⃣ Ping тест:"
if ping -c 3 ${SERVER_IP} > /dev/null 2>&1; then
    echo "   ✅ Сервер відповідає на ping"
else
    echo "   ❌ Сервер не відповідає на ping"
    exit 1
fi
echo ""

# 2. Перевірка SSH порту
echo "2️⃣ Перевірка SSH порту (22):"
if nc -zv -w 5 ${SERVER_IP} 22 > /dev/null 2>&1; then
    echo "   ✅ SSH порт відкритий"
else
    echo "   ❌ SSH порт закритий або недоступний"
    exit 1
fi
echo ""

# 3. Тест SSH підключення з паролем
echo "3️⃣ Тест SSH підключення:"
echo "   Спробуємо підключитися..."

# Перевірка чи встановлено sshpass
if ! command -v sshpass &> /dev/null; then
    echo "   ⚠️  sshpass не встановлено"
    echo "   Встановіть:"
    if [[ "$OSTYPE" == "darwin"* ]]; then
        echo "      brew install hudochenkov/sshpass/sshpass"
    else
        echo "      sudo apt-get install sshpass"
    fi
    echo ""
    echo "   Або спробуйте вручну:"
    echo "      ssh ${SERVER_USER}@${SERVER_IP}"
    echo "      Пароль: ${SERVER_PASSWORD}"
    exit 0
fi

# Спробуємо підключитися
if sshpass -p "${SERVER_PASSWORD}" ssh -o StrictHostKeyChecking=no -o ConnectTimeout=10 ${SERVER_USER}@${SERVER_IP} "echo 'SSH connection successful'" 2>&1; then
    echo "   ✅ SSH підключення успішне!"
    echo ""
    echo "4️⃣ Тест виконання команди на сервері:"
    sshpass -p "${SERVER_PASSWORD}" ssh -o StrictHostKeyChecking=no ${SERVER_USER}@${SERVER_IP} "hostname && uptime" 2>&1
else
    echo "   ❌ SSH підключення не вдалося"
    echo ""
    echo "💡 Можливі причини:"
    echo "   - Неправильний пароль"
    echo "   - SSH ключі не налаштовані"
    echo "   - Firewall блокує підключення"
    echo "   - Сервер перезавантажується"
    echo ""
    echo "   Спробуйте вручну:"
    echo "      ssh ${SERVER_USER}@${SERVER_IP}"
    exit 1
fi

echo ""
echo "✅ Всі тести пройдені успішно!"

