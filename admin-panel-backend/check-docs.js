const { AppDataSource } = require('./dist/config/database');
const { PortfolioItem } = require('./dist/entities/PortfolioItem');

async function checkPortfolioDocs() {
    try {
        await AppDataSource.initialize();
        console.log('DB Connected');

        const repo = AppDataSource.getRepository(PortfolioItem);
        const items = await repo.find();

        console.log(`Checking ${items.length} portfolio items...`);
        items.forEach(item => {
            if (item.documents && item.documents.length > 0) {
                console.log(`Item ID: ${item.id}, Docs:`, JSON.stringify(item.documents, null, 2));
            }
        });

    } catch (error) {
        console.error('Check Failed:', error);
    } finally {
        if (AppDataSource.isInitialized) await AppDataSource.destroy();
    }
}

checkPortfolioDocs();
