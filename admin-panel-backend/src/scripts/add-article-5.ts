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
    const titleEn = "Dubai Index (DFMREI) vs. Real Prices: Essential Facts";
    const titleRu = "Индекс Дубая (DFMREI) vs реальные цены: Факты";
    const slug = slugify(titleEn, { lower: true, strict: true });

    const news = newsRepo.create({
      title: titleEn,
      titleRu: titleRu,
      slug: slug,
      description: "Understand the 'information gap' between the sentiment-driven equity market and the data-driven physical property market in 2026.",
      descriptionRu: "Понимание «информационного разрыва» между фондовым рынком, движимым сантиментом, и рынком недвижимости, движимым данными, в 2026 году.",
      isPublished: false, // DRAFT
      publishedAt: new Date(),
      authorId: author.id,
      seoTitle: "Dubai Index (DFMREI) vs. Real Prices: Essential Facts 2026",
      seoDescription: "Deciphering the divergence between the DFM Real Estate Index and DLD Pulse physical assets. Spot valuation arbitrage in the 2026 market.",
      imageUrl: 'https://via.placeholder.com/1200x630?text=Index+vs+Real+Prices+2026'
    });

    const savedNews = await newsRepo.save(news);
    console.log(`✅ Table record created (DRAFT): "${savedNews.title}"`);

    // 3. Prepare Content Blocks
    const contents = [
      {
        order: 0,
        type: NewsContentType.TEXT,
        title: "Executive Summary: Navigating the Valuation Arbitrage Between Equity Indices and Transactional Reality",
        titleRu: "Executive Summary: Навигация в зоне арбитража между фондовыми индексами и транзакционной реальностью",
        description: "As we enter the second half of 2026, the Dubai real estate landscape has reached a level of structural maturity...",
        descriptionRu: "Входя во вторую половину 2026 года, ландшафт недвижимости Дубая достиг того уровня структурной зрелости..."
      },
      {
        order: 1,
        type: NewsContentType.TEXT,
        title: "Data & Evidence: The Structural Decoupling of Market Sentiment and Physical Asset Pricing",
        titleRu: "Data & Evidence: Структурное расхождение рыночных настроений и оценки физических активов",
        description: "To quantify the divergence between the DFM Real Estate Index and real-world prices...",
        descriptionRu: "Чтобы количественно оценить расхождение между индексом недвижимости DFM и реальными ценами..."
      },
      {
        order: 2,
        type: NewsContentType.IMAGE,
        title: "Correlation Matrix: DFM Real Estate Equities Index vs. DLD Transactional Price Index (2024-2026)",
        titleRu: "Корреляционная матрица: Индекс акций недвижимости DFM против индекса транзакционных цен DLD (2024–2026 гг.)",
        description: "Sophisticated multi-axis chart illustrating the 'Maturity Gap' between equity indices and physical prices lead times.",
        descriptionRu: "Сложный многоосевой график, иллюстрирующий «разрыв зрелости» между фондовыми индексами и временем обнаружения цен на физическом рынке."
      },
      {
        order: 3,
        type: NewsContentType.TEXT,
        title: "Tactical Strategy: Exploiting the Index Lag for Superior Asset Allocation",
        titleRu: "Tactical Strategy: Использование лага индекса для превосходного распределения активов",
        description: "Tactical deployment in the 2026-2027 cycle requires a move away from 'branded vanity'...",
        descriptionRu: "Тактическое развертывание в цикле 2026–2027 годов требует отказа от «брендового тщеславия»..."
      },
      {
        order: 4,
        type: NewsContentType.TEXT,
        title: "24-Month Outlook: Predictions for the 2027-2028 Infrastructure-Led Bull Cycle",
        titleRu: "24-Month Outlook: Прогнозы на инфраструктурный цикл «бычьего» рынка 2027–2028 годов",
        description: "Looking ahead to 2027 and 2028, the Dubai real estate market will enter its most sophisticated phase yet...",
        descriptionRu: "Заглядывая вперед, в 2027 и 2028 годы, рынок недвижимости Дубая вступит в свою самую сложную фазу..."
      }
    ];

    for (const data of contents) {
      const content = contentRepo.create({
        ...data,
        newsId: savedNews.id
      });
      await contentRepo.save(content);
    }

    console.log(`🚀 Article 5 saved successfully (DRAFT) with ${contents.length} blocks!`);
    await AppDataSource.destroy();
  } catch (err) {
    console.error('❌ Error:', err);
    process.exit(1);
  }
}

main();
