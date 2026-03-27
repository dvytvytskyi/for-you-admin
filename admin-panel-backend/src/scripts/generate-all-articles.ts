import 'reflect-metadata';
import axios from 'axios';
import { AppDataSource } from '../config/database';
import { Author } from '../entities/Author';
import { News } from '../entities/News';
import { NewsContent, NewsContentType } from '../entities/NewsContent';
import slugify from 'slugify';

const GROQ_API_KEY = 'CLEANED_SECRET';
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';

const TOPICS = [
  { id: 13, en: "UAE Geopolitical Stability and Market Demand", ru: "Геополитическая стабильность ОАЭ и спрос на рынке", day: 7 },
  { id: 14, en: "Dubai as a 'Safe Haven' During Global Crises", ru: "Дубай как «безопасная гавань» во время кризисов", day: 7 },
  { id: 15, en: "Economic Resilience: Diversifying Beyond Oil", ru: "Экономическая устойчивость: Диверсификация вне нефти", day: 8 },
  { id: 16, en: "Why You Need a Real Estate Lawyer in Dubai", ru: "Зачем вам нужен юрист по недвижимости в Дубае", day: 8 },
  { id: 17, en: "Role of Dubai Land Department: Protecting Investment", ru: "Роль Dubai Land Department: Защита инвестиций", day: 9 },
  { id: 18, en: "Residency Visa via Property Purchase: New Rules", ru: "Резидентская виза через покупку: Новые правила", day: 9 },
  { id: 19, en: "Step-by-Step Guide: Buying Property from Abroad", ru: "Пошаговый гайд: Как купить недвижимость удаленно", day: 10 },
  { id: 20, en: "Developer Due Diligence: Metrics Before Signing SPA", ru: "Проверка застройщика: Метрики перед подписью SPA", day: 10 },
  { id: 21, en: "Binghatti in Dubai: Why These Projects are Phenomenal", ru: "Binghatti в Дубае: Почему эти проекты — феномен", day: 11 },
  { id: 22, en: "Emaar Properties: Overview of Iconic Projects", ru: "Emaar Properties: Обзор знакових проектов", day: 11 },
  { id: 23, en: "Dubai New Horizons: Neighborhoods to Watch by 2030", ru: "Новые горизонты: Районы, которые изменят карту-2030", day: 12 },
  { id: 24, en: "Luxury Real Estate Dubai: Most Expensive Sales", ru: "Luxury Real Estate Dubai: Самые дорогие продажи года", day: 12 },
  { id: 25, en: "Living in Downtown vs. Dubai Marina: Pros & Cons", ru: "Жизнь в Downtown vs Dubai Marina: За и против", day: 13 },
  { id: 26, en: "Becoming a Successful Agent: Licensing & RERA Guide", ru: "Как стать успешным агентом: Гайд по RERA", day: 13 },
  { id: 27, en: "Dubai Real Estate Careers: Why Best Brokers Move Here", ru: "Карьера в недвижимости: Почему едут лучшие брокеры", day: 14 },
  { id: 28, en: "How to Choose the Best Real Estate Agency", ru: "Как выбрать лучшее агентство недвижимости", day: 14 },
  { id: 29, en: "How AI is Changing Real Estate Search in Dubai", ru: "Как ИИ меняет поиск недвижимости в Дубае", day: 15 },
  { id: 30, en: "Crypto & Dubai Real Estate 2026: Legal Nuances", ru: "Криптовалюта и недвижимость 2026: Нюансы", day: 15 }
];

