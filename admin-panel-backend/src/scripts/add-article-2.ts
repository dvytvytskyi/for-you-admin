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
    const titleEn = "Dubai Real Estate Crash: Why 2026 is Not 2008";
    const titleRu = "Dubai Real Estate Crash: Почему 2026 — это не 2008";
    const slug = slugify(titleEn, { lower: true, strict: true });

    const news = newsRepo.create({
      title: titleEn,
      titleRu: titleRu,
      slug: slug,
      description: "Navigating the Dubai real estate landscape for over a decade provides a unique lens through which to analyze the current 2026 market cycle. Why it is not 2008.",
      descriptionRu: "Наблюдая за рынком недвижимости Дубая более десяти лет, я рассматриваю текущий цикл 2026 года через призму фундаментальной трансформации. Почему это не 2008.",
      isPublished: false, // AS REQUESTED: DRAFT
      publishedAt: new Date(),
      authorId: author.id,
      seoTitle: "Dubai Real Estate Crash: Why 2026 is Not 2008 | Expert Analysis",
      seoDescription: "Discover why Dubai's 2026 market maturity, Golden Visa effect, and cash-rich transactions create a structural buffer against a property crash.",
      imageUrl: 'https://via.placeholder.com/1200x630?text=Dubai+Market+Maturity+2026'
    });

    const savedNews = await newsRepo.save(news);
    console.log(`✅ Table record created (DRAFT): "${savedNews.title}"`);

    // 3. Prepare Content Blocks
    const contents = [
      {
        order: 0,
        type: NewsContentType.TEXT,
        title: "Macroeconomic Structural Integrity: 2026 Maturity vs. 2008 Speculative Fragility",
        titleRu: "Макроэкономическая устойчивость: Зрелость 2026 года против хрупкости 2008-го",
        description: "Navigating the Dubai real estate landscape for over a decade, including the 2014 price correction and the post-pandemic surge, provides a unique lens through which to analyze the current 2026 market cycle...",
        descriptionRu: "Наблюдая за рынком недвижимости Дубая более десяти лет, включая коррекцию 2014 года и постпандемийный всплеск, я рассматриваю текущий цикл 2026 года через призму фундаментальной трансформации..."
      },
      {
        order: 1,
        type: NewsContentType.TEXT,
        title: "Regulatory Fortification and the Golden Visa Floor Price Effect",
        titleRu: "Регуляторная фортификация и эффект «ценового пола» Золотых виз",
        description: "The resilience of the 2026 market is further bolstered by a regulatory framework that was non-existent during the 2008 crisis. The implementation of sophisticated Escrow account management...",
        descriptionRu: "Устойчивость рынка в 2026 году дополнительно подкреплена регуляторной базой, которая практически отсутствовала во время кризиса 2008 года. Внедрение сложных механизмов управления эскроу-счетами..."
      },
      {
        order: 2,
        type: NewsContentType.IMAGE,
        title: "Comparison of Secondary Market vs. Off-plan Transaction Volumes and Cash-to-Mortgage Ratios (2024-2026)",
        titleRu: "Сравнение объемов транзакций на вторичном рынке и Off-plan, а также соотношение наличных и ипотечных сделок (2024–2026)",
        description: "A comprehensive multi-layered bar and line chart showing transaction dominance and cash-heavy transactions exceeding 50% according to DLD Pulse.",
        descriptionRu: "Комплексная многоуровневая столбчатая и линейная диаграмма, показывающая доминирование вторичного рынка и рост доли наличных расчетов свыше 50%."
      },
      {
        order: 3,
        type: NewsContentType.TEXT,
        title: "Tactical Deployment: Navigating Yield Clusters and Payment Plan Shields",
        titleRu: "Тактическое развертывание: Навигация по кластерам доходности и защитным планам оплаты",
        description: "For institutional investors deploying capital in late 2026, the strategy must shift from broad market exposure to surgical asset selection. The 'yield clusters' of Dubai have migrated...",
        descriptionRu: "Для институциональных инвесторов, размещающих капитал в конце 2026 года, стратегия должна сместиться от широкого охвата рынка к хирургическому выбору активов. «Кластеры доходности» Дубая мигрировали..."
      },
      {
        order: 4,
        type: NewsContentType.TEXT,
        title: "2027-2028 Outlook: ESG Integration and the Blue Line Metro Micro-Markets",
        titleRu: "Прогноз на 2027–2028 годы: Интеграция ESG и микрорынки Голубой линии метро",
        description: "Looking toward the 2027-2028 horizon, the Dubai real estate market is entering a phase of 'Sophisticated Diversification.' The narrative is no longer about the city as a whole...",
        descriptionRu: "Глядя на горизонт 2027–2028 годов, рынок недвижимости Дубая вступает в фазу «сложной диверсификации». Речь больше не идет о городе в целом, а о конкретных микрорынках..."
      }
    ];

    for (const data of contents) {
      const content = contentRepo.create({
        ...data,
        newsId: savedNews.id
      });
      await contentRepo.save(content);
    }

    console.log(`🚀 Article 2 saved successfully (DRAFT) with ${contents.length} blocks!`);
    await AppDataSource.destroy();
  } catch (err) {
    console.error('❌ Error:', err);
    process.exit(1);
  }
}

main();
