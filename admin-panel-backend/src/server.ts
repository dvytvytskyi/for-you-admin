import 'reflect-metadata';
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { AppDataSource } from './config/database';

// Routes
import authRoutes from './routes/auth.routes';
import propertiesRoutes from './routes/properties.routes';
import settingsRoutes from './routes/settings.routes';
import coursesRoutes from './routes/courses.routes';
import newsRoutes from './routes/news.routes';
import supportRoutes from './routes/support.routes';
import usersRoutes from './routes/users.routes';
import uploadRoutes from './routes/upload.routes';
import apiKeysRoutes from './routes/api-keys.routes';
import publicRoutes from './routes/public.routes';
import collectionsRoutes from './routes/collections.routes';
import favoritesRoutes from './routes/favorites.routes';
import investmentsRoutes from './routes/investments.routes';
import courseProgressRoutes from './routes/course-progress.routes';
import notificationsRoutes from './routes/notifications.routes';
import documentsRoutes from './routes/documents.routes';
import amoCrmRoutes from './routes/amo-crm.routes';
import leadsRoutes from './routes/leads.routes';
import analyticsRoutes from './routes/analytics.routes';
import chatRoutes from './routes/chat.routes';
import portfolioRoutes from './routes/portfolio.routes';
import projectsRoutes from './routes/projects.routes';
import { AmoCrmService } from './services/amo-crm.service';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

// Middleware
// CORS для публічних ендпоінтів (дозволяє всі джерела, оскільки захищено через API key)
app.use('/api/public', cors({
  origin: '*', // Дозволяємо всі джерела для публічних API
  methods: ['GET', 'OPTIONS'],
  allowedHeaders: ['x-api-key', 'x-api-secret', 'Content-Type', 'Authorization'],
  credentials: false,
}));

// CORS для інших ендпоінтів
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static('uploads'));

// Routes (без префіксу v1 для сумісності з адмін панеллю)
app.use('/api/auth', authRoutes);
app.use('/api/properties', propertiesRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/settings/api-keys', apiKeysRoutes);
app.use('/api/courses', coursesRoutes);
app.use('/api/news', newsRoutes);
app.use('/api/support', supportRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/public', publicRoutes);
app.use('/api/collections', collectionsRoutes);
app.use('/api/favorites', favoritesRoutes);
app.use('/api/investments', investmentsRoutes);
app.use('/api/course-progress', courseProgressRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/documents', documentsRoutes);
app.use('/api/amo-crm', amoCrmRoutes);
app.use('/api/v1/leads', leadsRoutes);
app.use('/api/v1/analytics', analyticsRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/v1/chat', chatRoutes);
app.use('/api/portfolio', portfolioRoutes);
app.use('/api/v1/portfolio', portfolioRoutes);

// Routes з префіксом /v1 для мобільного додатку
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/properties', propertiesRoutes);
app.use('/api/v1/settings', settingsRoutes);
app.use('/api/v1/support', supportRoutes);
app.use('/api/v1/users', usersRoutes);
app.use('/api/v1/upload', uploadRoutes);
app.use('/api/v1/public', publicRoutes);
app.use('/api/v1/collections', collectionsRoutes);
app.use('/api/v1/favorites', favoritesRoutes);
app.use('/api/v1/investments', investmentsRoutes);
app.use('/api/v1/course-progress', courseProgressRoutes);
app.use('/api/v1/notifications', notificationsRoutes);
app.use('/api/v1/documents', documentsRoutes);
app.use('/api/v1/amo-crm', amoCrmRoutes);
app.use('/api/v1/projects', projectsRoutes);

// Root route
app.get('/', (req, res) => {
  res.json({
    message: 'Admin Panel Backend API',
    status: 'running',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      api: '/api'
    }
  });
});

// Health check
app.get('/health', (req, res) => {
  const dbStatus = AppDataSource.isInitialized ? 'connected' : 'disconnected';
  res.json({
    status: 'ok',
    database: dbStatus,
    timestamp: new Date().toISOString()
  });
});

// Initialize database and start server
AppDataSource.initialize()
  .then(() => {
    console.log('✅ Database connected');
    console.log('📊 Database entities loaded');
    app.listen(PORT, () => {
      console.log(`🚀 Admin Panel Backend running on http://localhost:${PORT}`);

      // Start background CRM sync (every 60 seconds)
      setInterval(async () => {
        try {
          const service = new AmoCrmService();
          await service.syncRecentLeads(5); // Sync leads updated in last 5 minutes
        } catch (error) {
          console.error('[Background Sync] Error:', error);
        }
      }, 60000);
    });
  })
  .catch((error) => {
    console.error('❌ Database connection failed:', error);
    console.error('Error details:', error.message);
    if (error.stack) {
      console.error('Stack trace:', error.stack);
    }
    // Запускаємо сервер навіть якщо БД не підключилась, щоб бачити помилки
    app.listen(PORT, () => {
      console.log(`⚠️  Admin Panel Backend running WITHOUT database on http://localhost:${PORT}`);
      console.log('⚠️  API will return errors until database is connected');
    });
  });

