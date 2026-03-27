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
    const titleEn = "Dubai Real Estate Price Forecast for 2027";
    const titleRu = "Прогноз цен на недвижимость в Дубае до 2027 года";
    const slug = slugify(titleEn, { lower: true, strict: true });

    const news = newsRepo.create({
      title: titleEn,
      titleRu: titleRu,
      slug: slug,
      description: "As we navigate 2026, the forecast for 2027 points to structural resilience driven by 92% occupancy and institutional capital shift.",
      descriptionRu: "Прогноз на 2027 год указывает на структурную устойчивость, обусловленную 92-процентной заполняемостью и переходом к институциональному капиталу.",
      isPublished: false, // DRAFT
      publishedAt: new Date(),
      authorId: author.id,
      seoTitle: "Dubai Real Estate Price Forecast for 2027 | Institutional Analysis",
      seoDescription: "Expert forecast for Dubai property prices in 2027. Understand the impact of Blue Line Metro, ESG mandates, and the 92% occupancy ceiling.",
      imageUrl: 'https://via.placeholder.com/1200x630?text=Dubai+Price+Forecast+2027'
    });

    const savedNews = await newsRepo.save(news);
    console.log(`✅ Table record created (DRAFT): "${savedNews.title}"`);

    // 3. Prepare Content Blocks
    const contents = [
      {
        order: 0,
        type: NewsContentType.TEXT,
        title: "Executive Summary: The Institutionalization of Dubai’s Real Estate Price Cycle",
        titleRu: "Executive Summary: Институционализация ценового цикла недвижимости Дубая",
        description: "As we navigate the second quarter of 2026, the Dubai real estate market has fundamentally transitioned...",
        descriptionRu: "Находясь во втором квартале 2026 года, мы констатируем: рынок недвижимости Дубая окончательно трансформировался..."
      },
      {
        order: 1,
        type: NewsContentType.TEXT,
        title: "Data & Evidence: DLD Pulse Metrics and the Shift to an Equity-Heavy Market",
        titleRu: "Данные и доказательства: Метрики DLD Pulse и переход к рынку с преобладанием собственного капитала",
        description: "To understand the price trajectory for 2027, one must analyze the 'price floor' mechanisms...",
        descriptionRu: "Чтобы понять ценовую траекторию на 2027 год, необходимо проанализировать механизмы «ценового пола»..."
      },
      {
        order: 2,
        type: NewsContentType.IMAGE,
        title: "Comparative Analysis: Dubai Real Estate Index vs. Infrastructure Milestone ROI (2024-2027 Projection)",
        titleRu: "Сравнительный анализ: Индекс недвижимости Дубая против ROI инфраструктурных вех (Прогноз 2024–2027)",
        description: "A sophisticated multi-layered data visualization illustrating a steady upward gradient of 2.4% per quarter projected out to 2027.",
        descriptionRu: "Сложная многослойная визуализация данных, иллюстрирующая стабильный восходящий градиент в 2,4% за квартал с прогнозом до 2027 года."
      },
      {
        order: 3,
        type: NewsContentType.TEXT,
        title: "Tactical Strategy: Surgical Asset Selection and Payment Plan Shields",
        titleRu: "Тактическая стратегия: Хирургический выбор активов и защитные планы оплаты",
        description: "In the 2026-2027 cycle, tactical success is determined by asset selection rather than mere market entry...",
        descriptionRu: "В цикле 2026–2027 годов тактический успех определяется выбором активов, а не просто входом в рынок..."
      },
      {
        order: 4,
        type: NewsContentType.TEXT,
        title: "24-Month Outlook: The Impact of Blue Line Metro and ESG Mandates",
        titleRu: "24-месячный прогноз: Влияние метро Blue Line и мандатов ESG",
        description: "Looking toward 2027 and 2028, two catalysts will define the next leg of Dubai’s growth...",
        descriptionRu: "Заглядывая в 2027 и 2028 годы, два катализатора определят следующий этап роста Дубая..."
      }
    ];

    for (const data of contents) {
      const content = contentRepo.create({
        ...data,
        newsId: savedNews.id
      });
      await contentRepo.save(content);
    }

    console.log(`🚀 Article 4 saved successfully (DRAFT) with ${contents.length} blocks!`);
    await AppDataSource.destroy();
  } catch (err) {
    console.error('❌ Error:', err);
    process.exit(1);
  }
}

main();
