#!/bin/bash

# SSH Tunnel для підключення до PostgreSQL
# Запустіть цей скрипт, щоб створити тунель

echo "🔗 Створюю SSH тунель до бази даних..."
echo "📊 Після запуску підключіться до: localhost:5435"
echo ""
echo "Дані для підключення:"
echo "  Host: localhost"
echo "  Port: 5435"
echo "  Database: admin_panel"
echo "  User: admin"
echo "  Password: (з .env файлу на сервері)"
echo ""
echo "Для підключення через psql:"
echo "  psql -h localhost -p 5435 -U admin -d admin_panel"
echo ""
echo "Для підключення через DBeaver/TablePlus:"
echo "  Host: localhost"
echo "  Port: 5435"
echo "  Database: admin_panel"
echo "  User: admin"
echo ""

# Створюємо SSH тунель
sshpass -p "FNrtVkfCRwgW" ssh -N -L 5435:127.0.0.1:5435 root@135.181.201.185

