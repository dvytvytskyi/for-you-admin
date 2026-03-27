import 'reflect-metadata';
import { AppDataSource } from '../config/database';
import { Author } from '../entities/Author';
import { News } from '../entities/News';
import { NewsContent, NewsContentType } from '../entities/NewsContent';
import slugify from 'slugify';

async function main() {
  try {
    await AppDataSource.initialize();
    console.log('✅ Database connected');

    const authorRepo = AppDataSource.getRepository(Author);
    const newsRepo = AppDataSource.getRepository(News);
    const contentRepo = AppDataSource.getRepository(NewsContent);

    // 1. Get author
    const author = await authorRepo.findOneBy({ nameEn: 'For You Editorial Team' });
    if (!author) throw new Error('Author not found');

    // 2. Prepare News Data
    const titleEn = "Dubai Valuation Arbitrage: Global Megalopolis Hierarchy 2026";
    const titleRu = "Глобальный инвестиционный арбитраж — Дубай в иерархии мегаполисов 2026 года";
    const slug = slugify(titleEn, { lower: true, strict: true });

    const news = newsRepo.create({
      title: titleEn,
      titleRu: titleRu,
      slug: slug,
      description: "Comparing Dubai's institutional-grade assets with London, New York, and Singapore. Why Dubai remains undervalued despite a 2.4% quarterly growth floor.",
      descriptionRu: "Сравнение институциональных активов Дубая с Лондоном, Нью-Йорком и Сингапуром. Почему Дубай остается недооцененным при росте 2,4% в квартал.",
      isPublished: false, // DRAFT
      publishedAt: new Date(),
      authorId: author.id,
      seoTitle: "Dubai Valuation Arbitrage 2026: Comparison with Global Megapolises",
      seoDescription: "Why Dubai is currently the most efficient global vehicle for risk-adjusted income. Comparing price per sq ft and net yields with London, NYC, and Singapore.",
      imageUrl: 'https://via.placeholder.com/1200x630?text=Dubai+vs+Global+Megapolises+2026'
    });

    const savedNews = await newsRepo.save(news);
    console.log(`✅ Table record created (DRAFT): "${savedNews.title}"`);

    // 3. Prepare Content Blocks
    const contents = [
      {
        order: 0,
        type: NewsContentType.TEXT,
        title: "Executive Summary: The Valuation Arbitrage of Dubai within the Global Institutional Framework",
        titleRu: "Executive Summary: Глобальный инвестиционный арбитраж — Дубай в иерархии мегаполисов 2026 года",
        description: "As of the second quarter of 2026, the global real estate investment landscape has undergone a fundamental structural realignment...",
        descriptionRu: "К середине 2026 года глобальный ландшафт инвестиций в недвижимость претерпел фундаментальную структурную перестройку..."
      },
      {
        order: 1,
        type: NewsContentType.TEXT,
        title: "Data & Evidence: Quantitative Yield Discrepancy and the 92% Occupancy Floor",
        titleRu: "Data & Evidence: Количественный разрыв в доходности и устойчивость «ценового пола»",
        description: "To substantiate the thesis of Dubai’s relative undervaluation, we must deconstruct the granular data provided by DLD Pulse...",
        descriptionRu: "Чтобы обосновать преимущество Дубая в глобальной иерархии 2026 года, необходимо проанализировать гранулярные транзакционные данные..."
      },
      {
        order: 2,
        type: NewsContentType.IMAGE,
        title: "Global Megapolises Arbitrage Matrix 2026: Price per Square Foot vs. Net Rental Yield",
        titleRu: "Матрица глобального арбитража 2026: Цена за квадратный фут против чистой доходности",
        description: "A sophisticated multidimensional institutional chart comparing price per square foot in USD against net rental yields across global hubs.",
        descriptionRu: "Сложный многомерный институциональный график, сравнивающий цену за квадратный фут в долларах с чистой арендной доходностью в мировых хабах."
      },
      {
        order: 3,
        type: NewsContentType.TEXT,
        title: "Tactical Strategy: Surgical Deployment and the Post-Handover Shield",
        titleRu: "Tactical Strategy: Хирургическое развертывание и щит Post-Handover",
        description: "In the 2026-2027 cycle, tactical success is defined by surgical asset selection rather than broad market exposure...",
        descriptionRu: "В цикле 2026–2027 годов тактический успех определяется хирургическим выбором активов, а не просто широкой экспозицией на рынок..."
      },
      {
        order: 4,
        type: NewsContentType.TEXT,
        title: "24-Month Outlook: The 2027 Infrastructure Kick and the Rise of the ESG Premium",
        titleRu: "24-Month Outlook: Инфраструктурный скачок 2027 года и возникновение премии за ESG",
        description: "Looking toward the 2027-2028 horizon, the Dubai real estate market is poised for an infrastructure-led 'jump'...",
        descriptionRu: "Глядя на горизонт 2027–2028 годов, рынок недвижимости Дубая готов к инфраструктурному «прыжку»..."
      }
    ];

    for (const data of contents) {
      const content = contentRepo.create({
        ...data,
        newsId: savedNews.id
      });
      await contentRepo.save(content);
    }

    console.log(`🚀 Article 10 saved successfully (DRAFT) with ${contents.length} blocks!`);
    await AppDataSource.destroy();
  } catch (err) {
    console.error('❌ Error:', err);
    process.exit(1);
  }
}

main();
