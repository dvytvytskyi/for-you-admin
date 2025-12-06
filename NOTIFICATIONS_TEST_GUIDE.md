# 🧪 Повний гайд тестування системи нотифікацій

## 📋 Передумови

Для повного тесту системи нотифікацій потрібно:

1. **Валідний admin token** (отримується через `/api/auth/login`)
2. **Користувачі з зареєстрованими пристроями** (таблиця `user_devices`)
3. **Налаштування сповіщень** (таблиця `notification_settings`)
4. **Expo Push Token або FCM Token** для тестування реальної відправки

---

## 🔑 Крок 1: Отримання Admin Token

### Варіант 1: Через cURL

```bash
curl -X POST https://admin.foryou-realestate.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@foryou-realestate.com",
    "password": "Admin123!"
  }'
```

**Очікувана відповідь:**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "490d14dc-0202-4d45-af75-adbb4ddc2fb3",
      "email": "admin@foryou-realestate.com",
      "role": "ADMIN",
      ...
    }
  }
}
```

### Варіант 2: Через JavaScript/Node.js

```javascript
const response = await fetch('https://admin.foryou-realestate.com/api/auth/login', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    email: 'admin@foryou-realestate.com',
    password: 'Admin123!'
  })
});

const data = await response.json();
const token = data.data.token;
console.log('Admin token:', token);
```

### Варіант 3: Через Postman/Insomnia

1. **Method:** POST
2. **URL:** `https://admin.foryou-realestate.com/api/auth/login`
3. **Headers:**
   - `Content-Type: application/json`
4. **Body (JSON):**
   ```json
   {
     "email": "admin@foryou-realestate.com",
     "password": "Admin123!"
   }
   ```

---

## 🧪 Крок 2: Тестування Endpoint `/api/notifications/send`

### Базовий тест (без реальних пристроїв)

```bash
TOKEN="your-admin-token-here"

curl -X POST https://admin.foryou-realestate.com/api/notifications/send \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "userIds": ["77500209-24c8-4985-8574-ae94c6583566"],
    "type": "system",
    "title": "Test Notification",
    "body": "This is a test notification from admin panel"
  }'
```

**Очікувана відповідь:**
```json
{
  "success": true,
  "message": "Сповіщення успішно відправлено",
  "data": {
    "sentTo": 1
  }
}
```

### Повний тест з усіма параметрами

```bash
TOKEN="your-admin-token-here"

curl -X POST https://admin.foryou-realestate.com/api/notifications/send \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "userIds": [
      "77500209-24c8-4985-8574-ae94c6583566",
      "another-user-id-here"
    ],
    "type": "new_property",
    "title": "Нова нерухомість",
    "body": "З'явилася нова нерухомість, яка може вас зацікавити",
    "data": {
      "propertyId": "123",
      "url": "/property/123"
    },
    "imageUrl": "https://picsum.photos/800/600"
  }'
```

---

## 📱 Крок 3: Підготовка даних для реального тесту

### 3.1. Створити налаштування сповіщень для користувача

```sql
-- Вставити налаштування сповіщень для користувача
INSERT INTO notification_settings (
  user_id,
  push_enabled,
  email_enabled,
  lead_created,
  lead_assigned,
  lead_status_changed,
  new_property,
  price_changed,
  new_exclusive_property,
  system,
  marketing
) VALUES (
  '77500209-24c8-4985-8574-ae94c6583566', -- user_id
  true,  -- push_enabled
  true,  -- email_enabled
  true,  -- lead_created
  true,  -- lead_assigned
  true,  -- lead_status_changed
  true,  -- new_property
  true,  -- price_changed
  true,  -- new_exclusive_property
  true,  -- system
  true   -- marketing
)
ON CONFLICT (user_id) DO UPDATE SET
  push_enabled = EXCLUDED.push_enabled,
  system = EXCLUDED.system;
```

### 3.2. Зареєструвати пристрій з Expo Push Token

```sql
-- Вставити пристрій з Expo Push Token
INSERT INTO user_devices (
  user_id,
  fcm_token,
  device_type,
  device_id,
  is_active,
  last_used_at
) VALUES (
  '77500209-24c8-4985-8574-ae94c6583566', -- user_id
  'ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]', -- Expo Push Token (замініть на реальний)
  'ios', -- або 'android'
  'device-unique-id-123',
  true,
  NOW()
);
```

**Як отримати Expo Push Token:**
1. Встановіть Expo Go на телефон
2. Запустіть мобільний додаток
3. Отримайте токен через `Notifications.getExpoPushTokenAsync()`
4. Скопіюйте токен у форматі `ExponentPushToken[...]`

### 3.3. Альтернатива: Використати тестовий Expo Push Token

Для тестування можна використати тестовий токен (не буде реально відправлено, але перевірить логіку):

```sql
INSERT INTO user_devices (
  user_id,
  fcm_token,
  device_type,
  is_active
) VALUES (
  '77500209-24c8-4985-8574-ae94c6583566',
  'ExponentPushToken[test-token-for-testing-only]',
  'ios',
  true
);
```

---

## 🔍 Крок 4: Перевірка результатів

### 4.1. Перевірити історію сповіщень

```sql
SELECT 
  id,
  user_id,
  type,
  title,
  body,
  is_sent,
  sent_at,
  created_at
FROM notification_history
WHERE user_id = '77500209-24c8-4985-8574-ae94c6583566'
ORDER BY created_at DESC
LIMIT 10;
```

### 4.2. Перевірити логи backend

```bash
ssh root@135.181.201.185
docker logs for-you-admin-panel-backend-prod --tail 50 | grep -i notification
```

