#!/bin/bash

echo "🔌 Підключення до бази даних admin_panel"
echo ""
echo "Дані для підключення:"
echo "  Host: localhost"
echo "  Port: 5435"
echo "  Database: admin_panel"
echo "  User: admin"
echo "  Password: admin123"
echo ""
echo "═══════════════════════════════════════════════════════════"
echo ""
echo "Варіанти підключення:"
echo ""
echo "1️⃣  Через psql (командний рядок):"
echo "   docker exec -it for-you-admin-panel-postgres-new psql -U admin -d admin_panel"
echo ""
echo "2️⃣  Через GUI клієнт (DBeaver, TablePlus, pgAdmin):"
echo "   Host: localhost"
echo "   Port: 5435"
echo "   Database: admin_panel"
echo "   User: admin"
echo "   Password: admin123"
echo ""
echo "3️⃣  Через psql з локальної машини (якщо psql встановлений):"
echo "   PGPASSWORD=admin123 psql -h localhost -p 5435 -U admin -d admin_panel"
echo ""
echo "═══════════════════════════════════════════════════════════"
echo ""
echo "Запускаю інтерактивне підключення через Docker..."
echo ""

docker exec -it for-you-admin-panel-postgres-new psql -U admin -d admin_panel






