# Повна інструкція: Налаштування нотифікацій на бекенді (Express.js)

Ця інструкція описує, як додати функціональність відправки push-сповіщень з адмін-панелі на бекенді (Express.js).

---

## 📋 Передумови

Перед початком переконайтеся, що у вас є:

1. **Express.js проект** з TypeORM
2. **PostgreSQL база даних** з підключенням
3. **JWT Authentication** з middleware
4. **User entity** з ролями (ADMIN, BROKER, INVESTOR, CLIENT)

---

## 🎯 Що було додано

1. **Entities** для нотифікацій:
   - `UserDevice` (таблиця `user_devices`)
   - `NotificationSettings` (таблиця `notification_settings`)
   - `NotificationHistory` (таблиця `notification_history`) з enum `NotificationType`

2. **Services**:
   - `ExpoPushService` для роботи з Expo Push API
   - `NotificationsService` для відправки сповіщень

3. **Middleware**:
   - `requireAdmin` для перевірки ролі ADMIN

4. **Routes**:
   - `POST /api/notifications/send` (тільки для ADMIN)

---

## 📝 Створені файли

### Entities

1. **`admin-panel-backend/src/entities/UserDevice.ts`**
   - Зберігає інформацію про пристрої користувачів
   - Підтримує Expo Push Token та Firebase FCM Token

2. **`admin-panel-backend/src/entities/NotificationSettings.ts`**
   - Налаштування сповіщень для кожного користувача
   - Підтримує різні типи сповіщень

3. **`admin-panel-backend/src/entities/NotificationHistory.ts`**
   - Історія відправлених сповіщень
   - Enum `NotificationType` з типами сповіщень

### Services

1. **`admin-panel-backend/src/services/expo-push.service.ts`**
   - Відправка сповіщень через Expo Push API
   - Підтримка батчів до 100 токенів

2. **`admin-panel-backend/src/services/notifications.service.ts`**
   - Основний сервіс для відправки сповіщень
   - Автоматичне розділення Expo та FCM токенів
   - Збереження історії сповіщень

### Routes

1. **`admin-panel-backend/src/routes/notifications.routes.ts`**
   - Endpoint `POST /api/notifications/send` (тільки ADMIN)

### Middleware

1. **`admin-panel-backend/src/middleware/auth.ts`** (оновлено)
   - Додано `requireAdmin` middleware

---

## 🔧 Встановлення залежностей

Переконайтеся, що встановлено `axios`:

```bash
cd admin-panel-backend
npm install axios
```

Якщо `axios` вже встановлений, перейдіть до наступного кроку.

---

## 🗄️ Створення таблиць в базі даних

Після додавання entities, TypeORM автоматично створить таблиці при наступному запуску (якщо `synchronize: true` в конфігурації).

**АБО** створіть міграцію:

```bash
npm run migration:generate -- src/migrations/CreateNotificationTables
npm run migration:run
```

**АБО** виконайте SQL вручну:

```sql
-- Таблиця пристроїв користувачів
CREATE TABLE IF NOT EXISTS user_devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  fcm_token TEXT NOT NULL,
  device_type VARCHAR(50),
  device_id VARCHAR(255),
  is_active BOOLEAN DEFAULT true,
  last_used_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Таблиця налаштувань сповіщень
CREATE TABLE IF NOT EXISTS notification_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  push_enabled BOOLEAN DEFAULT true,
  email_enabled BOOLEAN DEFAULT true,
  lead_created BOOLEAN DEFAULT true,
  lead_assigned BOOLEAN DEFAULT true,
  lead_status_changed BOOLEAN DEFAULT true,
  new_property BOOLEAN DEFAULT true,
  price_changed BOOLEAN DEFAULT true,
  new_exclusive_property BOOLEAN DEFAULT true,
  system BOOLEAN DEFAULT true,
  marketing BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Enum для типів сповіщень
CREATE TYPE notification_type AS ENUM (
  'lead_created',
  'lead_assigned',
  'lead_status_changed',
  'new_property',
  'price_changed',
  'new_exclusive_property',
  'system',
  'marketing'
);

-- Таблиця історії сповіщень
CREATE TABLE IF NOT EXISTS notification_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type notification_type NOT NULL,
  title VARCHAR(255) NOT NULL,
  body TEXT NOT NULL,
  data JSONB,
  image_url TEXT,
  is_sent BOOLEAN DEFAULT false,
  sent_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Індекси для швидкого пошуку
CREATE INDEX IF NOT EXISTS idx_user_devices_user_id ON user_devices(user_id);
CREATE INDEX IF NOT EXISTS idx_user_devices_active ON user_devices(is_active);
CREATE INDEX IF NOT EXISTS idx_notification_history_user_id ON notification_history(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_history_type ON notification_history(type);
CREATE INDEX IF NOT EXISTS idx_notification_history_sent ON notification_history(is_sent);
```

