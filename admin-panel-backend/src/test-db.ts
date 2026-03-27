import { AppDataSource } from './config/database';
import { Developer } from './entities/Developer';

async function test() {
  console.log('--- DB TEST START ---');
  try {
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
      console.log('✅ Connected');
    }
    const repo = AppDataSource.getRepository(Developer);
    console.log('Fetching first 5 developers...');
    const devs = await repo.find({ take: 5 });
    console.log('SUCCESS! Found:', devs.length);
    console.log('Sample:', JSON.stringify(devs[0], null, 2));
  } catch (err) {
    console.error('FAILED:', err);
  } finally {
    process.exit();
  }
}

test();
