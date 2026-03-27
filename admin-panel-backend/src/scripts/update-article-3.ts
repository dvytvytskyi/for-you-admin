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

    const newsRepo = AppDataSource.getRepository(News);
    const contentRepo = AppDataSource.getRepository(NewsContent);

    // 1. Find existing article 3 by slug
    const titleEn = "How to Read the DFM Real Estate Index: Investor's Guide";
    const slug = slugify(titleEn, { lower: true, strict: true });
    
    let news = await newsRepo.findOneBy({ slug: slug });
    if (news) {
      console.log(`Found existing Article 3 (ID: ${news.id}). Overwriting...`);
      // Delete old blocks
      await contentRepo.delete({ newsId: news.id });
    } else {
      console.log('Article 3 not found. Creating new one...');
      const author = await AppDataSource.getRepository(Author).findOneBy({ nameEn: 'For You Editorial Team' });
      news = newsRepo.create({
        title: titleEn,
        slug: slug,
        authorId: author?.id,
        isPublished: false,
        publishedAt: new Date()
      });
    }

    // 2. Update News main fields
    news.titleRu = "Как читать DFM Real Estate Index: Гид для инвесторов";
    news.description = "Navigating the Dubai real estate landscape in 2026 requires a fundamental departure from anecdote to data. The DFMREI has emerged as the primary tool.";
    news.descriptionRu = "Навигация по рынку недвижимости Дубая в 2026 году требует фундаментального отказа от брокерских моделей, основанных на интуиции. Индекс DFMREI стал основным инструментом.";
    news.seoTitle = "How to Read the DFM Real Estate Index: Investor's Guide 2026";
    news.seoDescription = "Executive guide to the DFMREI in 2026. Understand structural maturity, liquidity proxies, and risk mitigation tools for institutional investors.";
    
    const savedNews = await newsRepo.save(news);

    // 3. Prepare New Content Blocks
    const contents = [
      {
        order: 0,
        type: NewsContentType.TEXT,
        title: "Executive Summary: The Institutionalization of Dubai’s Real Estate Transparency in 2026",
        titleRu: "Executive Summary: Институционализация прозрачности рынка Дубая в 2026 году",
        description: "Navigating the Dubai real estate landscape in 2026 requires a fundamental departure from the anecdotal evidence...",
        descriptionRu: "Навигация по рынку недвижимости Дубая в 2026 году требует фундаментального отказа от анекдотичных свидетельств..."
      },
      {
        order: 1,
        type: NewsContentType.TEXT,
        title: "Data & Evidence: Interpreting Index Velocity vs. Actual Transaction Volumes",
        titleRu: "Data & Evidence: Интерпретация скорости индекса против реальных объемов транзакций",
        description: "To effectively utilize the DFM Real Estate Index, one must master the interplay between listed developer performance...",
        descriptionRu: "Для эффективного использования индекса недвижимости DFM необходимо овладеть навыком сопоставления показателей публичных девелоперов..."
      },
      {
        order: 2,
        type: NewsContentType.IMAGE,
        title: "Correlation Matrix: DFM Real Estate Index Performance vs. DLD Pulse Cash-to-Mortgage Ratios and Net Yields (2024-2026)",
        titleRu: "Матрица корреляции: Показатели индекса недвижимости DFM против соотношения наличных сделок и чистой доходности (2024–2026)",
        description: "Sophisticated multi-layered visualization tracking DFMREI value gradient and Yield Density heatmap.",
        descriptionRu: "Сложная многоуровневая визуализация данных, отслеживающая градиент индекса DFM и тепловую карту плотности доходности."
      },
      {
        order: 3,
        type: NewsContentType.TEXT,
        title: "Tactical Strategy: Leveraging Index Insights for Asset Selection and Entry Timing",
        titleRu: "Tactical Strategy: Использование инсайтов индекса для выбора активов и тайминга входа",
        description: "Tactical deployment of capital in 2026 hinges on identifying where the DFM Real Estate Index is lagging or leading...",
        descriptionRu: "Тактическое развертывание капитала в 2026 году зависит от выявления зон, где индекс недвижимости DFM отстает или опережает..."
      },
      {
        order: 4,
        type: NewsContentType.TEXT,
        title: "24-Month Outlook: Predictions for the 2027-2028 Cycle and the ESG Integration",
        titleRu: "24-Month Outlook: Прогнозы на цикл 2027–2028 годов и интеграция ESG",
        description: "Looking toward the 2027-2028 horizon, the DFM Real Estate Index will undergo its most significant evolution yet: the integration of ESG...",
        descriptionRu: "Глядя на горизонт 2027–2028 годов, индекс недвижимости DFM ожидает самая значительная эволюция: интеграция весов ESG..."
      }
    ];

    for (const data of contents) {
      const content = contentRepo.create({
        ...data,
        newsId: savedNews.id
      });
      await contentRepo.save(content);
    }

    console.log(`🚀 Article 3 UPDATED successfully (DRAFT) with ${contents.length} blocks!`);
    await AppDataSource.destroy();
  } catch (err) {
    console.error('❌ Error:', err);
    process.exit(1);
  }
}

main();
