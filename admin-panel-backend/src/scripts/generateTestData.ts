import 'reflect-metadata';
import { AppDataSource } from '../config/database';
import { User, UserRole, UserStatus } from '../entities/User';
import { Property, PropertyType } from '../entities/Property';
import { Developer } from '../entities/Developer';
import { Area } from '../entities/Area';
import { City } from '../entities/City';
import { Country } from '../entities/Country';
import { News } from '../entities/News';
import { Course } from '../entities/Course';
import { Investment, InvestmentStatus } from '../entities/Investment';
import { Favorite } from '../entities/Favorite';
import { Collection } from '../entities/Collection';
import bcrypt from 'bcrypt';

const FIRST_NAMES = [
  'John', 'Emma', 'Michael', 'Sophia', 'William', 'Olivia', 'James', 'Isabella',
  'Alexander', 'Mia', 'Daniel', 'Charlotte', 'Matthew', 'Amelia', 'David', 'Harper',
  'Joseph', 'Evelyn', 'Andrew', 'Abigail', 'Ryan', 'Emily', 'Joshua', 'Elizabeth',
  'Christopher', 'Sofia', 'Anthony', 'Avery', 'Mark', 'Ella'
];

const LAST_NAMES = [
  'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis',
  'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Wilson', 'Anderson', 'Thomas', 'Taylor',
  'Moore', 'Jackson', 'Martin', 'Lee', 'Thompson', 'White', 'Harris', 'Sanchez',
  'Clark', 'Ramirez', 'Lewis', 'Robinson', 'Walker', 'Young'
];

const PROPERTY_NAMES = [
  'Luxury Marina Residences', 'Downtown Sky Tower', 'Palm Beach Villas', 'Business Bay Heights',
  'JBR Waterfront', 'Dubai Hills Estate', 'Arabian Ranches', 'Jumeirah Lakes Towers',
  'Dubai Marina Views', 'Palm Jumeirah Paradise', 'Downtown Elite', 'Business District Tower',
  'Marina Bay Residences', 'JLT Premium', 'Dubai Hills Luxury', 'Arabian Ranches Premium',
  'JBR Elite', 'Palm Jumeirah Luxury', 'Downtown Premium', 'Business Bay Elite'
];

const DEVELOPER_NAMES = [
  'Emaar Properties', 'Nakheel', 'Dubai Properties', 'Damac Properties', 'Sobha Realty',
  'Meraas', 'Aldar Properties', 'MAG Properties', 'Azizi Developments', 'Deyaar Properties'
];

const NEWS_TITLES = [
  'Dubai Real Estate Market Shows Strong Growth', 'New Luxury Development Launched in Dubai Marina',
  'Investment Opportunities in Off-Plan Properties', 'Dubai Property Prices Continue to Rise',
  'Expo 2020 Impact on Real Estate Market', 'New Residential Projects in Business Bay',
  'Dubai Real Estate Market Forecast 2024', 'Luxury Properties in High Demand',
  'Investment Guide for Dubai Properties', 'New Developments in Palm Jumeirah'
];

const COURSE_TITLES = [
  'Introduction to Dubai Real Estate', 'Investment Strategies for Properties',
  'Understanding Off-Plan Properties', 'Real Estate Market Analysis',
  'Property Management Basics', 'Legal Aspects of Real Estate',
  'Financing Your Property Purchase', 'Market Trends and Predictions'
];

