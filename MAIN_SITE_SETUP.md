# 🌐 Інструкції для налаштування основного сайту

Ця інструкція описує, як налаштувати основний сайт (foryou-realestate.com) для використання API з адмінки з правильною пагінацією.

---

## 📋 Передумови

1. ✅ Адмінка працює на `https://admin.foryou-realestate.com`
2. ✅ API доступне на `https://admin.foryou-realestate.com/api`
3. ✅ У вас є API Key та API Secret для доступу до публічного API

---

## 🔑 Крок 1: Отримання API Key

### Варіант A: Через адмінку

1. Увійдіть в адмінку: `https://admin.foryou-realestate.com`
2. Перейдіть в **Integrations** → **API Keys**
3. Створіть новий API Key або використайте існуючий
4. Скопіюйте:
   - **API Key** (X-API-Key)
   - **API Secret** (X-API-Secret)

### Варіант B: Через API (якщо є доступ)

```bash
# Створення API Key через API (потрібен JWT токен адміна)
curl -X POST "https://admin.foryou-realestate.com/api/settings/api-keys" \
  -H "Authorization: Bearer YOUR_ADMIN_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Main Site API Key",
    "prefixes": ["public"]
  }'
```

---

## 🔧 Крок 2: Налаштування основного сайту

### Варіант A: Next.js / React сайт

#### 1. Створіть файл `.env.local` або `.env.production`:

```env
NEXT_PUBLIC_API_URL=https://admin.foryou-realestate.com/api
NEXT_PUBLIC_API_KEY=your_api_key_here
NEXT_PUBLIC_API_SECRET=your_api_secret_here
```

#### 2. Створіть API клієнт (`lib/api.ts`):

```typescript
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://admin.foryou-realestate.com/api';
const API_KEY = process.env.NEXT_PUBLIC_API_KEY;
const API_SECRET = process.env.NEXT_PUBLIC_API_SECRET;

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
    'X-API-Key': API_KEY,
    'X-API-Secret': API_SECRET,
  },
});

// Функція для отримання публічних даних
export const getPublicData = async () => {
  const { data } = await api.get('/public/data');
  return data.data;
};

// Функція для отримання properties з пагінацією
export const getProperties = async (params: {
  page?: number;
  limit?: number;
  propertyType?: 'off-plan' | 'secondary';
  search?: string;
  cityId?: string;
  areaId?: string;
  developerId?: string;
  bedrooms?: string;
  sizeFrom?: number;
  sizeTo?: number;
  priceFrom?: number;
  priceTo?: number;
}) => {
  const { data } = await api.get('/properties', { params });
  
  // Нова структура з пагінацією
  if (data.data?.data && data.data?.pagination) {
    return {
      properties: data.data.data,
      pagination: data.data.pagination,
    };
  }
  
  // Fallback для старої структури
  return {
    properties: data.data || [],
    pagination: {
      page: 1,
      limit: data.data?.length || 0,
      total: data.data?.length || 0,
      totalPages: 1,
    },
  };
};
```

#### 3. Використання в компоненті:

```typescript
'use client';
import { useState, useEffect } from 'react';
import { getProperties } from '@/lib/api';

export default function PropertiesPage() {
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const itemsPerPage = 20; // Або будь-яка інша кількість

  useEffect(() => {
    loadProperties();
  }, [currentPage]);

  const loadProperties = async () => {
    setLoading(true);
    try {
      const result = await getProperties({
        page: currentPage,
        limit: itemsPerPage,
        propertyType: 'off-plan', // або 'secondary'
      });
      
      setProperties(result.properties);
      setTotalPages(result.pagination.totalPages);
      setTotalCount(result.pagination.total);
    } catch (error) {
      console.error('Error loading properties:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {loading ? (
        <div>Loading...</div>
      ) : (
        <>
          <div>
            {properties.map((property) => (
              <div key={property.id}>
                <h3>{property.name}</h3>
                {/* Відображення property */}
              </div>
            ))}
          </div>
          
          {/* Пагінація */}
          <div>
            <button 
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              Previous
            </button>
            <span>Page {currentPage} of {totalPages} ({totalCount} total)</span>
            <button 
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >
              Next
            </button>
          </div>
        </>
      )}
    </div>
  );
}
```

---

### Варіант B: Статичний сайт (HTML/JS)

#### 1. Створіть файл `config.js`:

```javascript
const API_CONFIG = {
  baseURL: 'https://admin.foryou-realestate.com/api',
  apiKey: 'your_api_key_here',
  apiSecret: 'your_api_secret_here',
};
```

#### 2. Створіть файл `api.js`:

