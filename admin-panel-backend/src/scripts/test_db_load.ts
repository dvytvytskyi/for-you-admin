import 'reflect-metadata';
import { AppDataSource } from './src/config/database';
import { Property } from './src/entities/Property';

async function testFetch() {
  await AppDataSource.initialize();
  const repo = AppDataSource.getRepository(Property);
  const property = await repo.findOne({
    where: { propertyType: 'secondary' as any },
    order: { createdAt: 'DESC' }
  });
  console.log('Property ID:', property?.id);
  console.log('externalId:', property?.externalId);
  console.log('Full object keys:', Object.keys(property || {}));
  await AppDataSource.destroy();
}

testFetch();