async function generateTestData() {
  try {
    await AppDataSource.initialize();
    console.log('✅ Database connected');

    const userRepo = AppDataSource.getRepository(User);
    const propertyRepo = AppDataSource.getRepository(Property);
    const developerRepo = AppDataSource.getRepository(Developer);
    const areaRepo = AppDataSource.getRepository(Area);
    const cityRepo = AppDataSource.getRepository(City);
    const countryRepo = AppDataSource.getRepository(Country);
    const newsRepo = AppDataSource.getRepository(News);
    const courseRepo = AppDataSource.getRepository(Course);
    const investmentRepo = AppDataSource.getRepository(Investment);
    const favoriteRepo = AppDataSource.getRepository(Favorite);
    const collectionRepo = AppDataSource.getRepository(Collection);

    // 1. Створюємо тестових користувачів
    console.log('\n📝 Creating test users...');
    const defaultPassword = 'Test123!';
    const passwordHash = await bcrypt.hash(defaultPassword, 10);

    // CLIENT users
    const clients = [];
    for (let i = 1; i <= 10; i++) {
      const firstName = FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)];
      const lastName = LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)];
      const email = `client${i}@test.com`;
      const phone = `+380${Math.floor(100000000 + Math.random() * 900000000)}`;

      const existing = await userRepo.findOne({ where: { email } });
      if (!existing) {
        const user = userRepo.create({
          email,
          phone,
          passwordHash,
          firstName,
          lastName,
          role: UserRole.CLIENT,
          status: UserStatus.ACTIVE,
        });
        const saved = await userRepo.save(user);
        clients.push(saved);
        console.log(`  ✅ Created CLIENT: ${email}`);
      } else {
        clients.push(existing);
      }
    }

    // BROKER users
    const brokers = [];
    for (let i = 1; i <= 5; i++) {
      const firstName = FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)];
      const lastName = LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)];
      const email = `broker${i}@test.com`;
      const phone = `+380${Math.floor(100000000 + Math.random() * 900000000)}`;
      const licenseNumber = `BRK-${String(i).padStart(4, '0')}`;

      const existing = await userRepo.findOne({ where: { email } });
      if (!existing) {
        const user = userRepo.create({
          email,
          phone,
          passwordHash,
          firstName,
          lastName,
          role: UserRole.BROKER,
          status: i <= 3 ? UserStatus.ACTIVE : UserStatus.PENDING,
          licenseNumber,
        });
        const saved = await userRepo.save(user);
        brokers.push(saved);
        console.log(`  ✅ Created BROKER: ${email} (${saved.status})`);
      } else {
        brokers.push(existing);
      }
    }

    // INVESTOR users
    const investors = [];
    for (let i = 1; i <= 5; i++) {
      const firstName = FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)];
      const lastName = LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)];
      const email = `investor${i}@test.com`;
      const phone = `+380${Math.floor(100000000 + Math.random() * 900000000)}`;

      const existing = await userRepo.findOne({ where: { email } });
      if (!existing) {
        const user = userRepo.create({
          email,
          phone,
          passwordHash,
          firstName,
          lastName,
          role: UserRole.INVESTOR,
          status: i <= 3 ? UserStatus.ACTIVE : UserStatus.PENDING,
        });
        const saved = await userRepo.save(user);
        investors.push(saved);
        console.log(`  ✅ Created INVESTOR: ${email} (${saved.status})`);
      } else {
        investors.push(existing);
      }
    }

    // 2. Створюємо Developers
    console.log('\n📝 Creating developers...');
    const developers = [];
    for (const name of DEVELOPER_NAMES) {
      const existing = await developerRepo.findOne({ where: { name } });
      if (!existing) {
        const developer = developerRepo.create({
          name,
          description: `${name} is a leading real estate developer in Dubai, known for creating exceptional residential and commercial properties.`,
          logo: `https://via.placeholder.com/200x200?text=${encodeURIComponent(name)}`,
          images: [
            `https://via.placeholder.com/800x600?text=${encodeURIComponent(name + ' Project 1')}`,
            `https://via.placeholder.com/800x600?text=${encodeURIComponent(name + ' Project 2')}`
          ],
        });
        const saved = await developerRepo.save(developer);
        developers.push(saved);
        console.log(`  ✅ Created Developer: ${name}`);
      } else {
        developers.push(existing);
      }
    }

    // 3. Отримуємо або створюємо Country, City, Area
    console.log('\n📝 Setting up locations...');
    let country = await countryRepo.findOne({ where: { code: 'AE' } });
    if (!country) {
      country = await countryRepo.save({
        nameEn: 'United Arab Emirates',
        nameRu: 'Объединенные Арабские Эмираты',
        nameAr: 'الإمارات العربية المتحدة',
        code: 'AE',
      });
      console.log('  ✅ Created Country: UAE');
    }

    let city = await cityRepo.findOne({ where: { countryId: country.id, nameEn: 'Dubai' } });
    if (!city) {
      city = await cityRepo.save({
        countryId: country.id,
        nameEn: 'Dubai',
        nameRu: 'Дубай',
        nameAr: 'دبي',
      });
      console.log('  ✅ Created City: Dubai');
    }

    const areaNames = ['Downtown Dubai', 'Dubai Marina', 'Palm Jumeirah', 'Business Bay', 'JBR', 'JLT', 'Dubai Hills', 'Arabian Ranches'];
    const areas = [];
    for (const areaName of areaNames) {
      let area = await areaRepo.findOne({ where: { cityId: city.id, nameEn: areaName } });
      if (!area) {
        area = await areaRepo.save({
          cityId: city.id,
          nameEn: areaName,
          nameRu: areaName,
          nameAr: areaName,
        });
        console.log(`  ✅ Created Area: ${areaName}`);
      }
      areas.push(area);
    }

    // 4. Створюємо Properties
    console.log('\n📝 Creating properties...');
    const properties = [];
    for (let i = 0; i < 20; i++) {
      const propertyType = i < 10 ? PropertyType.OFF_PLAN : PropertyType.SECONDARY;
      const name = PROPERTY_NAMES[i] || `Property ${i + 1}`;
      const area = areas[Math.floor(Math.random() * areas.length)];
      const developer = developers[Math.floor(Math.random() * developers.length)];

      const baseProperty = {
        propertyType,
        name,
        photos: [
          `https://via.placeholder.com/1200x800?text=${encodeURIComponent(name + ' Photo 1')}`,
          `https://via.placeholder.com/1200x800?text=${encodeURIComponent(name + ' Photo 2')}`,
          `https://via.placeholder.com/1200x800?text=${encodeURIComponent(name + ' Photo 3')}`
        ],
        countryId: country.id,
        cityId: city.id,
        areaId: area.id,
        developerId: developer.id,
        latitude: 25.2048 + (Math.random() - 0.5) * 0.1,
        longitude: 55.2708 + (Math.random() - 0.5) * 0.1,
        description: `Beautiful ${propertyType} property in ${area.nameEn}. This stunning property offers modern amenities and luxurious living.`,
      };

      if (propertyType === PropertyType.OFF_PLAN) {
        const property = propertyRepo.create({
          ...baseProperty,
          priceFrom: Math.floor(500000 + Math.random() * 5000000),
          bedroomsFrom: Math.floor(1 + Math.random() * 2),
          bedroomsTo: Math.floor(3 + Math.random() * 3),
          bathroomsFrom: Math.floor(1 + Math.random() * 2),
          bathroomsTo: Math.floor(2 + Math.random() * 2),
          sizeFrom: Math.floor(500 + Math.random() * 1000),
          sizeTo: Math.floor(1500 + Math.random() * 2000),
          paymentPlan: '10% down payment, 90% on completion',
        });
        const saved = await propertyRepo.save(property);
        properties.push(saved);
        console.log(`  ✅ Created Property: ${name} (${propertyType})`);
      } else {
        const property = propertyRepo.create({
          ...baseProperty,
          price: Math.floor(500000 + Math.random() * 5000000),
          bedrooms: Math.floor(1 + Math.random() * 4),
          bathrooms: Math.floor(1 + Math.random() * 3),
          size: Math.floor(500 + Math.random() * 2000),
        });
        const saved = await propertyRepo.save(property);
        properties.push(saved);
        console.log(`  ✅ Created Property: ${name} (${propertyType})`);
      }
    }

    // 5. Створюємо News
    console.log('\n📝 Creating news...');
    for (let i = 0; i < 10; i++) {
      const title = NEWS_TITLES[i] || `News Article ${i + 1}`;
      const existing = await newsRepo.findOne({ where: { title } });
      if (!existing) {
        const news = newsRepo.create({
          title,
          description: `This is a brief description about ${title.toLowerCase()}. Full content about ${title.toLowerCase()}. This article provides detailed information about the topic.`,
          imageUrl: `https://via.placeholder.com/1200x600?text=${encodeURIComponent(title)}`,
          isPublished: i < 7,
          publishedAt: i < 7 ? new Date() : undefined,
        });
        await newsRepo.save(news);
        console.log(`  ✅ Created News: ${title}`);
      }
    }

    // 6. Створюємо Courses
    console.log('\n📝 Creating courses...');
    for (let i = 0; i < 8; i++) {
      const title = COURSE_TITLES[i] || `Course ${i + 1}`;
      const existing = await courseRepo.findOne({ where: { title } });
      if (!existing) {
        const course = courseRepo.create({
          title,
          description: `Learn about ${title.toLowerCase()} in this comprehensive course. This course covers all aspects of the topic and provides practical examples.`,
          order: i,
        });
        await courseRepo.save(course);
        console.log(`  ✅ Created Course: ${title}`);
      }
    }

    // 7. Створюємо Investments
    console.log('\n📝 Creating investments...');
    const activeInvestors = investors.filter(u => u.status === UserStatus.ACTIVE);
    const activeProperties = properties.filter(p => p.propertyType === PropertyType.OFF_PLAN);

    for (let i = 0; i < Math.min(15, activeInvestors.length * 3); i++) {
      const investor = activeInvestors[Math.floor(Math.random() * activeInvestors.length)];
      const property = activeProperties[Math.floor(Math.random() * activeProperties.length)];

      const existing = await investmentRepo.findOne({
        where: { userId: investor.id, propertyId: property.id }
      });

      if (!existing) {
        const propertyPrice = property.priceFrom || 1000000;
        const statuses = [InvestmentStatus.PENDING, InvestmentStatus.CONFIRMED, InvestmentStatus.COMPLETED];
        const investment = investmentRepo.create({
          userId: investor.id,
          propertyId: property.id,
          amount: Math.floor(propertyPrice * (0.1 + Math.random() * 0.3)), // 10-40% of property price
          status: statuses[Math.floor(Math.random() * statuses.length)],
          date: new Date(),
        });
        await investmentRepo.save(investment);
        console.log(`  ✅ Created Investment: ${investor.email} -> ${property.name}`);
      }
    }

    // 8. Створюємо Favorites
    console.log('\n📝 Creating favorites...');
    const activeUsers = [...clients, ...brokers.filter(b => b.status === UserStatus.ACTIVE), ...activeInvestors];

    for (let i = 0; i < Math.min(30, activeUsers.length * 3); i++) {
      const user = activeUsers[Math.floor(Math.random() * activeUsers.length)];
      const property = properties[Math.floor(Math.random() * properties.length)];

      const existing = await favoriteRepo.findOne({
        where: { userId: user.id, propertyId: property.id }
      });

      if (!existing) {
        const favorite = favoriteRepo.create({
          userId: user.id,
          propertyId: property.id,
        });
        await favoriteRepo.save(favorite);
        console.log(`  ✅ Created Favorite: ${user.email} -> ${property.name}`);
      }
    }

    // 9. Створюємо Collections
    console.log('\n📝 Creating collections...');
    for (let i = 0; i < 5; i++) {
      const user = activeUsers[Math.floor(Math.random() * activeUsers.length)];
      const collectionName = `My Collection ${i + 1}`;

      const existing = await collectionRepo.findOne({
        where: { userId: user.id, title: collectionName }
      });

      if (!existing) {
        const collection = collectionRepo.create({
          userId: user.id,
          title: collectionName,
          description: `A curated collection of properties by ${user.firstName} ${user.lastName}`,
        });
        const saved = await collectionRepo.save(collection);

        // Додаємо properties до collection
        const selectedProperties = properties.slice(i * 2, (i + 1) * 2);
        saved.properties = selectedProperties;
        await collectionRepo.save(saved);
        console.log(`  ✅ Created Collection: ${collectionName} by ${user.email} with ${selectedProperties.length} properties`);
      }
    }

    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('✅ ВСІ ТЕСТОВІ ДАНІ СТВОРЕНО!');
    console.log('');
    console.log('📊 Статистика:');
    console.log(`   👥 Користувачі: ${clients.length} CLIENT, ${brokers.length} BROKER, ${investors.length} INVESTOR`);
    console.log(`   🏢 Developers: ${developers.length}`);
    console.log(`   🏠 Properties: ${properties.length}`);
    console.log(`   📰 News: 10`);
    console.log(`   📚 Courses: 8`);
    console.log('');
    console.log('🔑 Тестові credentials (всі з паролем: Test123!):');
    console.log('   CLIENT: client1@test.com ... client10@test.com');
    console.log('   BROKER: broker1@test.com ... broker5@test.com');
    console.log('   INVESTOR: investor1@test.com ... investor5@test.com');
    console.log('═══════════════════════════════════════════════════════════');

    await AppDataSource.destroy();
    process.exit(0);
  } catch (error) {
    console.error('❌ Помилка:', error);
    await AppDataSource.destroy();
    process.exit(1);
  }
}

generateTestData();

