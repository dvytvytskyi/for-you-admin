import 'reflect-metadata';
import { AppDataSource } from '../config/database';
import { News } from '../entities/News';
import { NewsContent, NewsContentType } from '../entities/NewsContent';
import slugify from 'slugify';

async function main() {
  try {
    await AppDataSource.initialize();
    console.log('✅ Database connected');

    const newsRepo = AppDataSource.getRepository(News);
    const contentRepo = AppDataSource.getRepository(NewsContent);

    const titleEn = "Dubai Market Cycles: Peak or New Jump?";
    const slug = slugify(titleEn, { lower: true, strict: true });
    
    let news = await newsRepo.findOneBy({ slug: slug });
    if (news) {
      console.log(`Found Article 6 (ID: ${news.id}). Updating to Premium version...`);
      await contentRepo.delete({ newsId: news.id });
    } else {
      console.log('Article 6 not found to update.');
      process.exit(1);
    }

    // Update main description for better SEO
    news.description = "Dissecting the 2026 plateau — is it a terminal cyclical peak or a structural consolidation before an infrastructure-led jump?";
    news.descriptionRu = "Деконструкция плато 2026 года — является ли это циклическим пиком или структурной консолидацией перед прыжком.";
    await newsRepo.save(news);

    const contents = [
      {
        order: 0,
        type: NewsContentType.TEXT,
        title: "Executive Summary: Dissecting the 2026 Plateau — Cyclical Peak or Structural Consolidation?",
        titleRu: "Executive Summary: Деконструкция плато 2026 года — циклический пик или структурная консолидация?",
        description: "As we navigate the second quarter of 2026, the institutional discourse surrounding the Dubai real estate sector has reached a critical juncture...",
        descriptionRu: "Навигация по рынку недвижимости Дубая во втором квартале 2026 года требует глубокого понимания его текущей фазы..."
      },
      {
        order: 1,
        type: NewsContentType.TEXT,
        title: "Data & Evidence: The Quantitative Case for Sustained Market Integrity",
        titleRu: "Data & Evidence: Количественные аргументы в пользу устойчивости рынка",
        description: "To move beyond anecdotal market sentiment, we must analyze the granular metrics provided by DLD Pulse...",
        descriptionRu: "Чтобы выйти за рамки субъективных рыночных настроений, мы должны проанализировать гранулярные метрики..."
      },
      {
        order: 2,
        type: NewsContentType.IMAGE,
        title: "Multidimensional Correlation Matrix: Dubai Real Estate Cycles (2008 vs. 2014 vs. 2026)",
        titleRu: "Многомерная матрица корреляции: Циклы недвижимости Дубая (2008 vs 2014 vs 2026)",
        description: "Sophisticated institutional-grade data visualization comparing debt-to-equity ratios and rental yield sustainability across cycles.",
        descriptionRu: "Сложная визуализация данных институционального уровня, сравнивающая соотношение долга к капиталу и устойчивость арендной доходности."
      },
      {
        order: 3,
        type: NewsContentType.TEXT,
        title: "Tactical Strategy: Surgical Deployment in a Mature Asset Environment",
        titleRu: "Tactical Strategy: Хирургическое развертывание в условиях зрелой среды активов",
        description: "In a market characterized by 2.4% quarterly index growth, tactical success is no longer about 'buying the index'...",
        descriptionRu: "На рынке, характеризующемся квартальным ростом индекса в 2,4%, тактический успех больше не зависит от «покупки индекса»..."
      },
      {
        order: 4,
        type: NewsContentType.TEXT,
        title: "24-Month Outlook: The 2027 Infrastructure Kick and the Rise of the South Corridor",
        titleRu: "24-Month Outlook: Инфраструктурный скачок 2027 года и возникновение Южного коридора",
        description: "Looking toward the 2027-2028 horizon, the Dubai real estate sector is poised for an infrastructure-led 'jump'...",
        descriptionRu: "Глядя на горизонт 2027–2028 годов, сектор недвижимости Дубая готов к инфраструктурному прыжку..."
      }
    ];

    for (const data of contents) {
      const content = contentRepo.create({
        ...data,
        newsId: news.id
      });
      await contentRepo.save(content);
    }

    console.log(`🚀 Article 6 UPDATED to Premium version successfully!`);
    await AppDataSource.destroy();
  } catch (err) {
    console.error('❌ Error:', err);
    process.exit(1);
  }
}

main();
