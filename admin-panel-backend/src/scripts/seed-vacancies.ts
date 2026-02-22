
import { AppDataSource } from '../config/database';
import { Vacancy, VacancyStatus } from '../entities/Vacancy';

async function seed() {
    console.log('🌱 Starting vacancies seed with translations...');

    try {
        if (!AppDataSource.isInitialized) {
            await AppDataSource.initialize();
            console.log('✅ Database connected');
        }

        const vacancyRepo = AppDataSource.getRepository(Vacancy);

        const vacancies = [
            {
                // Vacancy 1
                position_ru: 'Специалист по работе с базой клиентов | Dubai',
                position_en: 'Customer Database Specialist | Dubai',
                shortDescription_ru: '<p>Команда FOR YOU REAL ESTATE растет и мы ищем новых сотрудников.</p><p>Тебе подойдет эта роль, если ты хочешь перейти в сфере недвижимости постепенно и без потери финансовых ресурсов.</p><p><strong>Понятная карьерная траектория : Специалист по работе с базой → Ассистент Агента → Агент по недвижимости</strong></p>',
                shortDescription_en: '<p>The FOR YOU REAL ESTATE team is growing and we are looking for new employees.</p><p>This role is right for you if you want to transition into real estate gradually and without losing financial resources.</p><p><strong>Clear career trajectory: Database Specialist → Agent Assistant → Real Estate Agent</strong></p>',
                tasks_ru: '<ul><li>Обзвон базы данных через телефонию</li><li>Набор и привлечение заявок на новые объявления</li><li>Поиск объектов недвижимости под запрос клиента</li><li>Первичная коммуникация с собственниками и клиентами</li></ul>',
                tasks_en: '<ul><li>Calling the database through telephony</li><li>Collecting and attracting requests for new listings</li><li>Searching for real estate objects for client requests</li><li>Primary communication with owners and clients</li></ul>',
                requirements_ru: '<ul><li>Русский язык — свободно, English - свободно</li><li>Грамотная устная речь</li><li>Высокий уровень коммуникации и умение выстраивать диалог</li><li>Ориентированность на результат и выполнение KPI</li></ul>',
                requirements_en: '<ul><li>Russian language — fluent, English — fluent</li><li>Fluent spoken language</li><li>High level of communication and ability to build dialogue</li><li>Result-oriented and meeting KPIs</li></ul>',
                results_ru: '<p>Опубликованные объявления, соответствующие стандартам компании и KPI</p>',
                results_en: '<p>Published listings that meet company standards and KPIs</p>',
                offers_ru: '<ul><li>Фиксированную оплату в привязке к KPI</li><li>% от закрытых сделок по привлечённым листингам</li><li>Работу в формате Family Office, где клиенты получают все услуги в «одном окне»</li></ul>',
                offers_en: '<ul><li>Fixed payment linked to KPI</li><li>% of closed deals on attracted listings</li><li>Work in a Family Office format, where clients receive all services in "one window"</li></ul>',
                status: VacancyStatus.PUBLISHED
            },
            {
                // Vacancy 2
                position_ru: 'Conveyance Officer | Dubai',
                position_en: 'Conveyance Officer | Dubai',
                shortDescription_ru: '<p>Команда FOR YOU REAL ESTATE LLC растет и мы ищем в команду недвижимости опытного специалиста</p>',
                shortDescription_en: '<p>FOR YOU REAL ESTATE LLC team is growing and we are looking for an experienced specialist for the real estate team</p>',
                tasks_ru: '<ul><li>Полное сопровождение сделок с недвижимостью: купля-продажа и передача прав собственности.</li><li>Подготовка, проверка и верификация всех документов по сделке, включая MOU, договоры, NOC, SPA, title deed и сопутствующую документацию.</li><li>Взаимодействие с застройщиками, trustee offices, банками и государственными органами (DLD, Land Department и др.).</li><li>Контроль сроков сделок и обеспечение своевременного завершения регистрации и передачи прав.</li><li>Коммуникация с клиентами, брокерами и внутренними командами для решения возникающих вопросов и предоставления обновлений по статусу сделок.</li><li>Обеспечение полного соответствия сделок законодательству ОАЭ в сфере недвижимости и внутренним политикам компании.</li><li>Ведение точной и корректной документации и архивов по всем сделкам.</li></ul>',
                tasks_en: '<ul><li>Full support for real estate transactions: purchase, sale, and transfer of title.</li><li>Preparation, checking, and verification of all transaction documents, including MOU, contracts, NOC, SPA, title deed, and related documentation.</li><li>Interaction with developers, trustee offices, banks, and government authorities (DLD, Land Department, etc.).</li><li>Control of transaction deadlines and ensuring timely completion of registration and transfer of rights.</li><li>Communication with clients, brokers, and internal teams to resolve emerging issues and provide updates on transaction status.</li><li>Ensuring full compliance of transactions with UAE real estate legislation and internal company policies.</li><li>Maintenance of accurate and correct documentation and archives for all transactions.</li></ul>',
                requirements_ru: '<ul><li>Релевантный опыт Conveyancing в ОАЭ</li><li>Свободный английский язык</li><li>Знания AML / KYC и compliance-процедур</li><li>Понимание рисков, связанных с передачей прав собственности и корпоративными сделками</li><li>Высокий уровень внимательности к деталям и точности</li></ul>',
                requirements_en: '<ul><li>Relevant Conveyancing experience in the UAE</li><li>Fluent English</li><li>Knowledge of AML / KYC and compliance procedures</li><li>Understanding of risks associated with transfer of title and corporate transactions</li><li>High level of attention to detail and accuracy</li></ul>',
                results_ru: '<p>Юридически корректно, безопасно и своевременно завершённая сделка с недвижимостью, зарегистрированная в государственных органах, без рисков и претензий со стороны клиента или регуляторов</p>',
                results_en: '<p>A legally correct, safe, and timely completed real estate transaction, registered with government authorities, without risks and claims from the client or regulators</p>',
                offers_ru: '<ul><li>Готовы рассматривать разные варианты соглашений</li><li>Работу в формате Family Office, где клиенты получают все услуги в «одном окне»</li><li>Команду и руководителей, которые действительно готовы к новым идеям, росту и ценят экспертизу</li></ul>',
                offers_en: '<ul><li>Ready to consider different arrangement options</li><li>Work in a Family Office format, where clients receive all services in "one window"</li><li>A team and leaders who are truly ready for new ideas, growth, and value expertise</li></ul>',
                status: VacancyStatus.PUBLISHED
            },
            {
                // Vacancy 3
                position_ru: 'Head of Marketing | Dubai',
                position_en: 'Head of Marketing | Dubai',
                shortDescription_ru: '<p>FOR YOU Real Estate — бутиковое агентство недвижимости в Дубае, работающее с жилой и инвестиционной недвижимостью. Мы находимся в стадии активного роста и ищем сильного Head of Marketing, который сможет выстроить системный маркетинг с фокусом на результат.</p><p>Основная цель — стабильный поток качественных, квалифицированных лидов, которые в дальнейшем конвертируются в сделки. Маркетинг должен быть не «про охваты», а про измеримый бизнес-результат.</p>',
                shortDescription_en: '<p>FOR YOU Real Estate is a boutique real estate agency in Dubai, working with residential and investment real estate. We are in a stage of active growth and are looking for a strong Head of Marketing who can build systematic marketing with a focus on results.</p><p>The main goal is a stable flow of high-quality, qualified leads that are subsequently converted into deals. Marketing should not be about "reach", but about measurable business results.</p>',
                tasks_ru: '<ul><li>Разработка и реализация маркетинговой стратегии компании с фокусом на лидогенерацию</li><li>Построение и оптимизация воронки привлечения клиентов: от первого касания до передачи лида в отдел продаж</li><li>Выбор, тестирование и масштабирование маркетинговых каналов (онлайн и офлайн)</li><li>Управление маркетинговым бюджетом: планирование, контроль, оптимизация ROI</li><li>Запуск и контроль performance-каналов (paid ads, лид-формы, лендинги, CPA и др.)</li><li>Аналитика: отслеживание CPL, CAC, качества лидов, конверсий в сделки</li><li>Взаимодействие с отделом продаж: настройка процессов передачи лидов и обратной связи по их качеству</li><li>Управление подрядчиками и/или внутренней командой (дизайнеры, таргетологи, агентства)</li><li>Постоянное тестирование гипотез и улучшение маркетинговых процессов</li></ul>',
                tasks_en: '<ul><li>Development and implementation of the company\'s marketing strategy with a focus on lead generation</li><li>Building and optimizing the customer acquisition funnel: from first touch to transferring the lead to the sales department</li><li>Selection, testing, and scaling of marketing channels (online and offline)</li><li>Management of the marketing budget: planning, control, ROI optimization</li><li>Launching and controlling performance channels (paid ads, lead forms, landing pages, CPA, etc.)</li><li>Analytics: tracking CPL, CAC, lead quality, conversions into deals</li><li>Interaction with the sales department: setting up lead transfer processes and feedback on their quality</li><li>Management of contractors and/or the internal team (designers, targetologists, agencies)</li><li>Constant hypothesis testing and improvement of marketing processes</li></ul>',
                requirements_ru: '<ul><li>Опыт работы на позиции Head of Marketing / Marketing Lead / Senior Marketing Manager</li><li>Опыт построения маркетинга с нуля или его системной перестройки</li><li>Практический опыт лидогенерации в недвижимости, инвестициях, luxury-сегменте или смежных нишах будет большим плюсом</li><li>Понимание специфики рынка недвижимости Дубая или готовность быстро в неё погрузиться</li><li>Ориентация на цифры, результат и бизнес-метрики</li><li>Умение самостоятельно принимать решения и нести за них ответственность</li></ul>',
                requirements_en: '<ul><li>Experience in a Head of Marketing / Marketing Lead / Senior Marketing Manager position</li><li>Experience in building marketing from scratch or its systematic restructuring</li><li>Practical experience in lead generation in real estate, investments, luxury segment or related niches will be a big plus</li><li>Understanding of the Dubai real estate market specifics or readiness to quickly dive into it</li><li>Orientation to numbers, results, and business metrics</li><li>Ability to independently make decisions and be responsible for them</li></ul>',
                results_ru: '<ul><li>Performance marketing (Meta Ads, Google Ads, lead forms, landing pages)</li><li>Управление маркетинговым бюджетом и оптимизация затрат</li><li>Аналитика и работа с метриками (CPL, CAC, CR, LTV)</li><li>Опыт работы с CRM и системами аналитики</li><li>Навыки построения воронок продаж и лид-менеджмента</li><li>A/B тестирование, гипотезы, масштабирование успешных связок</li><li>Управление подрядчиками и техническими специалистами</li></ul>',
                results_en: '<ul><li>Performance marketing (Meta Ads, Google Ads, lead forms, landing pages)</li><li>Marketing budget management and cost optimization</li><li>Analytics and work with metrics (CPL, CAC, CR, LTV)</li><li>Experience with CRM and analytical systems</li><li>Sales funnel building and lead management skills</li><li>A/B testing, hypotheses, scaling successful combinations</li><li>Management of contractors and technical specialists</li></ul>',
                offers_ru: '<ul><li>Гибкий формат работы: полный удаленный формат или офисный</li><li>Комфортный пакет оплаты</li><li>Молодую, гибкую, быструю команду</li><li>Собственник, который ценит экспертность, доверяет и поддерживает инициативы</li><li>Возможность влиять на результат, а не просто “тушить пожары”</li></ul>',
                offers_en: '<ul><li>Flexible work format: full remote or office</li><li>Comfortable payment package</li><li>A young, flexible, fast team</li><li>An owner who values expertise, trusts, and supports initiatives</li><li>The opportunity to influence the result, and not just "put out fires"</li></ul>',
                status: VacancyStatus.PUBLISHED
            }
        ];

        for (const item of vacancies) {
            let vacancy = await vacancyRepo.findOne({ where: { position_ru: item.position_ru } });

            if (vacancy) {
                console.log(`📝 Updating vacancy "${item.position_ru}"...`);
                vacancyRepo.merge(vacancy, item);
                // Also update legacy fields for compatibility
                vacancy.position = item.position_en;
                vacancy.shortDescription = (item.shortDescription_en || item.shortDescription_ru).replace(/<[^>]*>/g, '').substring(0, 255);
                vacancy.tasks = item.tasks_en || item.tasks_ru;
                vacancy.requirements = item.requirements_en || item.requirements_ru;
                vacancy.results = item.results_en || item.results_ru;
                vacancy.offers = item.offers_en || item.offers_ru;
            } else {
                console.log(`🆕 Creating vacancy "${item.position_ru}"...`);
                vacancy = vacancyRepo.create(item);
                // Also set legacy fields for compatibility
                vacancy.position = item.position_en;
                vacancy.shortDescription = (item.shortDescription_en || item.shortDescription_ru).replace(/<[^>]*>/g, '').substring(0, 255);
                vacancy.tasks = item.tasks_en || item.tasks_ru;
                vacancy.requirements = item.requirements_en || item.requirements_ru;
                vacancy.results = item.results_en || item.results_ru;
                vacancy.offers = item.offers_en || item.offers_ru;
            }

            await vacancyRepo.save(vacancy);
            console.log(`✅ Vacancy "${item.position_ru}" saved`);
        }

        console.log('✅ Vacancies seeded/updated successfully');

    } catch (error) {
        console.error('❌ Error during vacancies seeding:', error);
        process.exit(1);
    } finally {
        await AppDataSource.destroy();
        console.log('👋 Database disconnected');
    }
}

seed();
