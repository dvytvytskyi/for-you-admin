#!/bin/bash

# Скрипт для виправлення змішаного вмісту в /var/www/foryou-realestate
# ВИКОРИСТОВУЙТЕ ЦЕЙ СКРИПТ НА СЕРВЕРІ!

set -e

MAIN_SITE_DIR="/var/www/foryou-realestate"
BACKUP_DIR="/var/www/foryou-realestate.backup.$(date +%Y%m%d_%H%M%S)"
ADMIN_PANEL_DIR="/opt/admin-panel"

echo "🔧 Виправлення змішаного вмісту основного сайту..."
echo ""

# Перевірка чи існує директорія
if [ ! -d "$MAIN_SITE_DIR" ]; then
    echo "❌ Директорія $MAIN_SITE_DIR не існує"
    echo "   Основний сайт ще не налаштований"
    exit 1
fi

# Створення резервної копії
echo "💾 Створення резервної копії..."
if [ -d "$MAIN_SITE_DIR" ]; then
    cp -r "$MAIN_SITE_DIR" "$BACKUP_DIR" 2>/dev/null || {
        echo "⚠️  Не вдалося створити повну резервну копію, продовжуємо..."
    }
    echo "✅ Резервна копія створена: $BACKUP_DIR"
fi

echo ""
echo "🔍 Пошук файлів адмінки..."

# Знаходимо файли з ThemeProvider або SidebarProvider
ADMIN_FILES=$(find "$MAIN_SITE_DIR" -type f \( -name "*.js" -o -name "*.jsx" -o -name "*.ts" -o -name "*.tsx" \) 2>/dev/null | xargs grep -l "ThemeProvider\|SidebarProvider" 2>/dev/null | head -10)

if [ -n "$ADMIN_FILES" ]; then
    echo "❌ Знайдено файли адмінки:"
    echo "$ADMIN_FILES" | while read file; do
        echo "   - $file"
    done
    
    echo ""
    read -p "Видалити ці файли? (yes/no): " CONFIRM
    if [ "$CONFIRM" = "yes" ]; then
        echo "$ADMIN_FILES" | while read file; do
            echo "   Видаляю: $file"
            rm -f "$file"
        done
        echo "✅ Файли адмінки видалено"
    fi
else
    echo "✅ Файли адмінки не знайдено в TypeScript/JavaScript файлах"
fi

# Перевірка layout.tsx
echo ""
echo "🔍 Перевірка layout.tsx..."
LAYOUT_FILES=$(find "$MAIN_SITE_DIR" -name "layout.tsx" -type f 2>/dev/null)

if [ -n "$LAYOUT_FILES" ]; then
    echo "$LAYOUT_FILES" | while read layout_file; do
        if grep -q "ThemeProvider\|SidebarProvider" "$layout_file" 2>/dev/null; then
            echo "❌ Знайдено layout.tsx з адмінкою: $layout_file"
            echo "   Створюю резервну копію..."
            cp "$layout_file" "${layout_file}.backup.$(date +%Y%m%d_%H%M%S)"
            
            echo "   Видаляю ThemeProvider та SidebarProvider..."
            # Видаляємо імпорти
            sed -i '/ThemeProvider/d; /SidebarProvider/d' "$layout_file"
            sed -i '/from.*ThemeContext/d; /from.*SidebarContext/d' "$layout_file"
            
            # Видаляємо обгортки
            sed -i 's/<ThemeProvider>//g; s/<\/ThemeProvider>//g' "$layout_file"
            sed -i 's/<SidebarProvider>//g; s/<\/SidebarProvider>//g' "$layout_file"
            
            echo "✅ layout.tsx виправлено"
        fi
    done
else
    echo "✅ layout.tsx не знайдено"
fi

# Перевірка page.tsx в корені
echo ""
echo "🔍 Перевірка page.tsx..."
ROOT_PAGE=""
if [ -f "$MAIN_SITE_DIR/app/page.tsx" ]; then
    ROOT_PAGE="$MAIN_SITE_DIR/app/page.tsx"
elif [ -f "$MAIN_SITE_DIR/src/app/page.tsx" ]; then
    ROOT_PAGE="$MAIN_SITE_DIR/src/app/page.tsx"
fi

if [ -n "$ROOT_PAGE" ]; then
    if grep -q "dashboard\|router.push.*dashboard" "$ROOT_PAGE" 2>/dev/null; then
        echo "❌ page.tsx перенаправляє на dashboard (це адмінка!)"
        echo "   Створюю резервну копію..."
        cp "$ROOT_PAGE" "${ROOT_PAGE}.backup.$(date +%Y%m%d_%H%M%S)"
        
        echo "   Видаляю перенаправлення на dashboard..."
        # Замінюємо на простий контент
        cat > "$ROOT_PAGE" << 'EOF'
export default function Home() {
  return (
    <div>
      <h1>For You Real Estate</h1>
      <p>Main site content</p>
    </div>
  )
}
EOF
        echo "✅ page.tsx виправлено"
    else
        echo "✅ page.tsx не містить перенаправлення на dashboard"
    fi
else
    echo "✅ page.tsx не знайдено в корені"
fi

# Перевірка чи це симлінк на адмінку
echo ""
echo "🔍 Перевірка симлінків..."
if [ -L "$MAIN_SITE_DIR" ]; then
    TARGET=$(readlink -f "$MAIN_SITE_DIR")
    echo "   $MAIN_SITE_DIR є симлінком на: $TARGET"
    
    if [[ "$TARGET" == *"admin"* ]] || [[ "$TARGET" == "$ADMIN_PANEL_DIR"* ]]; then
        echo "❌ Симлінк вказує на адмінку!"
        read -p "Видалити симлінк? (yes/no): " CONFIRM
        if [ "$CONFIRM" = "yes" ]; then
            rm -f "$MAIN_SITE_DIR"
            echo "✅ Симлінк видалено"
            echo "   Створіть правильну директорію для основного сайту"
        fi
    fi
fi

# Перевірка nginx конфігурації
echo ""
echo "🔍 Перевірка nginx конфігурації..."
if [ -f "/etc/nginx/sites-available/foryou-realestate.com" ]; then
    if grep -q "proxy_pass.*3001" "/etc/nginx/sites-available/foryou-realestate.com" 2>/dev/null; then
        echo "❌ Nginx проксує на порт 3001 (адмінка!)"
        echo "   Використайте скрипт: deploy/fix-admin-on-main-domain.sh"
    fi
fi

echo ""
echo "✅ Виправлення завершено!"
echo ""
echo "📋 Наступні кроки:"
echo "   1. Перевірте вміст $MAIN_SITE_DIR"
echo "   2. Завантажте правильний код основного сайту (якщо потрібно)"
echo "   3. Переконайтеся, що nginx не проксує на порт 3001"
echo "   4. Перезапустіть nginx: systemctl restart nginx"
echo ""
echo "💾 Резервна копія: $BACKUP_DIR"
