import 'reflect-metadata';
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { AppDataSource } from './config/database';

// Routes
import authRoutes from './modules/admin/auth.routes';
import propertiesRoutes from './routes/properties.routes';
import settingsRoutes from './routes/settings.routes';
import coursesRoutes from './routes/courses.routes';
import newsRoutes from './routes/news.routes';
import supportRoutes from './routes/support.routes';
import usersRoutes from './modules/admin/users.routes';
import uploadRoutes from './routes/upload.routes';
import apiKeysRoutes from './modules/admin/api-keys.routes';
import publicRoutes from './modules/public/public.routes';
import collectionsRoutes from './routes/collections.routes';
import favoritesRoutes from './routes/favorites.routes';
import investmentsRoutes from './routes/investments.routes';
import courseProgressRoutes from './routes/course-progress.routes';
import notificationsRoutes from './routes/notifications.routes';
import documentsRoutes from './routes/documents.routes';
import amoCrmRoutes from './modules/admin/amo-crm.routes';
import leadsRoutes from './routes/leads.routes';
import analyticsRoutes from './modules/admin/analytics.routes';
import chatRoutes from './routes/chat.routes';
import portfolioRoutes from './routes/portfolio.routes';
import projectsRoutes from './routes/projects.routes';
import locationsRoutes from './routes/locations.routes';
import imagesRoutes from './routes/images.routes';
import vacanciesRoutes from './routes/vacancies.routes';
import enquiryRoutes from './modules/public/enquiry.routes';
import publicVacanciesRoutes from './modules/public/public-vacancies.routes';
import userActivityRoutes from './modules/admin/user-activity.routes';
import propertyFinderRoutes from './modules/admin/property-finder.routes';
import seoRoutes from './routes/seo.routes';
import seoSyncRoutes from './modules/admin/seo-sync.routes';
import landingV2Routes from './modules/public/landing-v2.routes';

import { AmoCrmService } from './services/amo-crm.service';
import { PropertyFinderService } from './services/property-finder.service';
import { autoRepairDatabase } from './utils/db-auto-repair';

dotenv.config();

import authorsRoutes from './routes/authors.routes';

const app = express();
const PORT = process.env.PORT || 4000;

// Middleware
// CORS для публічних ендпоінтів (дозволяє всі джерела, оскільки захищено через API key)
app.use(['/api/public', '/api/proxy/public'], cors({
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
app.use('/api/authors', authorsRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/settings/api-keys', apiKeysRoutes);
app.use('/api/courses', coursesRoutes);
app.use('/api/news', newsRoutes);
app.use('/api/support', supportRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/public/vacancies', publicVacanciesRoutes);
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
app.use('/api/locations', locationsRoutes);
app.use('/api/images', imagesRoutes);
app.use('/api/vacancies', vacanciesRoutes);
app.use('/api/user-activity', userActivityRoutes);
app.use('/api/property-finder', propertyFinderRoutes);
app.use('/api/seo', seoRoutes);
app.use('/api/seo-sync', seoSyncRoutes);
app.use('/api/v2/landing', landingV2Routes);


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
app.use('/api/v1/amo-crm', amoCrmRoutes);
app.use('/api/v1/projects', projectsRoutes);
app.use('/api/v1/locations', locationsRoutes);
app.use('/api/v1/user-activity', userActivityRoutes);

// Додаткові публічні ендпоінти для звернень
app.use('/api', enquiryRoutes);
app.use('/api/proxy', enquiryRoutes);
app.use('/api/v1', enquiryRoutes);

// Add /api/proxy prefix aliases for public access (used by main website)
app.use('/api/proxy/public', publicRoutes);
app.use('/api/proxy/user-activity', userActivityRoutes);
app.use('/api/proxy/properties', propertiesRoutes);
app.use('/api/proxy/amo-crm', amoCrmRoutes);
app.use('/api/proxy/news', newsRoutes);
app.use('/api/proxy/support', supportRoutes);
app.use('/api/proxy/locations', locationsRoutes);
app.use('/api/proxy/images', imagesRoutes);
app.use('/api/proxy/chat', chatRoutes);
app.use('/api/proxy/property-finder', propertyFinderRoutes);
app.use('/api/proxy/v1', (req, res, next) => {
  // Translate /api/proxy/v1/... to /api/v1/... internally ?
  // Or just use the routers with prefix
  next();
});

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
  .then(async () => {
    console.log('✅ Database connected (Public API)');

    console.log('📊 Database entities loaded');
    app.listen(PORT, () => {
      console.log(`🚀 Public website API running on http://localhost:${PORT}`);
      // Background syncs are now handled by server-admin.ts
    });
  })
  .catch((error) => {
    console.error('❌ Database connection failed (Public API):', error);
    // Be very careful about failing in production public API
    process.exit(1);
  });

