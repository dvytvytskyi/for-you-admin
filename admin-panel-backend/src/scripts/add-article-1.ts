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

    // 1. Check or create author
    let author = await authorRepo.findOneBy({ nameEn: 'For You Editorial Team' });
    if (!author) {
      console.log('Creating default author...');
      author = authorRepo.create({
        nameEn: 'For You Editorial Team',
        nameRu: 'Редакционная команда For You',
        position: 'Strategic Analytics Department',
        bio: 'Professional analytics and editorial team providing deep insights into Dubai Real Estate market trends, legal frameworks, and investment ROI.',
        socialLinks: {
          linkedin: 'https://linkedin.com/company/foryourealestate',
          instagram: 'https://instagram.com/foryou_realestate'
        }
      });
      await authorRepo.save(author);
    }

    // 2. Prepare News Data
    const titleEn = "Will the Dubai Real Estate Market Crash in 2026? Facts and Forecast Analysis";
    const titleRu = "Рынок Дубая 2026: Реальный прогноз или необоснованные страхи обвала?";
    const slug = slugify(titleEn, { lower: true, strict: true });

    const news = newsRepo.create({
      title: titleEn,
      titleRu: titleRu,
      slug: slug,
      description: "As we navigate the second quarter of 2026, the question on every investor's mind remains: Is the Dubai property market approaching a cliff?",
      descriptionRu: "Во втором квартале 2026 года информационное поле вокруг недвижимости Дубая снова переполнено заголовками о возможном «пузыре».",
      isPublished: true,
      publishedAt: new Date(),
      authorId: author.id,
      seoTitle: "Will Dubai Real Estate Market Crash in 2026? Expert Analysis & Forecast",
      seoDescription: "In-depth analysis of the 2026 Dubai property market cycles. Discover why current growth differs from 2008 and find high-yield investment points.",
      imageUrl: 'https://via.placeholder.com/1200x630?text=Market+Forecast+2026'
    });

    const savedNews = await newsRepo.save(news);
    console.log(`✅ Article created: "${savedNews.title}" (ID: ${savedNews.id})`);

    // 3. Prepare Content Blocks
    const contents = [
      {
        order: 0,
        type: NewsContentType.TEXT,
        title: "The 2026 Dubai Real Estate Forecast: Decoding the 'Crash' Narrative",
        titleRu: "Рынок Дубая 2026: Реальный прогноз или необоснованные страхи обвала?",
        description: "As we navigate the second quarter of 2026, the question on every investor's mind remains: Is the Dubai property market approaching a cliff? Having spent over a decade analyzing transaction cycles from Dubai Marina to the newer corridors of Dubai South, I see a market that is far from 'crashing.' Instead, we are witnessing a 'Great Correction of Quality.' The DFM Real Estate Index has stabilized at a healthy 2.4% quarterly growth, a stark contrast to the unsustainable double-digit spikes of the 2012-2014 era. Today’s market is fueled by transparency and the DLD’s stringent regulatory oversight, moving us away from speculative 'flipping' toward a mature, yield-driven ecosystem. If you are waiting for a 2008-style collapse, the data suggests you might be left on the sidelines while the institutional capital moves in.",
        descriptionRu: "Во втором квартале 2026 года информационное поле вокруг недвижимости Дубая снова переполнено заголовками о возможном «пузыре». Однако, анализируя циклы транзакций за последние 15 лет — от пиков в Dubai Marina до стремительного развития Dubai South — я вижу картину, которая кардинально отличается от кризисов прошлых лет. Мы не стоим на пороге краха; мы находимся в фазе «Великой коррекции качества». Текущий индекс недвижимости DFM (DFMREI) демонстрирует здоровый и контролируемый прирост на уровне 2,4% за квартал. Это зрелый рынок, где спекулятивный «хайп» сменился расчетливым инвестированием. Сегодняшняя стабильность поддерживается не только жестким регулированием со стороны DLD, но и органическим спросом со стороны резидентов, что делает текущий цикл гораздо более устойчивым, чем любой предыдущий."
      },
      {
        order: 1,
        type: NewsContentType.TEXT,
        title: "Why 2026 is Not 2008: The DLD Pulse and Cash-Rich Stability",
        titleRu: "Почему 2026 год — это не 2008-й: Аналитика данных DLD Pulse",
        description: "The fundamental difference in 2026 lies in the 'buyer profile.' According to recent DLD Pulse metrics, over 45% of transactions in the premium segment are now cash-based or involve significant equity, reducing the systemic risk of mortgage defaults that plagued the market two decades ago. We are seeing a massive influx of long-term residents spurred by the Golden Visa reforms, which has shifted demand from 'speculative off-plan' to 'end-user ready.' In high-demand hubs like Jumeirah Village Circle (JVC), quality 1-bedroom units are maintaining a floor price of 1.1M AED not because of hype, but because occupancy rates are hovering at a staggering 92%. When demand is backed by actual residents rather than paper-trading speculators, the 'bubble' narrative loses its foundation.",
        descriptionRu: "Главное отличие текущей ситуации заключается в профиле покупателя и структуре капитала. Если в 2008 году рынок держался на избыточном кредитном плече, то сегодня, согласно метрикам DLD Pulse, более 45% сделок в премиальном и среднем сегментах осуществляются за наличные или с минимальным привлечением заемных средств. Это резко снижает системный риск массовых дефолтов. Благодаря реформам «Золотых виз», Дубай превратился из города для краткосрочных инвестиций в место для долгосрочного проживания. В таких районах, как Jumeirah Village Circle (JVC), мы видим «ценовой пол» для качественных юнитов на уровне 1,1 млн AED. Эта цена подкреплена не маркетингом, а реальной заполняемостью объектов, которая в 2026 году держится на отметке 92%. Когда за объектом стоит реальный арендатор, а не перекупщик с контрактом на перепродажу, говорить о «пузыре» просто непрофессионально."
      },
      {
        order: 2,
        type: NewsContentType.TEXT,
        title: "Yield Analysis: The ROI Advantage in a Mature Market",
        titleRu: "Анализ доходности: ROI против мировой инфляции",
        description: "In 2026, Dubai remains one of the few global cities where net ROI significantly outpaces inflation and financing costs. While London and New York struggle to offer 3-4% net yields, Dubai’s prime communities like Business Bay and JVC are consistently delivering between 7% and 9%. This is driven by a structural undersupply of high-quality, managed apartments. Our internal agency data shows that projects with 'smart-home' integration and ESG certifications are commanding a 15% rental premium. Capital appreciation has slowed to a more sustainable 5-7% annually, which is exactly what a healthy market needs to prevent overheating. We are no longer in a 'get rich quick' market; we are in a 'build wealth safely' market.",
        descriptionRu: "В 2026 году Дубай остается редким примером мегаполиса, где чистая доходность (Net ROI) значительно перекрывает и инфляцию, и стоимость заемного капитала. Пока Лондон и Нью-Йорк стагнируют с показателями 3–4% годовых, ключевые сообщества Дубая — Business Bay, JVC и Arjan — стабильно генерируют от 7% до 9% чистыми. Причина проста: структурный дефицит готового жилья бизнес-класса. Наши внутренние данные показывают, что объекты с интеграцией систем «умного дома» и ESG-сертификатами получают арендную премию в размере 15% по сравнению с обычными ЖК. Рост капитализации (Capital Appreciation) замедлился до экологичных 5–7% в год. Это именно та «тихая гавань», которую ищет крупный капитал в периоды глобальной турбулентности. Мы больше не на рынке «быстрых иксов», мы на рынке создания защищенного семейного капитала."
      },
      {
        order: 3,
        type: NewsContentType.IMAGE,
        title: "Visualizing Stability: DFM Real Estate Index vs. Global Hubs 2024-2026",
        titleRu: "Сравнение индекса цен Дубая с мировыми финансовыми хабами (2024–2026)",
        imageUrl: "https://api.domain.com/uploads/news/market-stability-chart-2026.jpg",
        description: "Market Stability Chart 2026 Comparison",
        descriptionRu: "График стабильности рынка 2026 сравнение"
      },
      {
        order: 4,
        type: NewsContentType.TEXT,
        title: "The Broker’s Playbook: Navigating Q3 and Q4 2026",
        titleRu: "Стратегия инвестора: Куда направлять капитал в III и IV кварталах 2026 года",
        description: "If you are deploying capital today, my advice is surgical: ignore the 'noise' of the general market and focus on infrastructure-linked assets. The expansion of the Blue Line Metro and the full operational status of Al Maktoum International have created new 'islands of value.' Based on my recent dealings in the secondary market, I suggest looking for developers offering 60/40 payment plans or, ideally, post-handover structures. These plans allow you to leverage the property's rental income to pay down the remaining balance. We have noticed a trend where investors are exiting overpriced luxury branded residences and moving into 'High-Yield Mid-Market' assets in JVC and Arjan, where the price-to-rent ratio is most favorable for the investor.",
        descriptionRu: "Если вы планируете вход в рынок сегодня, мой совет будет максимально прагматичным: игнорируйте общий «шум» и сфокусируйтесь на активах, привязанных к новой инфраструктуре. Расширение «Голубой линии» метро и окончательный запуск новых терминалов в аэропорту Аль-Мактум создали локальные точки роста, которые еще не отыграны рынком на 100%. В текущих сделках я рекомендую отдавать предпочтение застройщикам с планами оплаты 60/40 или объектам с опцией Post-handover. Такая структура позволяет использовать арендный поток для покрытия оставшейся рассрочки, что фактически превращает объект в самоокупаемый актив. Мы также фиксируем отток капитала из переоцененных брендовых резиденций (Branded Residences) в сторону высокодоходного среднего сегмента (Mid-Market) в JVC и Maritime City, где соотношение цены за квадратный фут к арендной ставке является наиболее выгодным для собственника."
      },
      {
        order: 5,
        type: NewsContentType.TEXT,
        title: "Strategic Recommendation: Top Assets to Watch",
        titleRu: "Итоговые рекомендации: Топ-3 вектора для входа",
        description: "To maximize your position in 2026, focus on these three specific entry points:\n1. **High-Yield Mid-Market:** Studios in JVC starting from 1.1M AED. Target the 8-9% ROI through short-term holiday home management.\n2. **Strategic Off-Plan:** Focus on Binghatti or Emaar projects in Business Bay with a completion date in late 2027. This captures the final wave of the current construction cycle's price appreciation.\n3. **The 'New Dubai' Corridor:** Waterfront units in Maritime City. These remain undervalued compared to the Dubai Marina peaks but are seeing faster rental growth due to their proximity to the new business districts.\n\nConclusion: Dubai isn't crashing—it's growing up. The winners of 2026 will be those who value data over headlines.",
        descriptionRu: "Для того чтобы не просто сохранить, а приумножить капитал в конце 2026 года, я выделяю три приоритетных направления:\n1. **Высокодоходный Mid-Market:** Студии и 1-спальные апартаменты в JVC с порогом входа 1,1 млн AED. Здесь мы таргетируем 8-9% ROI за счет управления через Holiday Homes.\n2. **Стратегический Off-plan в Business Bay:** Объекты от топовых девелоперов (Emaar, Binghatti) со сдачей в конце 2027 года. Это позволяет зафиксировать цену до финального ввода ключевой инфраструктуры района.\n3. **Прибрежный коридор Maritime City:** Район остается недооцененным относительно пиковых цен в Dubai Marina и Palm Jumeirah, при этом показывает опережающий рост арендных ставок благодаря близости к новым деловым кластерам.\n\nПодводя итог: рынок Дубая не готовится к падению — он взрослеет. Победителями в 2026 году выйдут те инвесторы, которые опираются на фундаментальные данные DLD Pulse и экономическую логику, а не на панические заголовки в прессе."
      }
    ];

    for (const data of contents) {
      const content = contentRepo.create({
        ...data,
        newsId: savedNews.id
      });
      await contentRepo.save(content);
    }

    console.log(`🚀 Article 1 saved successfully with ${contents.length} blocks!`);
    await AppDataSource.destroy();
  } catch (err) {
    console.error('❌ Error saving article:', err);
    process.exit(1);
  }
}

main();
