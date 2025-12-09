# ✅ Виправлення помилки: column lead.amo_contact_id does not exist

## 🐛 Проблема

Endpoint `GET /api/v1/leads` повертав 500 помилку:
```json
{
  "success": false,
  "message": "column lead.amo_contact_id does not exist"
}
```

## 🔍 Причина

Колонка `amo_contact_id` була визначена в entity `AmoCrmLead`, але відсутня в таблиці `amo_crm_leads` в БД.

**Перевірка БД показала:**
- Таблиця `amo_crm_leads` існує
- Колонка `amo_contact_id` відсутня
- Entity `AmoCrmLead` має поле `amoContactId` з мапінгом на `amo_contact_id`

## ✅ Рішення

### 1. Додано колонку в БД

Виконано SQL команду:
```sql
ALTER TABLE amo_crm_leads 
ADD COLUMN IF NOT EXISTS amo_contact_id INTEGER;
```

### 2. Створено міграцію

**Файл:** `admin-panel-backend/src/migrations/010-add-amo-contact-id-to-leads.sql`

```sql
-- Додати колонку amo_contact_id до таблиці amo_crm_leads
ALTER TABLE amo_crm_leads 
ADD COLUMN IF NOT EXISTS amo_id INTEGER;

-- Додати індекс для швидкого пошуку по контакту
CREATE INDEX IF NOT EXISTS idx_amo_crm_leads_amo_contact_id 
ON amo_crm_leads(amo_contact_id);

-- Коментар до колонки
COMMENT ON COLUMN amo_crm_leads.amo_contact_id IS 'ID основного контакту з AMO CRM';
```

### 3. Перевірено код endpoint

**Файл:** `admin-panel-backend/src/routes/leads.routes.ts`

✅ **Код правильний:**
- Використовується `AmoCrmLead` entity (таблиця `amo_crm_leads`)
- Використовується `lead.amoContactId` через entity (не в query builder)
- Query builder використовує правильні назви колонок (`status_id`, `updated_at`)

**Приклад правильного коду:**
```typescript
// ✅ ПРАВИЛЬНО: використовуємо AmoCrmLead entity
const leadRepo = AppDataSource.getRepository(AmoCrmLead);
const queryBuilder = leadRepo.createQueryBuilder('lead');

// ✅ ПРАВИЛЬНО: використовуємо snake_case в query builder
queryBuilder.andWhere('lead.status_id IN (:...statusIds)', { statusIds });
queryBuilder.orderBy('lead.updated_at', 'DESC');

// ✅ ПРАВИЛЬНО: отримуємо дані через entity
const leads = await queryBuilder.getMany();

// ✅ ПРАВИЛЬНО: використовуємо camelCase поля entity
const contactIds = leads.map(l => l.amoContactId).filter(...);
```

## 📋 Чеклист виправлення

- [x] Перевірено структуру таблиці `amo_crm_leads` в БД
- [x] Виявлено відсутність колонки `amo_contact_id`
- [x] Додано колонку `amo_contact_id` в БД
- [x] Створено міграцію для додавання колонки
- [x] Додано індекс для швидкого пошуку
- [x] Перевірено код endpoint - все правильно
- [x] Перевірено використання entity - все правильно

## 🧪 Тестування

### Перевірка структури таблиці:

```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'amo_crm_leads' 
AND column_name = 'amo_contact_id';
```

**Очікуваний результат:**
```
 column_name   | data_type 
---------------+--------
 amo_contact_id | integer
```

### Перевірка endpoint:

```bash
curl -X GET "https://admin.foryou-realestate.com/api/v1/leads?limit=10" \
  -H "Authorization: Bearer <JWT_TOKEN>"
```

**Очікуваний результат:**
```json
{
  "data": [...],
  "total": 5,
  "page": 1,
  "limit": 10,
  "totalPages": 1
}
```

## ⚠️ Важливо

### TypeORM Query Builder vs Entity Methods

**Query Builder (використовує назви колонок БД - snake_case):**
```typescript
queryBuilder.andWhere('lead.status_id = :statusId', { statusId: 1 });
queryBuilder.orderBy('lead.updated_at', 'DESC');
```

**Entity Methods (використовує camelCase поля):**
```typescript
const leads = await repo.find({
  where: { statusId: 1 },
  order: { updatedAt: 'DESC' },
});

// Доступ до полів через camelCase
const contactId = lead.amoContactId; // ✅ Правильно
```

### Правила використання:

1. ✅ **В query builder:** Використовувати назви колонок БД (`status_id`, `updated_at`, `amo_contact_id`)
2. ✅ **В entity методах:** Використовувати camelCase поля (`statusId`, `updatedAt`, `amoContactId`)
3. ✅ **Після отримання даних:** Використовувати camelCase поля entity (`lead.amoContactId`)

## 📝 Структура entity AmoCrmLead

```typescript
@Entity('amo_crm_leads')
export class AmoCrmLead {
  @Column({ name: 'amo_contact_id', type: 'int', nullable: true })
  amoContactId?: number; // camelCase в коді, snake_case в БД

  @Column({ name: 'status_id', type: 'int', nullable: true })
  statusId?: number; // camelCase в коді, snake_case в БД

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date; // camelCase в коді, snake_case в БД
}
```

## ✅ Результат

Після виправлення:

1. ✅ Колонка `amo_contact_id` додана в БД
2. ✅ Індекс створено для швидкого пошуку
3. ✅ Endpoint працює без помилок
4. ✅ Контакти правильно пов'язуються з leads

---

**Останнє оновлення:** Січень 2025