---

## ⚙️ Налаштування .env (опціонально)

**Файл:** `admin-panel-backend/.env`

Додайте (опціонально для production):

```env
EXPO_ACCESS_TOKEN=your-expo-access-token
```

**Примітка:** 
- Expo Access Token не обов'язковий для розробки
- Рекомендується для production для забезпечення надійності та відстеження
- Отримати токен можна на https://expo.dev/accounts/[your-account]/settings/access-tokens

---

## ✅ Перевірка

Після виконання всіх кроків:

1. **Перезапустіть бекенд сервер**

```bash
npm run dev
```

2. **Протестуйте endpoint:**

**POST** `http://localhost:4000/api/notifications/send`

**Headers:**
```
Authorization: Bearer <admin-jwt-token>
Content-Type: application/json
```

**Body:**
```json
{
  "userIds": ["user-id-1", "user-id-2"],
  "type": "system",
  "title": "Нова нерухомість",
  "body": "З'явилася нова нерухомість, яка може вас зацікавити",
  "data": {
    "propertyId": "123",
    "url": "/property/123"
  },
  "imageUrl": "https://example.com/image.jpg"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "sentTo": 2
  },
  "message": "Сповіщення успішно відправлено"
}
```

---

## 🔧 Як це працює

1. **Адмінка** викликає `POST /api/notifications/send` з даними сповіщення
2. **Бекенд** перевіряє права доступу (тільки користувачі з роллю `ADMIN`)
3. **NotificationsService** відправляє сповіщення:
   - Якщо токен пристрою починається з `ExponentPushToken[` або `ExpoPushToken[` → використовує **Expo Push API**
   - Інакше (наприклад, Firebase FCM Token) → можна додати **Firebase Admin SDK** (зараз не реалізовано)
4. **Сповіщення** зберігаються в базі даних для історії кожного користувача
5. **Мобільний додаток** отримує сповіщення та показує їх

---

## 📋 Типи сповіщень (NotificationType)

Доступні типи сповіщень:

- `lead_created` - Створення заявки
- `lead_assigned` - Призначення заявки
- `lead_status_changed` - Зміна статусу заявки
- `new_property` - Нова нерухомість
- `price_changed` - Зміна ціни
- `new_exclusive_property` - Нова ексклюзивна нерухомість
- `system` - Системні сповіщення
- `marketing` - Маркетингові сповіщення

---

## ⚠️ Важливі примітки

1. **Endpoint доступний тільки для користувачів з роллю `ADMIN`**

2. **Сповіщення відправляються тільки користувачам з увімкненими push-сповіщеннями**

3. **Сповіщення зберігаються в історії для подальшого перегляду**

4. **Невалідні токени автоматично деактивуються**

5. **Expo Push API підтримує до 100 токенів в одному запиті** (обробка батчами вже реалізована)

6. **Firebase FCM підтримка**: Зараз не реалізована, але можна додати в `NotificationsService` (див. коментарі в коді)

---

## 🐛 Можливі проблеми

### Проблема: "Cannot find module 'axios'"

**Рішення:** Встановіть axios:

```bash
npm install axios
```

### Проблема: "Table 'user_devices' does not exist"

**Рішення:** Створіть таблиці в базі даних (див. розділ "Створення таблиць в базі даних")

### Проблема: "Forbidden: Admin access required"

**Рішення:** Переконайтеся, що користувач має ролю `ADMIN` в базі даних

### Проблема: "Немає активних пристроїв для відправки"

**Рішення:** Переконайтеся, що:
- Користувачі мають зареєстровані пристрої в таблиці `user_devices`
- Пристрої мають `is_active = true`
- Токени валідні (Expo Push Token або FCM Token)

---

## 📚 Додаткові ресурси

- [Expo Push Notifications API](https://docs.expo.dev/push-notifications/sending-notifications/)
- [Firebase Cloud Messaging](https://firebase.google.com/docs/cloud-messaging)
- [Express.js Documentation](https://expressjs.com/)

---

## 🔄 Наступні кроки (опціонально)

1. **Додати Firebase FCM підтримку**:
   - Встановити `firebase-admin`
   - Створити `FirebaseService`
   - Інтегрувати в `NotificationsService`

2. **Додати ендпоінти для управління пристроями**:
   - `POST /api/devices/register` - Реєстрація пристрою
   - `DELETE /api/devices/:id` - Видалення пристрою

3. **Додати ендпоінти для налаштувань сповіщень**:
   - `GET /api/notifications/settings` - Отримати налаштування
   - `PATCH /api/notifications/settings` - Оновити налаштування

4. **Додати ендпоінти для історії сповіщень**:
   - `GET /api/notifications/history` - Отримати історію сповіщень

---

**Останнє оновлення**: Грудень 2025

