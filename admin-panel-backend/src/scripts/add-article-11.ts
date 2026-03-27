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
    const titleEn = "Flip vs. Rent 2026: The Pivot to Institutional Stability";
    const titleRu = "Поворот 2026 года: Флиппинг против долгосрочной аренды";
    const slug = slugify(titleEn, { lower: true, strict: true });

    const news = newsRepo.create({
      title: titleEn,
      titleRu: titleRu,
      slug: slug,
      description: "Why the decision between capital appreciation and long-term yield in 2026 is a surgical calculation of risk, residency density, and infrastructure proxies.",
      descriptionRu: "Почему выбор между приростом капитала и арендой в 2026 году — это хирургический расчет риска, плотности резидентов и близости к инфраструктуре.",
      isPublished: false, // DRAFT
      publishedAt: new Date(),
      authorId: author.id,
      seoTitle: "Flip vs. Rent 2026: Dubai's Pivot to Institutional Stability",
      seoDescription: "Deciding between capital appreciation (flipping) and long-term yield in Dubai's 2026 market. Data-driven strategy for JVC, Maritime City, and Business Bay.",
      imageUrl: 'https://via.placeholder.com/1200x630?text=Flip+vs+Rent+Dubai+2026'
    });

    const savedNews = await newsRepo.save(news);
    console.log(`✅ Table record created (DRAFT): "${savedNews.title}"`);

    // 3. Prepare Content Blocks
    const contents = [
      {
        order: 0,
        type: NewsContentType.TEXT,
        title: "Executive Summary: The 2026 Pivot — From Speculative Velocity to Institutional Stability",
        titleRu: "Исполнительное резюме: Поворот 2026 года — от спекулятивной скорости к институциональной стабильности",
        description: "Navigating the Dubai real estate ecosystem in the second quarter of 2026 requires a fundamental departure from flipping mentalities...",
        descriptionRu: "Навигация по экосистеме недвижимости Дубая во втором квартале 2026 года требует фундаментального отхода от менталитета «флиппинга»..."
      },
      {
        order: 1,
        type: NewsContentType.TEXT,
        title: "Data & Evidence: Quantifying Yield Resilience vs. Capital Gains Momentum",
        titleRu: "Данные и доказательства: Количественная оценка устойчивости доходности против динамики прироста капитала",
        description: "To substantiate the choice between flipping and renting, we must deconstruct the granular data provided by DLD Pulse...",
        descriptionRu: "Чтобы обосновать выбор между перепродажей и арендой, мы должны деконструировать гранулярные данные..."
      },
      {
        order: 2,
        type: NewsContentType.IMAGE,
        title: "Strategy Comparison Matrix: Flip IRR vs. Net Rental Yield",
        titleRu: "Матрица сравнения стратегий: IRR перепродаж против чистой доходности аренды",
        description: "A sophisticated multi-axis institutional chart comparing internal rate of return for flips in Maritime City vs. net rental yields in JVC.",
        descriptionRu: "Сложный многоосевой график, сравнивающий IRR для стратегий Flip в Maritime City и чистую арендную доходность в JVC/Business Bay."
      },
      {
        order: 3,
        type: NewsContentType.TEXT,
        title: "Tactical Strategy: Leveraging Payment Plan Shields and Area Arbitrage",
        titleRu: "Тактическая стратегия: Использование планов оплаты в качестве щита и региональный арбитраж",
        description: "In the mature environment of 2026, tactical execution is the differentiator between an outperforming portfolio and a liquidity trap...",
        descriptionRu: "В зрелой среде 2026 года тактическое исполнение является дифференциатором между выдающимся портфелем и ловушкой ликвидности..."
      },
      {
        order: 4,
        type: NewsContentType.TEXT,
        title: "24-Month Outlook: The 2027 Infrastructure Kick and the Rise of the 'Green Premium'",
        titleRu: "Прогноз на 24 месяца: Инфраструктурный скачок 2027 года и возникновение «зеленой премии»",
        description: "Looking ahead to 2027 and 2028, the Dubai real estate market is entering its most infrastructure-driven phase in decades...",
        descriptionRu: "Глядя на 2027 и 2028 годы, рынок недвижимости Дубая вступает в самую активную инфраструктурную фазу за последние десятилетия..."
      }
    ];

    for (const data of contents) {
      const content = contentRepo.create({
        ...data,
        newsId: savedNews.id
      });
      await contentRepo.save(content);
    }

    console.log(`🚀 Article 11 saved successfully (DRAFT) with ${contents.length} blocks!`);
    await AppDataSource.destroy();
  } catch (err) {
    console.error('❌ Error:', err);
    process.exit(1);
  }
}

main();
