import { DataSource } from 'typeorm';
import dotenv from 'dotenv';
import { entities } from '../entities';

dotenv.config();

// Використовуємо прямі імпорти entities замість glob patterns
// Це більш надійно працює в production
const isProduction = process.env.NODE_ENV === 'production';
const migrationsPath = isProduction ? ['dist/migrations/**/*.js'] : ['src/migrations/**/*.ts'];

// ForYou Admin Panel - use foryou_admin_panel in production, admin_panel locally
const FORYOU_DATABASE_URL = 'postgresql://admin:WL273wUVrfbOqgUNhMhr@for-you-admin-panel-postgres-prod:5432/foryou_admin_panel';
const envDatabaseUrl = process.env.DATABASE_URL || FORYOU_DATABASE_URL;
// In development/local, use admin_panel. In production, use foryou_admin_panel
const isLocal = process.env.NODE_ENV !== 'production' && (envDatabaseUrl.includes('localhost') || envDatabaseUrl.includes('127.0.0.1'));
const finalDatabaseUrl = isLocal
  ? envDatabaseUrl // Use as-is for local (admin_panel)
  : envDatabaseUrl.includes('/admin_panel') 
    ? envDatabaseUrl.replace('/admin_panel', '/foryou_admin_panel')
    : envDatabaseUrl.includes('/foryou_admin_panel')
      ? envDatabaseUrl
      : FORYOU_DATABASE_URL;

export const AppDataSource = new DataSource({
  type: 'postgres',
  url: finalDatabaseUrl,
  synchronize: false, // Вимикаємо синхронізацію після створення таблиць
  logging: process.env.NODE_ENV === 'development',
  entities: entities, // Використовуємо масив класів напряму
  migrations: migrationsPath,
});

