import 'reflect-metadata';
import { AppDataSource } from './src/config/database';
import { Property } from './src/entities/Property';

async function checkType() {
  try {
    await AppDataSource.initialize();
    const repo = AppDataSource.getRepository(Property);
    const p = await repo.findOne({ where: { name: 'Riviera 56' } });
    if (p) {
      console.log('Type of p.photos:', typeof p.photos);
      console.log('Is p.photos an array?', Array.isArray(p.photos));
      console.log('Content of p.photos:', p.photos);
    }
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}

checkType();