Очікувані логи:
- `✅ Відправлено X сповіщень, Y помилок, Z невалідних токенів`
- `✅ Expo Push sent: X success, Y errors`

---

## 📝 Повний приклад тесту (Bash скрипт)

```bash
#!/bin/bash

# Кольори для виводу
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

BASE_URL="https://admin.foryou-realestate.com/api"
ADMIN_EMAIL="admin@foryou-realestate.com"
ADMIN_PASSWORD="Admin123!"

echo -e "${YELLOW}🔐 Отримую admin token...${NC}"
LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASSWORD\"}")

TOKEN=$(echo "$LOGIN_RESPONSE" | python3 -c "import sys, json; d=json.load(sys.stdin); print(d.get('data', {}).get('token', ''))" 2>/dev/null)

if [ -z "$TOKEN" ] || [ ${#TOKEN} -lt 20 ]; then
  echo -e "${RED}❌ Помилка отримання token${NC}"
  echo "$LOGIN_RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$LOGIN_RESPONSE"
  exit 1
fi

echo -e "${GREEN}✅ Token отримано: ${TOKEN:0:50}...${NC}"
echo ""

# Отримати user ID (перший не-ADMIN користувач)
echo -e "${YELLOW}👤 Отримую user ID...${NC}"
USER_ID="77500209-24c8-4985-8574-ae94c6583566" # Замініть на реальний ID

echo -e "${YELLOW}🧪 Відправляю тестове сповіщення...${NC}"
NOTIFICATION_RESPONSE=$(curl -s -X POST "$BASE_URL/notifications/send" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{
    \"userIds\": [\"$USER_ID\"],
    \"type\": \"system\",
    \"title\": \"Test Notification\",
    \"body\": \"This is a test notification from admin panel\",
    \"data\": {
      \"test\": true,
      \"timestamp\": $(date +%s)
    }
  }")

echo "$NOTIFICATION_RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$NOTIFICATION_RESPONSE"

SUCCESS=$(echo "$NOTIFICATION_RESPONSE" | python3 -c "import sys, json; d=json.load(sys.stdin); print(d.get('success', False))" 2>/dev/null)

if [ "$SUCCESS" = "True" ]; then
  echo -e "${GREEN}✅ Сповіщення успішно відправлено!${NC}"
else
  echo -e "${RED}❌ Помилка відправки сповіщення${NC}"
fi
```

---

## 🐛 Можливі проблеми та рішення

### Проблема 1: "Unauthorized: User not authenticated"

**Причина:** Невалідний або відсутній token

**Рішення:**
- Перевірте чи token правильно передається в заголовку
- Переконайтеся що token не застарів (дійсний 7 днів)
- Отримайте новий token через `/api/auth/login`

### Проблема 2: "Forbidden: Admin access required"

**Причина:** Користувач не має ролі ADMIN

**Рішення:**
- Використайте credentials адміністратора
- Перевірте роль користувача в БД:
  ```sql
  SELECT id, email, role FROM users WHERE email = 'admin@foryou-realestate.com';
  ```

### Проблема 3: "Немає користувачів з увімкненими сповіщеннями"

**Причина:** У користувача немає налаштувань сповіщень або вони вимкнені

**Рішення:**
- Створіть `notification_settings` для користувача (див. Крок 3.1)
- Переконайтеся що `push_enabled = true` і відповідний тип сповіщення увімкнено

### Проблема 4: "Немає активних пристроїв для відправки"

**Причина:** У користувача немає зареєстрованих пристроїв

**Рішення:**
- Зареєструйте пристрій в таблиці `user_devices` (див. Крок 3.2)
- Переконайтеся що `is_active = true`

### Проблема 5: "invalid input syntax for type uuid"

**Причина:** Передано невалідний UUID

**Рішення:**
- Використайте валідний UUID користувача
- Перевірте формат: `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`

---

## 📊 Типи сповіщень (NotificationType)

Доступні типи для поля `type`:

- `lead_created` - Створення заявки
- `lead_assigned` - Призначення заявки
- `lead_status_changed` - Зміна статусу заявки
- `new_property` - Нова нерухомість
- `price_changed` - Зміна ціни
- `new_exclusive_property` - Нова ексклюзивна нерухомість
- `system` - Системні сповіщення
- `marketing` - Маркетингові сповіщення

---

## ✅ Чеклист для повного тесту

- [ ] Отримано admin token через `/api/auth/login`
- [ ] Створено `notification_settings` для тестового користувача
- [ ] Зареєстровано пристрій з Expo Push Token в `user_devices`
- [ ] Відправлено тестове сповіщення через `/api/notifications/send`
- [ ] Перевірено історію в `notification_history`
- [ ] Перевірено логи backend на наявність помилок
- [ ] (Опціонально) Отримано реальне сповіщення на пристрої

---

## 🔗 Корисні команди

### Отримати список користувачів

```sql
SELECT id, email, role, status FROM users ORDER BY created_at DESC LIMIT 10;
```

### Перевірити налаштування сповіщень

```sql
SELECT 
  u.email,
  ns.push_enabled,
  ns.system,
  ns.new_property
FROM notification_settings ns
JOIN users u ON u.id = ns.user_id
WHERE u.id = '77500209-24c8-4985-8574-ae94c6583566';
```

### Перевірити зареєстровані пристрої

```sql
SELECT 
  u.email,
  ud.device_type,
  ud.is_active,
  LEFT(ud.fcm_token, 50) as token_preview
FROM user_devices ud
JOIN users u ON u.id = ud.user_id
WHERE u.id = '77500209-24c8-4985-8574-ae94c6583566';
```

---

**Останнє оновлення:** Грудень 2025

