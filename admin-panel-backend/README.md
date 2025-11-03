# Admin Panel Backend

Express.js backend для управління контентом admin панелі.

## Setup

1. Створіть `.env` з `.env.example`:
```bash
cp .env.example .env
```

2. Увімкніть Docker і запустіть admin-panel-db:
```bash
docker-compose up -d admin-panel-db
```

3. Встановіть залежності:
```bash
npm install
```

4. Запустіть dev сервер:
```bash
npm run dev
```

Сервер буде доступний на `http://localhost:4000`

## API Endpoints

### Auth
- `POST /api/auth/login` - Авторизація адміна

### Properties
- `GET /api/properties` - Список властивостей
- `GET /api/properties/:id` - Деталі властивості
- `POST /api/properties` - Створити властивість
- `PATCH /api/properties/:id` - Оновити властивість
- `DELETE /api/properties/:id` - Видалити властивість

### Settings
- `GET /api/settings/countries` - Список країн
- `GET /api/settings/cities?countryId=X` - Список міст
- `GET /api/settings/areas?cityId=X` - Список районів
- `GET /api/settings/facilities` - Список зручностей
- `POST /api/settings/facilities` - Створити зручність
- `GET /api/settings/developers` - Список девелоперів
- `POST /api/settings/developers` - Створити девелопера

### Courses (Knowledge Base)
- `GET /api/courses` - Список курсів
- `GET /api/courses/:id` - Деталі курсу
- `POST /api/courses` - Створити курс
- `PATCH /api/courses/:id` - Оновити курс
- `DELETE /api/courses/:id` - Видалити курс

### News
- `GET /api/news` - Список новин
- `GET /api/news/:id` - Деталі новини
- `POST /api/news` - Створити новину
- `PATCH /api/news/:id` - Оновити новину
- `DELETE /api/news/:id` - Видалити новину

### Support
- `GET /api/support` - Список запитів
- `GET /api/support/:id` - Деталі запиту
- `POST /api/support` - Створити запит
- `POST /api/support/:id/responses` - Додати відповідь
- `PATCH /api/support/:id/status` - Оновити статус

### Upload
- `POST /api/upload/image` - Завантажити одне зображення
- `POST /api/upload/images` - Завантажити кілька зображень

## Authentication

### Для Admin Panel Frontend:
Використовуйте JWT токен в headers:
```
Authorization: Bearer <token>
```

### Для Main Backend:
Використовуйте API Key в headers:
```
X-API-Key: your-secure-api-key-for-main-backend
```

## Структура проекту

```
admin-panel-backend/
├── src/
│   ├── entities/        # TypeORM entities
│   ├── routes/          # Express routes
│   ├── config/          # Database config
│   ├── middleware/      # Auth middleware
│   ├── utils/           # Helpers
│   ├── seeds/           # Seed scripts
│   └── server.ts        # Main entry point
├── uploads/             # Завантажені файли
└── .env                 # Environment variables
```

## Database

База даних: PostgreSQL на порті 5435

Connection string: `postgresql://admin:admin123@localhost:5435/admin_panel`

## Deployment

Build:
```bash
npm run build
```

Start:
```bash
npm start
```