```javascript
async function fetchProperties(params = {}) {
  const queryParams = new URLSearchParams({
    page: params.page || 1,
    limit: params.limit || 20,
    ...params,
  });
  
  const url = `${API_CONFIG.baseURL}/properties?${queryParams}`;
  
  const response = await fetch(url, {
    headers: {
      'X-API-Key': API_CONFIG.apiKey,
      'X-API-Secret': API_CONFIG.apiSecret,
    },
  });
  
  const data = await response.json();
  
  // Нова структура з пагінацією
  if (data.data?.data && data.data?.pagination) {
    return {
      properties: data.data.data,
      pagination: data.data.pagination,
    };
  }
  
  // Fallback
  return {
    properties: data.data || [],
    pagination: {
      page: 1,
      limit: data.data?.length || 0,
      total: data.data?.length || 0,
      totalPages: 1,
    },
  };
}

// Використання
let currentPage = 1;
const itemsPerPage = 20;

async function loadProperties() {
  const result = await fetchProperties({
    page: currentPage,
    limit: itemsPerPage,
    propertyType: 'off-plan',
  });
  
  // Відображення properties
  displayProperties(result.properties);
  updatePagination(result.pagination);
}

function updatePagination(pagination) {
  document.getElementById('page-info').textContent = 
    `Page ${pagination.page} of ${pagination.totalPages} (${pagination.total} total)`;
}
```

---

## 🔒 Крок 3: Безпека API Key

### ⚠️ ВАЖЛИВО: Не зберігайте API Secret на фронтенді!

**Для публічного сайту:**

1. **Якщо використовуєте Next.js:**
   - API Key можна зберігати в `NEXT_PUBLIC_*` змінних (вони доступні на клієнті)
   - **НЕ** зберігайте API Secret на клієнті!
   - Створіть API Key **без Secret** або використовуйте тільки публічні endpoints

2. **Якщо використовуєте статичний сайт:**
   - API Key можна вставити в код (він публічний)
   - **НЕ** зберігайте API Secret!
   - Або створіть окремий API Key без Secret для публічного сайту

3. **Рекомендований підхід:**
   - Створіть окремий API Key для основного сайту
   - Налаштуйте обмеження (якщо підтримується)
   - Використовуйте тільки публічні endpoints (`/api/public/data`, `/api/properties`)

---

## 📡 Крок 4: Доступні API Endpoints

### 1. Публічні дані (всі дані одним запитом)

```javascript
// Отримати всі дані (properties, countries, cities, areas, developers, facilities)
const response = await fetch('https://admin.foryou-realestate.com/api/public/data', {
  headers: {
    'X-API-Key': 'your_api_key',
    'X-API-Secret': 'your_api_secret', // Тільки якщо Secret потрібен
  },
});

const data = await response.json();
// data.data.properties - масив всіх properties
// data.data.countries, cities, areas, developers, facilities
```

**⚠️ Увага:** Цей endpoint повертає **ВСІ** properties (26+ тисяч). Використовуйте тільки якщо потрібні всі дані для клієнтської фільтрації.

---

### 2. Properties з пагінацією (рекомендовано)

```javascript
// Отримати properties з пагінацією
const response = await fetch(
  'https://admin.foryou-realestate.com/api/properties?page=1&limit=20&propertyType=off-plan',
  {
    headers: {
      'X-API-Key': 'your_api_key',
    },
  }
);

const data = await response.json();

// Нова структура з пагінацією
if (data.data?.data && data.data?.pagination) {
  const properties = data.data.data;
  const pagination = data.data.pagination;
  
  console.log(`Page ${pagination.page} of ${pagination.totalPages}`);
  console.log(`Total: ${pagination.total} properties`);
  console.log(`Showing ${properties.length} properties`);
}
```

**Структура відповіді:**
```json
{
  "success": true,
  "data": {
    "data": [ /* масив properties */ ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 26543,
      "totalPages": 1328
    }
  }
}
```

---

### 3. Фільтрація Properties

```javascript
// Приклад з фільтрацією
const params = new URLSearchParams({
  page: 1,
  limit: 20,
  propertyType: 'off-plan',
  cityId: 'uuid-city-id',
  bedrooms: '2,3', // Multiselect
  priceFrom: 100000,
  priceTo: 500000,
  search: 'luxury',
});

const response = await fetch(
  `https://admin.foryou-realestate.com/api/properties?${params}`,
  {
    headers: {
      'X-API-Key': 'your_api_key',
    },
  }
);
```

**Доступні фільтри:**
- `propertyType`: `"off-plan"` | `"secondary"`
- `cityId`: UUID міста
- `areaId`: UUID району
- `developerId`: UUID девелопера
- `bedrooms`: `"1,2,3"` (multiselect)
- `sizeFrom`, `sizeTo`: розмір в sqm
- `priceFrom`, `priceTo`: ціна в USD
- `search`: текстовий пошук по назві та опису

---

## 🚀 Крок 5: Оптимізація

### 1. Кешування на клієнті

```javascript
// Простий кеш на 5 хвилин
const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 хвилин

