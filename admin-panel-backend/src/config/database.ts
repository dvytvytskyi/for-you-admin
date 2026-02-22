import { DataSource } from 'typeorm';
import dotenv from 'dotenv';
import { entities } from '../entities';

dotenv.config();

// Використовуємо прямі імпорти entities замість glob patterns
// Це більш надійно працює в production
const isProduction = process.env.NODE_ENV === 'production';
const migrationsPath = isProduction ? ['dist/migrations/**/*.js'] : ['src/migrations/**/*.ts'];

// Default database URL (used if DATABASE_URL is not set in .env)
const DEFAULT_DATABASE_URL = 'postgresql://admin:admin123@admin-panel-db:5432/admin_panel';
const finalDatabaseUrl = process.env.DATABASE_URL || DEFAULT_DATABASE_URL;

export const AppDataSource = new DataSource({
  type: 'postgres',
  url: finalDatabaseUrl,
  synchronize: !isProduction, // Disable synchronization in production for stability
  logging: process.env.NODE_ENV === 'development',
  entities: entities,
  migrations: migrationsPath,
});

