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
    const titleEn = "Redefining Entry Barriers 2026: Low Capital Strategies";
    const titleRu = "Переосмысление входных барьеров в зрелой среде 2026 года";
    const slug = slugify(titleEn, { lower: true, strict: true });

    const news = newsRepo.create({
      title: titleEn,
      titleRu: titleRu,
      slug: slug,
      description: "How to build a robust portfolio in Dubai's 2026 market using structured developer leverage, escrow-protected off-plan projects, and high-yield clusters.",
      descriptionRu: "Как создать надежный портфель на рынке Дубая в 2026 году, используя структурированный девелоперский леверидж и высокодоходные кластеры.",
      isPublished: false, // DRAFT
      publishedAt: new Date(),
      authorId: author.id,
      seoTitle: "Redefining Entry Barriers 2026: Low Capital Strategies in Dubai",
      seoDescription: "How to enter the 2026 Dubai property market with minimal initial capital. Structured payment plans, mid-market yield clusters, and infrastructure catalysts.",
      imageUrl: 'https://via.placeholder.com/1200x630?text=Low+Capital+Entry+2026'
    });

    const savedNews = await newsRepo.save(news);
    console.log(`✅ Table record created (DRAFT): "${savedNews.title}"`);

    // 3. Prepare Content Blocks
    const contents = [
      {
        order: 0,
        type: NewsContentType.TEXT,
        title: "Executive Summary: Redefining Entry Barriers in Dubai’s Mature 2026 Landscape",
        titleRu: "Исполнительное резюме: Переосмысление входных барьеров в зрелой среде 2026 года",
        description: "The Dubai real estate ecosystem in 2026 has transitioned from a high-volatility speculative hub into a sophisticated, institutional-grade global asset class...",
        descriptionRu: "Экосистема недвижимости Дубая в 2026 году окончательно трансформировалась из волатильного спекулятивного хаба в сложный институциональный класс активов..."
      },
      {
        order: 1,
        type: NewsContentType.TEXT,
        title: "Data & Evidence: The Quantitative Case for Mid-Market Velocity",
        titleRu: "Данные и доказательства: Количественное обоснование динамики мид-маркета",
        description: "To substantiate a low-capital entry strategy, we must dissect the granular data points currently defining the 2026 market...",
        descriptionRu: "Чтобы обосновать стратегию входа с низким капиталом, мы должны препарировать гранулярные данные, определяющие рынок в 2026 году..."
      },
      {
        order: 2,
        type: NewsContentType.IMAGE,
        title: "Comparative Analysis: Capital Entry Requirements vs. Projected Net Yield by District",
        titleRu: "Сравнительный анализ: Требования к начальному капиталу против прогнозируемой чистой доходности по районам",
        description: "A sophisticated multi-axis institutional chart tracking initial capital outlay relative to projected net yield and secondary market liquidity.",
        descriptionRu: "Сложный многоосевой институциональный график, отслеживающий требования к начальному капиталу относительно чистой доходности и ликвидности."
      },
      {
        order: 3,
        type: NewsContentType.TEXT,
        title: "Tactical Strategy: Leveraging Payment Plan Shields and Strategic Hubs",
        titleRu: "Тактическая стратегия: Использование планов оплаты и стратегических хабов",
        description: "For investors deploying minimal initial capital in 2026, tactical execution is paramount to avoid the liquidity traps...",
        descriptionRu: "Для инвесторов, размещающих минимальный начальный капитал в 2026 году, тактическое исполнение имеет первостепенное значение..."
      },
      {
        order: 4,
        type: NewsContentType.TEXT,
        title: "24-Month Outlook: Infrastructure Catalysts and the Rise of the 'Metro-Yield' Corridor",
        titleRu: "Прогноз на 24 месяца: Инфраструктурные катализаторы и возникновение «коридора метро-доходности»",
        description: "Looking toward 2027 and 2028, the Dubai market is entering its most infrastructure-heavy phase since Expo 2020...",
        descriptionRu: "Глядя на 2027 и 2028 годы, рынок Дубая вступает в самую активную инфраструктурную фазу со времен Expo 2020..."
      }
    ];

    for (const data of contents) {
      const content = contentRepo.create({
        ...data,
        newsId: savedNews.id
      });
      await contentRepo.save(content);
    }

    console.log(`🚀 Article 9 saved successfully (DRAFT) with ${contents.length} blocks!`);
    await AppDataSource.destroy();
  } catch (err) {
    console.error('❌ Error:', err);
    process.exit(1);
  }
}

main();
