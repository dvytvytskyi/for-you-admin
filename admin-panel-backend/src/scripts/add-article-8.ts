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
    const titleEn = "The 2026 Developer Hegemony: Emaar vs. Binghatti";
    const titleRu = "Девелоперская гегемония 2026 года: Emaar против Binghatti";
    const slug = slugify(titleEn, { lower: true, strict: true });

    const news = newsRepo.create({
      title: titleEn,
      titleRu: titleRu,
      slug: slug,
      description: "A deep dive into the 2026 developer landscape, comparing Emaar's 'Blue Chip' stability with Binghatti's aggressive 'Hyper-Tower' disruptor strategy.",
      descriptionRu: "Глубокий анализ девелоперского ландшафта 2026 года: сравнение стабильности «голубых фишек» Emaar с агрессивной стратегией дизраптора Binghatti.",
      isPublished: false, // DRAFT
      publishedAt: new Date(),
      authorId: author.id,
      seoTitle: "Developer Hegemony 2026: Emaar vs. Binghatti | Institutional Analysis",
      seoDescription: "Comparative analysis of Dubai's developer giants in 2026. Emaar's equity shield vs. Binghatti's yield engine. Tactical portfolio allocation strategies.",
      imageUrl: 'https://via.placeholder.com/1200x630?text=Emaar+vs+Binghatti+2026'
    });

    const savedNews = await newsRepo.save(news);
    console.log(`✅ Table record created (DRAFT): "${savedNews.title}"`);

    // 3. Prepare Content Blocks
    const contents = [
      {
        order: 0,
        type: NewsContentType.TEXT,
        title: "Executive Summary: The 2026 Developer Hegemony — Stability vs. Velocity",
        titleRu: "Executive Summary: Девелоперская гегемония 2026 года — стабильность против скорости",
        description: "As we enter the second half of 2026, the Dubai real estate landscape has reached a state of structural maturity...",
        descriptionRu: "Входя во вторую половину 2026 года, ландшафт недвижимости Дубая достиг состояния структурной зрелости..."
      },
      {
        order: 1,
        type: NewsContentType.TEXT,
        title: "Data & Evidence: Quantifying Performance through DLD Pulse and Transactional Velocity",
        titleRu: "Data & Evidence: Количественная оценка эффективности через DLD Pulse и транзакционную скорость",
        description: "To substantiate the dominance of Emaar and Binghatti in 2026, we must look at the granular transactional data...",
        descriptionRu: "Чтобы обосновать доминирование Emaar и Binghatti в 2026 году, необходимо проанализировать гранулярные транзакционные данные..."
      },
      {
        order: 2,
        type: NewsContentType.IMAGE,
        title: "Institutional Developer Matrix: Construction Velocity vs. Secondary Market Premium",
        titleRu: "Институциональная матрица девелоперов: Скорость строительства против премии вторичного рынка",
        description: "A complex multi-axis scatter plot for institutional analysis comparing construction velocity and secondary market price premiums.",
        descriptionRu: "Сложный многоосевой график рассеяния для институционального анализа, сравнивающий скорость строительства и премии на вторичном рынке."
      },
      {
        order: 3,
        type: NewsContentType.TEXT,
        title: "Tactical Strategy: Surgical Portfolio Allocation and the Post-Handover Shield",
        titleRu: "Tactical Strategy: Хирургическое распределение портфеля и щит Post-Handover",
        description: "In the current 2026 climate, tactical deployment requires a hybrid approach between 'Equity Anchors' and 'Yield Accelerators'...",
        descriptionRu: "В текущем климате 2026 года тактическое развертывание требует гибридного подхода между «якорями капитала» и «акселераторами доходности»..."
      },
      {
        order: 4,
        type: NewsContentType.TEXT,
        title: "24-Month Outlook: The 2027 Infrastructure Kick and the Rise of ESG-Dominance",
        titleRu: "24-Month Outlook: Инфраструктурный скачок 2027 года и доминирование ESG",
        description: "Looking toward 2027 and 2028, the developer landscape will be fundamentally reshaped by two major catalysts...",
        descriptionRu: "Заглядывая в 2027 и 2028 годы, ландшафт девелопмента будет фундаментально перекроен двумя основными катализаторами..."
      }
    ];

    for (const data of contents) {
      const content = contentRepo.create({
        ...data,
        newsId: savedNews.id
      });
      await contentRepo.save(content);
    }

    console.log(`🚀 Article 8 saved successfully (DRAFT) with ${contents.length} blocks!`);
    await AppDataSource.destroy();
  } catch (err) {
    console.error('❌ Error:', err);
    process.exit(1);
  }
}

main();
