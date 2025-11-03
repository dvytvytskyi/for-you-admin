import { AppDataSource } from '../config/database';
import * as fs from 'fs';
import * as path from 'path';

async function createApiKeysTable() {
  try {
    await AppDataSource.initialize();
    console.log('✅ Database connected');

    const migrationPath = path.join(__dirname, '../migrations/001-create-api-keys-table.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');

    await AppDataSource.query(migrationSQL);
    console.log('✅ API keys table created successfully');

    await AppDataSource.destroy();
    console.log('✅ Database connection closed');
  } catch (error: any) {
    console.error('❌ Error creating API keys table:', error);
    process.exit(1);
  }
}

createApiKeysTable();

