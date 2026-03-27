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
    const titleEn = "Dubai Market Cycles: Peak or New Jump?";
    const titleRu = "Цикличность рынка Дубая: Пик или новый прыжок?";
    const slug = slugify(titleEn, { lower: true, strict: true });

    const news = newsRepo.create({
      title: titleEn,
      titleRu: titleRu,
      slug: slug,
      description: "Dissecting the 2026 plateau — understanding whether it's a cyclical peak or mid-cycle consolidation before the next leg of expansion.",
      descriptionRu: "Декомпозиция рыночного цикла 2026 года — понимание того, является ли это плато циклическим пиком или консолидацией перед расширением.",
      isPublished: false, // DRAFT
      publishedAt: new Date(),
      authorId: author.id,
      seoTitle: "Dubai Market Cycles 2026: Peak or New Jump? | Expert Analysis",
      seoDescription: "Is Dubai real estate at its cyclical peak or mid-cycle consolidation? Analysis of the 2027 infrastructure kick, ESG mandates, and Golden Visa floor price.",
      imageUrl: 'https://via.placeholder.com/1200x630?text=Dubai+Market+Cycles+2026'
    });

    const savedNews = await newsRepo.save(news);
    console.log(`✅ Table record created (DRAFT): "${savedNews.title}"`);

    // 3. Prepare Content Blocks
    const contents = [
      {
        order: 0,
        type: NewsContentType.TEXT,
        title: "Executive Summary: Dissecting the 2026 Plateau — Consolidation vs. Cyclical Peak",
        titleRu: "Executive Summary: Декомпозиция рыночного цикла 2026 года — плато или фундамент для прыжка?",
        description: "As we navigate the second quarter of 2026, the primary point of contention among institutional funds is whether...",
        descriptionRu: "Находясь во втором квартале 2026 года, мы наблюдаем самую острую дискуссию среди институциональных фондов..."
      },
      {
        order: 1,
        type: NewsContentType.TEXT,
        title: "Data & Evidence: DLD Pulse Metrics and the 2.4% Stability Benchmark",
        titleRu: "Данные и доказательства: Метрики DLD Pulse и бенчмарк стабильности 2,4%",
        description: "To understand why the 2026 market is not at a peak, one must look at the granular data provided by DLD Pulse...",
        descriptionRu: "Чтобы понять, почему рынок 2026 года не находится на пике, необходимо проанализировать гранулярные данные DLD Pulse..."
      },
      {
        order: 2,
        type: NewsContentType.IMAGE,
        title: "Dubai Market Cycle Maturity Heatmap: 2008 vs. 2014 vs. 2026 Structural Comparison",
        titleRu: "Тепловая карта зрелости рынка Дубая: Структурное сравнение 2008, 2014 и 2026 годов",
        description: "A sophisticated multi-axis institutional chart showing a massive divergence in 2026 leverage versus 2008.",
        descriptionRu: "Сложная многоосевая институциональная диаграмма, показывающая масштабное расхождение уровня заемных средств в 2026 году по сравнению с 2008 годом."
      },
      {
        order: 3,
        type: NewsContentType.TEXT,
        title: "Tactical Strategy: Surgical Deployment and the Post-Handover Shield",
        titleRu: "Тактическая стратегия: Хирургическое развертывание и щит Post-Handover",
        description: "In 2026, the tactical strategy for institutional capital must shift from 'market-beta' to 'alpha-selection'...",
        descriptionRu: "В 2026 году тактическая стратегия для институционального капитала должна сместиться от «рыночной беты» к «альфа-селекции»..."
      },
      {
        order: 4,
        type: NewsContentType.TEXT,
        title: "24-Month Outlook: The 2027 Infrastructure Kick and the ESG Two-Tier Market",
        titleRu: "Прогноз на 24 месяца: Инфраструктурный скачок 2027 года и двухъярусный рынок ESG",
        description: "Looking ahead to 2027 and 2028, the Dubai real estate market is poised for a significant infrastructure-led 'jump'...",
        descriptionRu: "Заглядывая в 2027 и 2028 годы, рынок недвижимости Дубая готов к значительному инфраструктурному «прыжку»..."
      }
    ];

    for (const data of contents) {
      const content = contentRepo.create({
        ...data,
        newsId: savedNews.id
      });
      await contentRepo.save(content);
    }

    console.log(`🚀 Article 6 saved successfully (DRAFT) with ${contents.length} blocks!`);
    await AppDataSource.destroy();
  } catch (err) {
    console.error('❌ Error:', err);
    process.exit(1);
  }
}

main();
