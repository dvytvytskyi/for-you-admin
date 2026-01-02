
import { AppDataSource } from '../config/database';
import { AmoCrmUser } from '../entities/AmoCrmUser';

async function checkBrokers() {
  try {
    await AppDataSource.initialize();
    console.log('Database connected');

    const userRepo = AppDataSource.getRepository(AmoCrmUser);
    const brokers = await userRepo.find();
    
    console.log(`Found ${brokers.length} brokers/users from AmoCRM:`);
    brokers.forEach(broker => {
      console.log(`- ID: ${broker.amoUserId}, Name: ${broker.name}, Email: ${broker.email}, Active: ${broker.isActive}`);
    });

    await AppDataSource.destroy();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkBrokers();
