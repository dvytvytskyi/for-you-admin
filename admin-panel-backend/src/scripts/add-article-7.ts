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
    const titleEn = "The Great Decoupling 2026: District-Specific Arbitrage";
    const titleRu = "Великое разделение 2026 года и эпоха районного арбитража";
    const slug = slugify(titleEn, { lower: true, strict: true });

    const news = newsRepo.create({
      title: titleEn,
      titleRu: titleRu,
      slug: slug,
      description: "As Dubai transitions into a global institutional hub, identifying the 'information gap' between specific micro-markets is the only way to secure superior returns.",
      descriptionRu: "По мере того как Дубай превращается в глобальный институциональный хаб, выявление «информационного разрыва» между микрорынками — единственный способ обеспечить доходность.",
      isPublished: false, // DRAFT
      publishedAt: new Date(),
      authorId: author.id,
      seoTitle: "The Great Decoupling 2026: Dubai District-Specific Arbitrage",
      seoDescription: "Analysis of Dubai's 2026 district-level decoupling. Identify growth leaders like JVC, Business Bay, and Maritime City versus legacy districts.",
      imageUrl: 'https://via.placeholder.com/1200x630?text=Dubai+District+Arbitrage+2026'
    });

    const savedNews = await newsRepo.save(news);
    console.log(`✅ Table record created (DRAFT): "${savedNews.title}"`);

    // 3. Prepare Content Blocks
    const contents = [
      {
        order: 0,
        type: NewsContentType.TEXT,
        title: "Executive Summary: The Great Decoupling of 2026 and the Rise of District-Specific Arbitrage",
        titleRu: "Executive Summary: Великое разделение 2026 года и эпоха районного арбитража",
        description: "As we progress through the second quarter of 2026, the Dubai real estate landscape has undergone a fundamental structural shift...",
        descriptionRu: "По мере продвижения во втором квартале 2026 года ландшафт недвижимости Дубая претерпел фундаментальный структурный сдвиг..."
      },
      {
        order: 1,
        type: NewsContentType.TEXT,
        title: "Data & Evidence: Quantifying the Growth Leaders via DLD Pulse and Occupancy Metrics",
        titleRu: "Data & Evidence: Количественная оценка лидеров роста через DLD Pulse и метрики заполняемости",
        description: "To identify the true growth leaders in 2026, we must look beyond the broad headlines and analyze the specific metrics...",
        descriptionRu: "Чтобы выявить истинных лидеров роста в 2026 году, необходимо смотреть глубже заголовков и анализировать специфические метрики..."
      },
      {
        order: 2,
        type: NewsContentType.IMAGE,
        title: "District Performance Heatmap: Price Appreciation vs. Infrastructure Proximity",
        titleRu: "Тепловая карта эффективности районов: Рост цен против близости к инфраструктуре",
        description: "A sophisticated multi-axis institutional chart tracking capital appreciation relative to new infrastructure catalysts like Blue Line Metro.",
        descriptionRu: "Сложная институциональная диаграмма, отслеживающая рост стоимости капитала относительно близости станций метро Blue Line и аэропорта Аль-Мактум."
      },
      {
        order: 3,
        type: NewsContentType.TEXT,
        title: "Tactical Strategy: Surgical Deployment and the Post-Handover Payment Plan Shield",
        titleRu: "Tactical Strategy: Хирургическое развертывание и щит плана оплаты после получения ключей",
        description: "In the 2026-2027 cycle, tactical success is determined by asset selection rather than mere market entry...",
        descriptionRu: "В цикле 2026–2027 годов тактический успех определяется выбором конкретных активов, а не просто входом в рынок..."
      },
      {
        order: 4,
        type: NewsContentType.TEXT,
        title: "24-Month Outlook: The 2027 Infrastructure 'Jump' and the ESG Two-Tier Market",
        titleRu: "Прогноз на 24 месяца: Инфраструктурный прыжок 2027 года и двухъярусный рынок ESG",
        description: "Looking toward the 2027-2028 horizon, the Dubai real estate market is entering its most sophisticated phase yet...",
        descriptionRu: "Глядя на горизонт 2027–2028 годов, рынок недвижимости Дубая вступает в свою самую сложную фазу..."
      }
    ];

    for (const data of contents) {
      const content = contentRepo.create({
        ...data,
        newsId: savedNews.id
      });
      await contentRepo.save(content);
    }

    console.log(`🚀 Article 7 saved successfully (DRAFT) with ${contents.length} blocks!`);
    await AppDataSource.destroy();
  } catch (err) {
    console.error('❌ Error:', err);
    process.exit(1);
  }
}

main();
