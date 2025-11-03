#!/bin/bash
# Команди для виконання на сервері для виправлення помилки

echo "Виконайте ці команди на сервері:"
echo ""
echo "cd /opt/admin-panel"
echo "git pull origin main"
echo ""
echo "Перевірте що файл містить onClick:"
echo "grep 'onClick.*React.MouseEvent' admin-panel/src/components/ui/table/index.tsx"
echo ""
echo "Якщо немає - оновіть вручну або перезапустіть:"
echo "git reset --hard origin/main"
echo ""
echo "Потім запустіть білд:"
echo "docker-compose -f docker-compose.prod.yml build --no-cache admin-panel-frontend"

