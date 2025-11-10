# 🚀 Гайд по оптимізації фронтенду для великої кількості проектів

## 📊 Поточна ситуація

- **Загальна кількість properties:** **51,955**
- **Off-plan properties:** **930**
- **Secondary properties:** **51,025**
- **Поточний limit на бекенді:** 100 (буде знято після реалізації оптимізації)

> ⚠️ **Важливо:** Бекенд зараз повертає максимум 100 проектів за один запит. Після реалізації оптимізацій на фронтенді, limit буде знято, і бекенд буде повертати стільки, скільки запитує фронтенд (20-50 за раз).

---

## 🎯 Стратегія оптимізації

Для роботи з 26+ тисячами проектів без перевантажень потрібно реалізувати:

1. **Infinite Scroll / Lazy Loading** (обов'язково)
2. **Virtual Scrolling** (рекомендовано)
3. **Debouncing для пошуку** (обов'язково)
4. **Кешування запитів** (рекомендовано)
5. **Оптимізація рендерингу** (обов'язково)

---

## 1️⃣ Infinite Scroll / Lazy Loading

### Концепція:
Завантажувати проекти порціями (наприклад, по 20-50) при скролі до кінця списку.

### Реалізація для Next.js/React:

```typescript
'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '@/lib/api';

export default function PropertiesList() {
  const [properties, setProperties] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [filters, setFilters] = useState({
    propertyType: 'off-plan',
    search: '',
    // інші фільтри
  });
  
  const itemsPerPage = 20; // Завантажуємо по 20 за раз
  const observerTarget = useRef<HTMLDivElement>(null);

  // Завантаження properties
  const loadProperties = useCallback(async (page: number, reset: boolean = false) => {
    if (loading) return;
    
    setLoading(true);
    try {
      const params: any = {
        ...filters,
        page: page.toString(),
        limit: itemsPerPage.toString(),
      };

      const { data } = await api.get('/properties', { params });
      
      if (data.data?.data && data.data?.pagination) {
        const newProperties = data.data.data;
        const pagination = data.data.pagination;
        
        if (reset) {
          setProperties(newProperties);
        } else {
          setProperties(prev => [...prev, ...newProperties]);
        }
        
        setHasMore(page < pagination.totalPages);
        setCurrentPage(page);
      }
    } catch (error) {
      console.error('Error loading properties:', error);
    } finally {
      setLoading(false);
    }
  }, [filters, loading, itemsPerPage]);

  // Завантаження при зміні фільтрів
  useEffect(() => {
    setProperties([]);
    setCurrentPage(1);
    setHasMore(true);
    loadProperties(1, true);
  }, [filters.propertyType, filters.search]);

  // Infinite scroll через Intersection Observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading) {
          loadProperties(currentPage + 1, false);
        }
      },
      { threshold: 0.1 }
    );

    const currentTarget = observerTarget.current;
    if (currentTarget) {
      observer.observe(currentTarget);
    }

    return () => {
      if (currentTarget) {
        observer.unobserve(currentTarget);
      }
    };
  }, [hasMore, loading, currentPage, loadProperties]);

  return (
    <div>
      {/* Список properties */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {properties.map((property) => (
          <PropertyCard key={property.id} property={property} />
        ))}
      </div>

      {/* Loading indicator */}
      {loading && (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-2 text-gray-500">Завантаження...</p>
        </div>
      )}

      {/* Intersection Observer target */}
      <div ref={observerTarget} className="h-10" />

      {/* End of list */}
      {!hasMore && properties.length > 0 && (
        <div className="text-center py-8 text-gray-500">
          Всі проекти завантажено ({properties.length} з {currentPage * itemsPerPage})
        </div>
      )}
    </div>
  );
}
```

### Переваги:
- ✅ Завантажує тільки те, що потрібно
- ✅ Плавний скрол без перевантажень
- ✅ Швидкий початковий рендер

---

## 2️⃣ Virtual Scrolling (для великих списків)

### Концепція:
Рендерити тільки видимі елементи в viewport.

### Використання бібліотеки `react-window`:

```bash
npm install react-window
```

```typescript
import { FixedSizeGrid } from 'react-window';

function VirtualizedPropertiesList({ properties }: { properties: any[] }) {
  const columnCount = 3; // 3 колонки
  const rowCount = Math.ceil(properties.length / columnCount);
  const itemHeight = 300; // Висота одного елемента

  const Cell = ({ columnIndex, rowIndex, style }: any) => {
    const index = rowIndex * columnCount + columnIndex;
    if (index >= properties.length) return null;

    return (
      <div style={style} className="p-2">
        <PropertyCard property={properties[index]} />
      </div>
    );
  };

  return (
    <FixedSizeGrid
      columnCount={columnCount}
      columnWidth={window.innerWidth / columnCount}
      height={600}
      rowCount={rowCount}
      rowHeight={itemHeight}
      width="100%"
    >
      {Cell}
    </FixedSizeGrid>
  );
}
```

### Переваги:
- ✅ Рендерить тільки видимі елементи
- ✅ Працює швидко навіть з 26+ тисячами
- ✅ Низьке споживання пам'яті

---

## 3️⃣ Debouncing для пошуку

### Концепція:
Затримка виконання пошуку на 300-500ms після останнього введення.

### Реалізація:

```typescript
import { useState, useEffect, useCallback } from 'react';
import { useDebounce } from '@/hooks/useDebounce'; // Створити хук

// Хук useDebounce
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

// Використання
function PropertiesSearch() {
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebounce(searchQuery, 500); // 500ms затримка
  const [filters, setFilters] = useState({});

  useEffect(() => {
    // Пошук виконується тільки після 500ms паузи
    setFilters(prev => ({ ...prev, search: debouncedSearch }));
  }, [debouncedSearch]);

  return (
    <input
      type="text"
      value={searchQuery}
      onChange={(e) => setSearchQuery(e.target.value)}
      placeholder="Пошук..."
    />
  );
}
```

### Переваги:
- ✅ Зменшує кількість запитів до API
- ✅ Плавний UX без "дергання"
- ✅ Економить ресурси сервера

---

## 4️⃣ Кешування запитів

### Концепція:
Зберігати результати запитів в пам'яті на 5-10 хвилин.

### Реалізація:

```typescript
// hooks/usePropertiesCache.ts
import { useState, useRef } from 'react';

interface CacheEntry {
  data: any[];
  pagination: any;
  timestamp: number;
}

const CACHE_TTL = 5 * 60 * 1000; // 5 хвилин

export function usePropertiesCache() {
  const cacheRef = useRef<Map<string, CacheEntry>>(new Map());

  const getCacheKey = (filters: any, page: number) => {
    return JSON.stringify({ ...filters, page });
  };

  const get = (filters: any, page: number) => {
    const key = getCacheKey(filters, page);
    const entry = cacheRef.current.get(key);
    
    if (entry && Date.now() - entry.timestamp < CACHE_TTL) {
      return entry;
    }
    
    return null;
  };

  const set = (filters: any, page: number, data: any[], pagination: any) => {
    const key = getCacheKey(filters, page);
    cacheRef.current.set(key, {
      data,
      pagination,
      timestamp: Date.now(),
    });
  };

  const clear = () => {
    cacheRef.current.clear();
  };

  return { get, set, clear };
}

// Використання
function PropertiesList() {
  const cache = usePropertiesCache();
  
  const loadProperties = async (page: number, filters: any) => {
    // Перевірка кешу
    const cached = cache.get(filters, page);
    if (cached) {
      return cached;
    }

    // Завантаження з API
    const result = await fetchProperties(page, filters);
    
    // Збереження в кеш
    cache.set(filters, page, result.properties, result.pagination);
    
    return result;
  };
}
```

### Переваги:
- ✅ Швидший відгук при повторних запитах
- ✅ Менше навантаження на сервер
- ✅ Кращий UX

---

## 5️⃣ Оптимізація рендерингу

### Концепція:
Мінімізувати перерендери та оптимізувати компоненти.

### Реалізація:

```typescript
// Використання React.memo для компонентів
const PropertyCard = React.memo(({ property }: { property: any }) => {
  return (
    <div className="property-card">
      {/* Ліниве завантаження зображень */}
      <img
        src={property.photos[0]}
        loading="lazy" // ✅ Lazy loading для зображень
        alt={property.name}
      />
      <h3>{property.name}</h3>
      {/* Інші дані */}
    </div>
  );
}, (prevProps, nextProps) => {
  // Перерендер тільки якщо змінився ID
  return prevProps.property.id === nextProps.property.id;
});

// Використання useMemo для обчислень
function PropertiesList({ properties }: { properties: any[] }) {
  const sortedProperties = useMemo(() => {
    return [...properties].sort((a, b) => 
      (a.price || a.priceFrom || 0) - (b.price || b.priceFrom || 0)
    );
  }, [properties]);

  return (
    <div>
      {sortedProperties.map(property => (
        <PropertyCard key={property.id} property={property} />
      ))}
    </div>
  );
}
```

### Оптимізації:
- ✅ `React.memo` для компонентів
- ✅ `useMemo` для обчислень
- ✅ `useCallback` для функцій
- ✅ `loading="lazy"` для зображень
- ✅ Уникати inline функцій в JSX

---

## 6️⃣ Комбіноване рішення (рекомендовано)

### Повний приклад з усіма оптимізаціями:

```typescript
'use client';
import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { api } from '@/lib/api';
import { useDebounce } from '@/hooks/useDebounce';
import { FixedSizeGrid } from 'react-window';

const ITEMS_PER_PAGE = 20;
const DEBOUNCE_DELAY = 500;

export default function OptimizedPropertiesList() {
  const [properties, setProperties] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [propertyType, setPropertyType] = useState<'off-plan' | 'secondary'>('off-plan');
  
  const debouncedSearch = useDebounce(searchQuery, DEBOUNCE_DELAY);
  const observerTarget = useRef<HTMLDivElement>(null);
  const cacheRef = useRef<Map<string, any>>(new Map());

  // Завантаження properties з кешуванням
  const loadProperties = useCallback(async (page: number, reset: boolean = false) => {
    if (loading) return;

    const cacheKey = `${propertyType}-${debouncedSearch}-${page}`;
    const cached = cacheRef.current.get(cacheKey);
    
    if (cached && !reset) {
      if (reset) {
        setProperties(cached.data);
      } else {
        setProperties(prev => [...prev, ...cached.data]);
      }
      setHasMore(page < cached.pagination.totalPages);
      setCurrentPage(page);
      return;
    }

    setLoading(true);
    try {
      const params: any = {
        propertyType,
        page: page.toString(),
        limit: ITEMS_PER_PAGE.toString(),
      };

      if (debouncedSearch) {
        params.search = debouncedSearch;
      }

      const { data } = await api.get('/properties', { params });
      
      if (data.data?.data && data.data?.pagination) {
        const newProperties = data.data.data;
        const pagination = data.data.pagination;
        
        // Кешування
        cacheRef.current.set(cacheKey, {
          data: newProperties,
          pagination,
        });

        if (reset) {
          setProperties(newProperties);
        } else {
          setProperties(prev => [...prev, ...newProperties]);
        }
        
        setHasMore(page < pagination.totalPages);
        setCurrentPage(page);
      }
    } catch (error) {
      console.error('Error loading properties:', error);
    } finally {
      setLoading(false);
    }
  }, [propertyType, debouncedSearch, loading]);

  // Скидання при зміні фільтрів
  useEffect(() => {
    setProperties([]);
    setCurrentPage(1);
    setHasMore(true);
    cacheRef.current.clear();
    loadProperties(1, true);
  }, [propertyType, debouncedSearch]);

  // Infinite scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading) {
          loadProperties(currentPage + 1, false);
        }
      },
      { threshold: 0.1 }
    );

    const currentTarget = observerTarget.current;
    if (currentTarget) {
      observer.observe(currentTarget);
    }

    return () => {
      if (currentTarget) {
        observer.unobserve(currentTarget);
      }
    };
  }, [hasMore, loading, currentPage, loadProperties]);

  // Мемоізація відсортованих properties
  const sortedProperties = useMemo(() => {
    return [...properties].sort((a, b) => {
      const priceA = a.price || a.priceFrom || 0;
      const priceB = b.price || b.priceFrom || 0;
      return priceA - priceB;
    });
  }, [properties]);

  return (
    <div className="space-y-4">
      {/* Пошук з debouncing */}
      <input
        type="text"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        placeholder="Пошук..."
        className="w-full p-2 border rounded"
      />

      {/* Фільтр по типу */}
      <div className="flex gap-2">
        <button
          onClick={() => setPropertyType('off-plan')}
          className={propertyType === 'off-plan' ? 'active' : ''}
        >
          Off-Plan
        </button>
        <button
          onClick={() => setPropertyType('secondary')}
          className={propertyType === 'secondary' ? 'active' : ''}
        >
          Secondary
        </button>
      </div>

      {/* Список properties */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {sortedProperties.map((property) => (
          <PropertyCard key={property.id} property={property} />
        ))}
      </div>

      {/* Loading */}
      {loading && (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
        </div>
      )}

      {/* Intersection Observer target */}
      <div ref={observerTarget} className="h-10" />

      {/* End message */}
      {!hasMore && properties.length > 0 && (
        <div className="text-center py-8 text-gray-500">
          Всі проекти завантажено ({properties.length})
        </div>
      )}
    </div>
  );
}

// Оптимізований компонент картки
const PropertyCard = React.memo(({ property }: { property: any }) => {
  return (
    <div className="border rounded-lg p-4 hover:shadow-lg transition-shadow">
      <img
        src={property.photos?.[0]}
        alt={property.name}
        loading="lazy"
        className="w-full h-48 object-cover rounded"
      />
      <h3 className="font-semibold mt-2">{property.name}</h3>
      <p className="text-gray-600">
        {property.price 
          ? `$${property.price.toLocaleString()}`
          : property.priceFrom 
            ? `From $${property.priceFrom.toLocaleString()}`
            : 'Price on request'}
      </p>
    </div>
  );
}, (prev, next) => prev.property.id === next.property.id);
```

---

## 📋 Чеклист реалізації

### Обов'язкові оптимізації:

- [ ] **Infinite Scroll** - завантаження при скролі
- [ ] **Debouncing** - затримка пошуку на 500ms
- [ ] **Lazy Loading зображень** - `loading="lazy"`
- [ ] **React.memo** - для компонентів карток
- [ ] **useMemo** - для обчислень
- [ ] **useCallback** - для функцій

### Рекомендовані оптимізації:

- [ ] **Virtual Scrolling** - для списків > 1000 елементів
- [ ] **Кешування** - зберігання результатів на 5 хвилин
- [ ] **Skeleton Loaders** - для кращого UX
- [ ] **Error Boundaries** - обробка помилок

---

## 🎯 Рекомендовані значення

- **Items per page:** 20-50 (не більше 100)
- **Debounce delay:** 300-500ms
- **Cache TTL:** 5-10 хвилин
- **Intersection Observer threshold:** 0.1 (10% видимості)

---

## 📊 Очікувані результати

Після реалізації:

- ✅ Початкове завантаження: ~20-50 проектів (швидко)
- ✅ Плавний скрол без лагів
- ✅ Мінімальне споживання пам'яті
- ✅ Швидкий пошук з debouncing
- ✅ Можна працювати з **51,955+ проектами** без перевантажень

---

## 🚀 Після реалізації

Після того, як ви реалізуєте оптимізації на фронтенді, зніміть limit на бекенді за інструкціями в файлі `REMOVE_LIMIT_INSTRUCTIONS.md`.

Бекенд буде повертати стільки, скільки запитує фронтенд (20-50 за раз).

---

## 📄 Додаткові файли

- `REMOVE_LIMIT_INSTRUCTIONS.md` - детальні інструкції для зняття limit після реалізації

---

**Готово до реалізації!** 🎉

