
import { AppDataSource } from '../config/database';
import { News } from '../entities/News';
import { NewsContent, NewsContentType } from '../entities/NewsContent';
import { Course } from '../entities/Course';
import { CourseContent, ContentType } from '../entities/CourseContent';
import { CourseLink } from '../entities/CourseLink';

async function seed() {
    console.log('🌱 Starting seed...');

    try {
        if (!AppDataSource.isInitialized) {
            await AppDataSource.initialize();
            console.log('✅ Database connected');
        }

        // --- SEED NEWS ---
        const newsRepo = AppDataSource.getRepository(News);

        console.log('📝 Seeding News...');

        const newsItems = [
            {
                title: 'Dubai Real Estate Market Report Q4 2025',
                description: 'A comprehensive analysis of the property market trends in Dubai for the last quarter of 2025.',
                imageUrl: 'https://res.cloudinary.com/demo/image/upload/v1312461204/sample.jpg',
                publishedAt: new Date(),
                isPublished: true,
                contents: [
                    { type: NewsContentType.TEXT, title: 'Market Overview', description: 'The market has shown resilience with a 5% increase in transaction volume...', order: 1 },
                    { type: NewsContentType.IMAGE, title: 'Growth Chart', imageUrl: 'https://res.cloudinary.com/demo/image/upload/v1312461204/sample.jpg', order: 2 },
                    { type: NewsContentType.TEXT, title: 'Outlook for 2026', description: 'Experts predict a steady growth trajectory...', order: 3 }
                ]
            },
            {
                title: 'New Luxury Project Launch in Palm Jumeirah',
                description: 'Introducing distinct waterfront living with our new exclusive project.',
                imageUrl: 'https://res.cloudinary.com/demo/image/upload/v1312461204/sample.jpg',
                publishedAt: new Date(),
                isPublished: true,
                contents: [
                    { type: NewsContentType.TEXT, title: 'Project Details', description: 'Located on the crescent, this project features...', order: 1 }
                ]
            },
            {
                title: 'Updated Broker Commission Structure',
                description: 'Important updates regarding the commission tiers effectively immediately from Jan 1st.',
                imageUrl: 'https://res.cloudinary.com/demo/image/upload/v1312461204/sample.jpg',
                publishedAt: new Date(Date.now() - 86400000), // Yesterday
                isPublished: true,
                contents: [
                    { type: NewsContentType.TEXT, title: 'New Tiers', description: 'Tier 1: 2% (up to 5M sales)\nTier 2: 2.5% (5M+ sales)', order: 1 }
                ]
            },
            {
                title: 'Top 5 Investment Areas for 2026',
                description: 'Where to put your client\'s money for the best ROI next year.',
                imageUrl: 'https://res.cloudinary.com/demo/image/upload/v1312461204/sample.jpg',
                publishedAt: new Date(Date.now() - 172800000), // 2 days ago
                isPublished: true,
                contents: []
            },
            {
                title: 'Annual Gala Dinner Invitation',
                description: 'Join us for a night of celebration and networking at the Atlantis.',
                imageUrl: 'https://res.cloudinary.com/demo/image/upload/v1312461204/sample.jpg',
                publishedAt: new Date(Date.now() - 259200000), // 3 days ago
                isPublished: true,
                contents: []
            }
        ];

        for (const item of newsItems) {
            const exists = await newsRepo.findOne({ where: { title: item.title } });
            if (exists) {
                console.log(`ℹ️ News "${item.title}" already exists, skipping.`);
                continue;
            }

            const news = new News();
            news.title = item.title;
            news.description = item.description;
            news.imageUrl = item.imageUrl;
            news.publishedAt = item.publishedAt;
            news.isPublished = item.isPublished;

            news.contents = item.contents.map(c => {
                const content = new NewsContent();
                content.type = c.type;
                content.title = c.title;
                content.description = c.description || '';
                content.imageUrl = c.imageUrl || '';
                content.order = c.order;
                return content;
            });

            await newsRepo.save(news);
        }
        console.log('✅ News seeded/checked');

        // --- SEED COURSES ---
        const courseRepo = AppDataSource.getRepository(Course);
        const courseCount = await courseRepo.count();

        if (courseCount > 0) {
            console.log('ℹ️ Courses already exist, skipping courses seed.');
        } else {
            console.log('📝 Seeding Courses (Knowledge Base)...');

            const courses = [
                {
                    title: 'Broker Onboarding: Getting Started',
                    description: 'Essential guide for new brokers joining our platform. Learn the tools, policies, and culture.',
                    order: 1,
                    contents: [
                        { type: ContentType.TEXT, title: 'Company Values', description: 'We believe in transparency, integrity, and excellence.', order: 1 },
                        { type: ContentType.TEXT, title: 'Tools Overview', description: 'A walk-through of the CRM and Sales Dashboard.', order: 2 }
                    ],
                    links: [
                        { title: 'Download Employee Handbook', url: 'https://example.com/handbook.pdf', order: 1 }
                    ]
                },
                {
                    title: 'Sales Mastery: Closing HNW Clients',
                    description: 'Advanced techniques for negotiating with and closing High Net Worth individuals.',
                    order: 2,
                    contents: [
                        { type: ContentType.TEXT, title: 'Understanding HNW Needs', description: 'Focus on privacy, exclusivity, and asset appreciation.', order: 1 }
                    ],
                    links: []
                },
                {
                    title: 'Legal Framework & Compliance',
                    description: 'Understanding the regulatory landscape of Dubai Real Estate market.',
                    order: 3,
                    contents: [
                        { type: ContentType.TEXT, title: 'RERA Regulations', description: 'Key rules every broker must follow to stay compliant.', order: 1 }
                    ],
                    links: [
                        { title: 'RERA Official Website', url: 'https://dubailand.gov.ae/en/rera/', order: 1 }
                    ]
                }
            ];

            for (const item of courses) {
                const course = new Course();
                course.title = item.title;
                course.description = item.description;
                course.order = item.order;

                course.contents = item.contents.map(c => {
                    const content = new CourseContent();
                    content.type = c.type;
                    content.title = c.title;
                    content.description = c.description;
                    content.order = c.order;
                    return content;
                });

                course.links = item.links.map(l => {
                    const link = new CourseLink();
                    link.title = l.title;
                    link.url = l.url;
                    link.order = l.order;
                    return link;
                });

                await courseRepo.save(course);
            }
            console.log('✅ Courses seeded');
        }

    } catch (error) {
        console.error('❌ Error during seeding:', error);
        process.exit(1);
    } finally {
        await AppDataSource.destroy();
        console.log('👋 Database disconnected');
    }
}

seed();
