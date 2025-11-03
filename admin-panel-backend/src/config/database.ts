import { DataSource } from 'typeorm';
import dotenv from 'dotenv';
import { entities } from '../entities';

dotenv.config();

// Використовуємо прямі імпорти entities замість glob patterns
// Це більш надійно працює в production
const isProduction = process.env.NODE_ENV === 'production';
const migrationsPath = isProduction ? ['dist/migrations/**/*.js'] : ['src/migrations/**/*.ts'];

export const AppDataSource = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  synchronize: false, // Вимикаємо синхронізацію, щоб уникнути конфліктів
  logging: process.env.NODE_ENV === 'development',
  entities: entities, // Використовуємо масив класів напряму
  migrations: migrationsPath,
});