async function generateArticle(topicEn: string, topicRu: string) {
  const prompt = `
Ты — Senior Dubai Real Estate Broker и ведущий аналитик рынка ОАЭ. Твой стиль: глубокая макроэкономическая аналитика, профессиональный экспертный тон, опора на жесткие факты.
ТВОЯ ЗАДАЧА: Написать масштабную аналитическую статью на тему: [${topicEn} / ${topicRu}]

ТЕХНИЧЕСКИЕ ТРЕБОВАНИЯ:
1. ГЛУБИНА: Минимум 300-400 слов на один блок (descriptionEn).
2. ЯЗЫК: Генерируй контент ОДНОВРЕМЕННО на Английском (En) и Русском (Ru) языках.
3. ПРОФЕССИОНАЛИЗМ: Используй LSI (DLD Pulse, ROI, Net yield, Secondary market).
4. БЕЗ КЛИШЕ.

ВЕРНИ ТОЛЬКО ЧИСТЫЙ JSON МАССИВ (без markdown оберток):
[
  {
    "type": "text",
    "titleEn": "...",
    "titleRu": "...",
    "descriptionEn": "...",
    "descriptionRu": "..."
  },
  {
    "type": "text",
    "titleEn": "...",
    "titleRu": "...",
    "descriptionEn": "...",
    "descriptionRu": "..."
  },
  {
    "type": "image",
    "titleEn": "Project Visual",
    "titleRu": "Визуал проекта",
    "descriptionEn": "Detailed visual description of a chart...",
    "descriptionRu": "Подробное описание графика..."
  },
  {
    "type": "text",
    "titleEn": "Tactical Strategy",
    "titleRu": "Тактическая стратегия",
    "descriptionEn": "...",
    "descriptionRu": "..."
  },
  {
    "type": "text",
    "titleEn": "24-Month Outlook",
    "titleRu": "Прогноз на 24 месяца",
    "descriptionEn": "...",
    "descriptionRu": "..."
  }
]
`;

  const response = await axios.post(GROQ_URL, {
    model: "llama-3.3-70b-versatile",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.6
  }, {
    headers: { 'Authorization': `Bearer ${GROQ_API_KEY}`, 'Content-Type': 'application/json' }
  });

  const content = response.data.choices[0].message.content.trim();
  const jsonStr = content.replace(/```json|```/g, '').trim();
  return JSON.parse(jsonStr);
}

async function run() {
  try {
    await AppDataSource.initialize();
    console.log('✅ Database connected');

    const authorRepo = AppDataSource.getRepository(Author);
    const newsRepo = AppDataSource.getRepository(News);
    const contentRepo = AppDataSource.getRepository(NewsContent);

    const author = await authorRepo.findOneBy({ nameEn: 'For You Editorial Team' });
    if (!author) throw new Error('Author not found');

    const targetArticles = TOPICS.slice(9); // From 22 onwards

    for (const topicData of targetArticles) {
      console.log(`\n⏳ Generating Bilingual Article ${topicData.id}: ${topicData.en}...`);
      
      const existing = await newsRepo.findOneBy({ title: topicData.en });
      if (existing) {
        console.log(`🗑️ Removing existing version...`);
        await newsRepo.remove(existing);
      }

      const blocks = await generateArticle(topicData.en, topicData.ru);
      if (!blocks || blocks.length === 0) continue;

      const descEn = (blocks[0].descriptionEn || blocks[0].description || "").split('.').slice(0, 2).join('.') + '.';
      const descRu = (blocks[0].descriptionRu || "").split('.').slice(0, 2).join('.') + '.';

      const news = newsRepo.create({
        title: topicData.en,
        titleRu: topicData.ru,
        slug: slugify(topicData.en, { lower: true, strict: true }),
        description: descEn,
        descriptionRu: descRu,
        isPublished: false,
        publishedAt: new Date(),
        authorId: author.id,
        seoTitle: `${topicData.en} | FOR YOU Real Estate 2026`,
        seoDescription: descEn.substring(0, 160),
        imageUrl: `https://via.placeholder.com/1200x630?text=News+Article+${topicData.id}`
      });

      const savedNews = await newsRepo.save(news);

      for (let i = 0; i < blocks.length; i++) {
        const b = blocks[i];
        const content = contentRepo.create({
          newsId: savedNews.id,
          order: i,
          type: b.type === 'image' ? NewsContentType.IMAGE : NewsContentType.TEXT,
          title: b.titleEn || b.title || "",
          titleRu: b.titleRu || "",
          description: b.descriptionEn || b.description || "",
          descriptionRu: b.descriptionRu || ""
        });
        await contentRepo.save(content);
      }

      console.log(`🚀 Article ${topicData.id} saved successfully!`);
      // Sleep for 10 seconds to avoid Groq rate limits (429)
      await new Promise(r => setTimeout(r, 10000));
    }

    await AppDataSource.destroy();
  } catch (err) {
    console.error('❌ Error:', err);
    process.exit(1);
  }
}

run();