async function getCachedProperties(params) {
  const cacheKey = JSON.stringify(params);
  const cached = cache.get(cacheKey);
  
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }
  
  const data = await fetchProperties(params);
  cache.set(cacheKey, {
    data,
    timestamp: Date.now(),
  });
  
  return data;
}
```

### 2. Lazy Loading / Infinite Scroll

```javascript
// Infinite scroll приклад
let currentPage = 1;
let isLoading = false;
let hasMore = true;

async function loadMoreProperties() {
  if (isLoading || !hasMore) return;
  
  isLoading = true;
  const result = await fetchProperties({
    page: currentPage,
    limit: 20,
  });
  
  appendProperties(result.properties);
  
  currentPage++;
  hasMore = currentPage <= result.pagination.totalPages;
  isLoading = false;
}

// Викликати при скролі до кінця
window.addEventListener('scroll', () => {
  if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 1000) {
    loadMoreProperties();
  }
});
```

---

## 🧪 Крок 6: Тестування

### Перевірка API Key

```bash
curl -X GET "https://admin.foryou-realestate.com/api/public/data" \
  -H "X-API-Key: your_api_key" \
  -H "X-API-Secret: your_api_secret"
```

### Перевірка пагінації

```bash
curl -X GET "https://admin.foryou-realestate.com/api/properties?page=1&limit=10" \
  -H "X-API-Key: your_api_key"
```

### Перевірка фільтрації

```bash
curl -X GET "https://admin.foryou-realestate.com/api/properties?propertyType=off-plan&cityId=uuid&page=1&limit=20" \
  -H "X-API-Key: your_api_key"
```

---

## 📝 Приклади коду

### React Hook для Properties

```typescript
import { useState, useEffect } from 'react';

export function useProperties(filters = {}) {
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 1,
  });
  const [error, setError] = useState(null);

  const loadProperties = async (page = 1) => {
    setLoading(true);
    setError(null);
    
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: pagination.limit.toString(),
        ...filters,
      });
      
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/properties?${params}`,
        {
          headers: {
            'X-API-Key': process.env.NEXT_PUBLIC_API_KEY || '',
          },
        }
      );
      
      const data = await response.json();
      
      if (data.data?.data && data.data?.pagination) {
        setProperties(data.data.data);
        setPagination(data.data.pagination);
      } else {
        setProperties(data.data || []);
      }
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProperties(1);
  }, [JSON.stringify(filters)]);

  return {
    properties,
    loading,
    error,
    pagination,
    loadPage: loadProperties,
    hasNext: pagination.page < pagination.totalPages,
    hasPrev: pagination.page > 1,
  };
}
```

**Використання:**
```typescript
function PropertiesList() {
  const { properties, loading, pagination, loadPage, hasNext, hasPrev } = useProperties({
    propertyType: 'off-plan',
    cityId: 'some-city-id',
  });

  return (
    <div>
      {loading ? (
        <div>Loading...</div>
      ) : (
        <>
          {properties.map(property => (
            <PropertyCard key={property.id} property={property} />
          ))}
          
          <div>
            <button onClick={() => loadPage(pagination.page - 1)} disabled={!hasPrev}>
              Previous
            </button>
            <span>Page {pagination.page} of {pagination.totalPages}</span>
            <button onClick={() => loadPage(pagination.page + 1)} disabled={!hasNext}>
              Next
            </button>
          </div>
        </>
      )}
    </div>
  );
}
```

---

## ✅ Чеклист налаштування

- [ ] Отримано API Key та Secret
- [ ] Налаштовано змінні оточення (API_URL, API_KEY)
- [ ] Реалізовано пагінацію на фронтенді
- [ ] Додано обробку помилок
- [ ] Додано loading states
- [ ] Протестовано різні фільтри
- [ ] Оптимізовано запити (кешування, debounce)
- [ ] Налаштовано CORS (якщо потрібно)

---

## 🆘 Troubleshooting

### Помилка: "Unauthorized" або 401

**Причина:** Неправильний API Key або відсутній Secret

**Рішення:**
- Перевірте правильність API Key
- Перевірте чи передається Secret (якщо потрібен)
- Перевірте headers: `X-API-Key` та `X-API-Secret`

---

### Помилка: "CORS" в браузері

**Причина:** CORS не налаштований на бекенді

**Рішення:**
- Зверніться до адміністратора для налаштування CORS
- Або використовуйте Next.js API routes як proxy

---

### Завантажуються всі properties замість пагінації

**Причина:** Не передаються параметри `page` та `limit`

**Рішення:**
- Перевірте чи передаються параметри в URL
- Перевірте структуру відповіді (має бути `data.data.data` та `data.data.pagination`)

---

## 📚 Додаткова документація

- **Повна API документація:** `API_DOCUMENTATION.md`
- **Схема Properties:** `PROPERTIES_API_SCHEMA.md`
- **API в адмінці:** `https://admin.foryou-realestate.com/integrations/docs`

---

**Останнє оновлення:** 2024-11-07

