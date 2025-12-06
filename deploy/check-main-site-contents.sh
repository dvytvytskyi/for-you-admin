#!/bin/bash

# Скрипт для перевірки вмісту /var/www/foryou-realestate
# Використовуйте на сервері для діагностики проблеми

set -e

MAIN_SITE_DIR="/var/www/foryou-realestate"
ADMIN_PANEL_DIR="/opt/admin-panel"

echo "🔍 Перевірка вмісту основного сайту..."
echo ""

# 1. Перевірка чи існує директорія
if [ ! -d "$MAIN_SITE_DIR" ]; then
    echo "❌ Директорія $MAIN_SITE_DIR не існує"
    echo "   Це означає, що основний сайт ще не налаштований"
    exit 1
fi

echo "✅ Директорія $MAIN_SITE_DIR існує"
echo ""

# 2. Перевірка структури директорії
echo "📁 Структура директорії:"
ls -la "$MAIN_SITE_DIR" | head -20
echo ""

# 3. Пошук файлів адмінки
echo "🔍 Пошук файлів адмінки (ThemeProvider, SidebarProvider)..."
echo ""

ADMIN_FILES_FOUND=false

# Перевірка TypeScript/JavaScript файлів
if find "$MAIN_SITE_DIR" -type f \( -name "*.js" -o -name "*.jsx" -o -name "*.ts" -o -name "*.tsx" \) 2>/dev/null | head -5 | while read file; do
    if grep -l "ThemeProvider\|SidebarProvider" "$file" 2>/dev/null; then
        echo "❌ Знайдено файл адмінки: $file"
        ADMIN_FILES_FOUND=true
    fi
done; then
    :
fi

# Перевірка HTML файлів на наявність посилань на адмінку
if find "$MAIN_SITE_DIR" -type f -name "*.html" 2>/dev/null | head -5 | while read file; do
    if grep -l "admin\|dashboard\|ThemeProvider\|SidebarProvider" "$file" 2>/dev/null; then
        echo "⚠️  Знайдено HTML файл з посиланнями на адмінку: $file"
        grep -n "admin\|dashboard" "$file" | head -3
    fi
done; then
    :
fi

# 4. Перевірка package.json (якщо є)
if [ -f "$MAIN_SITE_DIR/package.json" ]; then
    echo ""
    echo "📦 Знайдено package.json:"
    cat "$MAIN_SITE_DIR/package.json" | grep -E "name|version" | head -5
    
    # Перевірка чи це адмінка
    if grep -q "admin\|panel" "$MAIN_SITE_DIR/package.json" 2>/dev/null; then
        echo "❌ package.json містить посилання на адмінку!"
    fi
fi

# 5. Перевірка .next директорії (Next.js build)
if [ -d "$MAIN_SITE_DIR/.next" ]; then
    echo ""
    echo "📦 Знайдено директорію .next (Next.js build)"
    
    # Перевірка чи є файли з адмінкою
    if find "$MAIN_SITE_DIR/.next" -name "*.js" -type f 2>/dev/null | head -3 | xargs grep -l "ThemeProvider\|SidebarProvider" 2>/dev/null; then
        echo "❌ В .next знайдено файли адмінки!"
    fi
fi

# 6. Перевірка app директорії (Next.js App Router)
if [ -d "$MAIN_SITE_DIR/app" ] || [ -d "$MAIN_SITE_DIR/src/app" ]; then
    echo ""
    echo "📁 Знайдено app директорію (Next.js)"
    
    APP_DIR=""
    if [ -d "$MAIN_SITE_DIR/app" ]; then
        APP_DIR="$MAIN_SITE_DIR/app"
    elif [ -d "$MAIN_SITE_DIR/src/app" ]; then
        APP_DIR="$MAIN_SITE_DIR/src/app"
    fi
    
    if [ -n "$APP_DIR" ]; then
        echo "   Перевірка layout.tsx..."
        if [ -f "$APP_DIR/layout.tsx" ]; then
            if grep -q "ThemeProvider\|SidebarProvider" "$APP_DIR/layout.tsx" 2>/dev/null; then
                echo "❌ layout.tsx містить ThemeProvider/SidebarProvider (це адмінка!)"
                echo "   Вміст:"
                grep -A 3 "ThemeProvider\|SidebarProvider" "$APP_DIR/layout.tsx" | head -5
            fi
        fi
        
        echo "   Перевірка page.tsx..."
        if [ -f "$APP_DIR/page.tsx" ]; then
            echo "   Вміст page.tsx:"
            head -20 "$APP_DIR/page.tsx"
            if grep -q "dashboard\|router.push" "$APP_DIR/page.tsx" 2>/dev/null; then
                echo "❌ page.tsx перенаправляє на dashboard (це адмінка!)"
            fi
        fi
    fi
fi

# 7. Перевірка чи це симлінк на адмінку
if [ -L "$MAIN_SITE_DIR" ]; then
    TARGET=$(readlink -f "$MAIN_SITE_DIR")
    echo ""
    echo "🔗 $MAIN_SITE_DIR є симлінком на: $TARGET"
    
    if [[ "$TARGET" == *"admin"* ]] || [[ "$TARGET" == "$ADMIN_PANEL_DIR"* ]]; then
        echo "❌ Симлінк вказує на адмінку!"
    fi
fi

# 8. Перевірка nginx конфігурації
echo ""
echo "🔍 Перевірка nginx конфігурації для основного сайту..."
if [ -f "/etc/nginx/sites-available/foryou-realestate.com" ]; then
    echo "   Конфігурація знайдена"
    if grep -q "proxy_pass.*3001" "/etc/nginx/sites-available/foryou-realestate.com" 2>/dev/null; then
        echo "❌ Nginx проксує на порт 3001 (адмінка!)"
    elif grep -q "root.*$MAIN_SITE_DIR" "/etc/nginx/sites-available/foryou-realestate.com" 2>/dev/null; then
        echo "✅ Nginx налаштований на статичний сайт з $MAIN_SITE_DIR"
    fi
else
    echo "⚠️  Конфігурація nginx для основного сайту не знайдена"
fi

echo ""
echo "✅ Перевірка завершена!"
echo ""
echo "💡 Рекомендації:"
echo "   1. Якщо знайдено файли адмінки - видаліть їх з $MAIN_SITE_DIR"
echo "   2. Завантажте правильний код основного сайту"
echo "   3. Переконайтеся, що nginx не проксує на порт 3001"
echo "   4. Якщо основний сайт ще не створений - створіть його окремо"
