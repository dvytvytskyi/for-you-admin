# ✅ Виправлення AMO CRM Status Endpoint - Fallback на глобальні токени

## 🐛 Проблема

Токени зберігаються глобально (без `user_id`), а `GET /api/amo-crm/status` шукає токени тільки для користувача (`user.id`), тому не знаходить їх.

## ✅ Рішення

Оновлено `GET /api/amo-crm/status` - спочатку шукає токени для користувача, якщо немає - перевіряє глобальні токени (fallback).

## 🔧 Зміни

### Файл: `admin-panel-backend/src/routes/amo-crm.routes.ts`

#### 1. Додано імпорти:

```typescript
import { IsNull } from 'typeorm';
import { AppDataSource } from '../config/database';
import { AmoCrmToken } from '../entities/AmoCrmToken';
```

#### 2. Оновлено endpoint `GET /api/amo-crm/status`:

**Було:**
```typescript
router.get('/status', authenticateJWT, async (req: AuthRequest, res) => {
  const userId = req.user?.id;
  const status = await amoCrmService.getUserConnectionStatus(userId);
  return res.json(successResponse(status));
});
```

**Стало:**
```typescript
router.get('/status', authenticateJWT, async (req: AuthRequest, res) => {
  const userId = req.user?.id;
  const amoCrmTokenRepository = AppDataSource.getRepository(AmoCrmToken);
  
  // Спочатку шукаємо токени для користувача
  let token = await amoCrmTokenRepository.findOne({
    where: { userId: userId },
    order: { createdAt: 'DESC' },
  });
  
  // Якщо немає для користувача - перевіряємо глобальні (userId IS NULL)
  if (!token) {
    token = await amoCrmTokenRepository.findOne({
      where: { userId: IsNull() },
      order: { createdAt: 'DESC' },
    });
  }
  
  // Перевіряємо, чи токен валідний (не прострочений)
  const hasValidToken = token && token.expiresAt > new Date();
  
  const status = {
    connected: hasValidToken,
    hasTokens: !!token,
    domain: process.env.AMO_DOMAIN || '',
    accountId: process.env.AMO_ACCOUNT_ID || '',
  };
  
  return res.json(successResponse(status));
});
```

## 🔑 Ключові зміни

### 1. Fallback логіка

**Спочатку:** Шукає токени для користувача (`userId = user.id`)
**Потім:** Якщо немає - шукає глобальні токени (`userId IS NULL`)

### 2. Перевірка валідності токена

Перевіряємо, чи токен не прострочений (`token.expiresAt > new Date()`)

### 3. Статус відповіді

- `connected: true` - якщо є валідний токен (для користувача або глобальний)
- `hasTokens: true` - якщо є будь-який токен (навіть прострочений)
- `domain` та `accountId` - з environment variables

## ✅ Результат

Після оновлення:

1. ✅ Endpoint спочатку шукає токени для користувача
2. ✅ Якщо немає для користувача - перевіряє глобальні токени
3. ✅ Знаходить глобальні токени, якщо вони є
4. ✅ Повертає правильний статус підключення

## 🧪 Тестування

### Перевірка endpoint:

```bash
curl -X GET "https://admin.foryou-realestate.com/api/amo-crm/status" \
  -H "Authorization: Bearer <JWT_TOKEN>"
```

**Очікуваний результат:**
```json
{
  "success": true,
  "data": {
    "connected": true,
    "hasTokens": true,
    "domain": "reforyou.amocrm.ru",
    "accountId": "12345678"
  }
}
```

### Сценарії:

1. **Є токени для користувача:**
   - Знаходить токени для користувача
   - Повертає `connected: true`

2. **Немає токенів для користувача, але є глобальні:**
   - Не знаходить токени для користувача
   - Знаходить глобальні токени
   - Повертає `connected: true`

3. **Немає жодних токенів:**
   - Не знаходить токени для користувача
   - Не знаходить глобальні токени
   - Повертає `connected: false`

## 📝 Примітки

### Чому fallback на глобальні токени?

1. **Токени зберігаються глобально** - при callback токени зберігаються без `userId`
2. **Користувачі мають доступ** - всі користувачі можуть використовувати глобальні токени
3. **Зворотна сумісність** - працює з існуючими глобальними токенами

### Чому спочатку для користувача?

1. **Пріоритет** - токени для користувача мають вищий пріоритет
2. **Майбутнє** - якщо додамо user-specific токени, вони будуть використовуватися першими
3. **Гнучкість** - можна мати як глобальні, так і user-specific токени

---

**Останнє оновлення:** Січень 2025

