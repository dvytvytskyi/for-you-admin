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

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

// Middleware
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static('uploads'));

// Routes
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
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Initialize database and start server
AppDataSource.initialize()
  .then(() => {
    console.log('✅ Database connected');
    app.listen(PORT, () => {
      console.log(`🚀 Admin Panel Backend running on http://localhost:${PORT}`);
    });
  })
  .catch((error) => {
    console.error('❌ Database connection failed:', error);
  });

