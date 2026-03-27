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
    const titleEn = "How to Read the DFM Real Estate Index: Investor's Guide";
    const titleRu = "Как читать DFM Real Estate Index: Гид для инвесторов";
    const slug = slugify(titleEn, { lower: true, strict: true });

    const news = newsRepo.create({
      title: titleEn,
      titleRu: titleRu,
      slug: slug,
      description: "Understand the fundamental shift in Dubai property market from regional speculative hub to global institutional-grade asset class in 2026.",
      descriptionRu: "Разбор фундаментальной трансформации рынка недвижимости Дубая из регионального спекулятивного хаба в глобальный класс активов в 2026 году.",
      isPublished: false, // DRAFT
      publishedAt: new Date(),
      authorId: author.id,
      seoTitle: "How to Read the DFM Real Estate Index: Investor's Guide 2026",
      seoDescription: "Decode the DFMREI in 2026. Understand structural maturity, cash-over-debt flip, and why 2.4% quarterly growth signals stability.",
      imageUrl: 'https://via.placeholder.com/1200x630?text=DFM+Index+Guide+2026'
    });

    const savedNews = await newsRepo.save(news);
    console.log(`✅ Table record created (DRAFT): "${savedNews.title}"`);

    // 3. Prepare Content Blocks
    const contents = [
      {
        order: 0,
        type: NewsContentType.TEXT,
        title: "Macroeconomic Maturity: The DFM Real Estate Index as a Barometer of Stability",
        titleRu: "Макроэкономическая зрелость: Индекс недвижимости DFM как барометр стабильности",
        description: "As we progress through the second quarter of 2026, the Dubai property market is undergoing a fundamental shift...",
        descriptionRu: "По мере продвижения через второй квартал 2026 года рынок недвижимости Дубая завершает фундаментальную трансформацию..."
      },
      {
        order: 1,
        type: NewsContentType.TEXT,
        title: "Regulatory Granularity: Integrating DLD Pulse and the Residency 'Floor Price'",
        titleRu: "Регуляторная детализация: Интеграция DLD Pulse и «ценового пола» резидентства",
        description: "To truly decipher the DFM Real Estate Index in 2026, one must integrate the granular data provided by DLD Pulse...",
        descriptionRu: "Чтобы по-настоящему дешифровать индекс недвижимости DFM в 2026 году, необходимо интегрировать его с гранулярными данными..."
      },
      {
        order: 2,
        type: NewsContentType.IMAGE,
        title: "Performance Correlation: DFM Real Estate Index vs. Secondary Market Cash Transaction Ratios (2024-2026)",
        titleRu: "Корреляция производительности: Индекс недвижимости DFM в сравнении с долей сделок за наличный расчет на вторичном рынке (2024–2026 гг.)",
        description: "A sophisticated multi-axis data visualization tracking DFMREI slope and Equity-to-Debt ratio growth.",
        descriptionRu: "Сложная визуализация данных по нескольким осям, отслеживающая наклон DFMREI и рост соотношения капитала к долгу."
      },
      {
        order: 3,
        type: NewsContentType.TEXT,
        title: "Tactical Deployment: Leveraging Payment Plans as a Strategic Shield",
        titleRu: "Тактическое развертывание: Использование планов оплаты как стратегического щита",
        description: "For investors deploying capital in late 2026, surgical asset selection is paramount...",
        descriptionRu: "Для инвесторов, размещающих капитал в конце 2026 года, хирургический выбор активов имеет первостепенное значение..."
      },
      {
        order: 4,
        type: NewsContentType.TEXT,
        title: "2027-2028 Outlook: The ESG Premium and Blue Line Metro Micro-Bull Markets",
        titleRu: "Прогноз на 2027–2028 годы: Премия ESG и микро-рынки метро Blue Line",
        description: "Looking toward the 2027-2028 horizon, the Dubai real estate market is entering a phase of 'Sophisticated Diversification'...",
        descriptionRu: "Глядя на горизонт 2027–2028 годов, рынок недвижимости Дубая вступает в фазу «сложной диверсификации»..."
      }
    ];

    for (const data of contents) {
      const content = contentRepo.create({
        ...data,
        newsId: savedNews.id
      });
      await contentRepo.save(content);
    }

    console.log(`🚀 Article 3 saved successfully (DRAFT) with ${contents.length} blocks!`);
    await AppDataSource.destroy();
  } catch (err) {
    console.error('❌ Error:', err);
    process.exit(1);
  }
}

main();
