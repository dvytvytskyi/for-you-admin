# ✅ Виправлення назв колонок в endpoint /api/v1/leads

## 🐛 Проблема

Endpoint `/api/v1/leads` використовував неправильні назви колонок у query builder:
- `lead.statusId` замість `lead.status_id`
- `lead.updatedAt` замість `lead.updated_at`

Це викликало помилку БД: `column lead.amo_contact_id does not exist` (або подібні помилки з іншими колонками).

## ✅ Рішення

Виправлено всі місця, де використовуються назви полів у query builder - тепер використовуються правильні назви колонок БД (snake_case).

### 1. Виправлено фільтр по статусу

**Було:**
```typescript
queryBuilder.andWhere('lead.statusId IN (:...statusIds)', { statusIds });
```

**Стало:**
```typescript
// Використовуємо правильну назву колонки в БД (status_id, не statusId)
queryBuilder.andWhere('lead.status_id IN (:...statusIds)', { statusIds });
```

### 2. Виправлено сортування

**Було:**
```typescript
.orderBy('lead.updatedAt', 'DESC')
```

**Стало:**
```typescript
// Використовуємо правильну назву колонки в БД (updated_at, не updatedAt)
.orderBy('lead.updated_at', 'DESC')
```

## 🔑 Ключові зміни

### Чому використовувати назви колонок БД?

1. **TypeORM Query Builder** - керує SQL напряму, тому потрібно використовувати назви колонок БД
2. **Entity mapping** - TypeORM автоматично мапить camelCase поля на snake_case колонки тільки при використанні entity методів (`find`, `save`), але не в query builder
3. **SQL generation** - Query builder генерує SQL напряму, тому потрібні правильні назви колонок

### Правила використання:

- ✅ **В query builder:** Використовувати назви колонок БД (`status_id`, `updated_at`)
- ✅ **В entity методах:** Використовувати camelCase поля (`statusId`, `updatedAt`)
- ✅ **В TypeORM декораторах:** Використовувати назви колонок БД (`@Column({ name: 'status_id' })`)

## 📋 Структура entity AmoCrmLead

```typescript
@Entity('amo_crm_leads')
export class AmoCrmLead {
  @Column({ name: 'status_id', type: 'int', nullable: true })
  statusId?: number; // camelCase в коді, snake_case в БД

  @Column({ name: 'amo_contact_id', type: 'int', nullable: true })
  amoContactId?: number; // camelCase в коді, snake_case в БД

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date; // camelCase в коді, snake_case в БД
}
```

## ✅ Результат

Після виправлення:

1. ✅ Query builder використовує правильні назви колонок БД
2. ✅ Немає помилок типу "column does not exist"
3. ✅ Фільтрація по статусу працює коректно
4. ✅ Сортування працює коректно

## 🧪 Тестування

### Перевірка endpoint:

```bash
curl -X GET "https://admin.foryou-realestate.com/api/v1/leads?page=1&limit=10&status=NEW" \
  -H "Authorization: Bearer <JWT_TOKEN>"
```

**Очікуваний результат:**
```json
{
  "data": [...],
  "total": 100,
  "page": 1,
  "limit": 10,
  "totalPages": 10
}
```

### Сценарії:

1. **Без фільтрів:**
   - Повертає всі leads з правильним сортуванням по `updated_at`

2. **З фільтром по статусу:**
   - Фільтрує по `status_id` коректно
   - Повертає тільки leads з відповідним статусом

3. **З пагінацією:**
   - Працює коректно з правильним сортуванням

## 📝 Примітки

### TypeORM Query Builder vs Entity Methods

**Query Builder (потрібні назви колонок БД):**
```typescript
const queryBuilder = repo.createQueryBuilder('lead');
queryBuilder.andWhere('lead.status_id = :statusId', { statusId: 1 });
queryBuilder.orderBy('lead.updated_at', 'DESC');
```

**Entity Methods (використовуються camelCase поля):**
```typescript
const leads = await repo.find({
  where: { statusId: 1 },
  order: { updatedAt: 'DESC' },
});
```

### Мапінг назв

TypeORM автоматично мапить:
- `statusId` (entity) → `status_id` (БД) при використанні entity методів
- Але в query builder потрібно використовувати `status_id` напряму

---

**Останнє оновлення:** Січень 2025

