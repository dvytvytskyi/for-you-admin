const { AppDataSource } = require('./dist/config/database');
const { AmoCrmService } = require('./dist/services/amo-crm.service');

const LEAD_ID = 40805781;

async function main() {
    try {
        console.log('Initializing Data Source...');
        await AppDataSource.initialize();
        console.log('Database connected');

        const service = new AmoCrmService();
        console.log(`Fetching FULL details for Lead ID: ${LEAD_ID}...`);

        try {
            const [lead, notes, events] = await Promise.all([
                service.getLead(LEAD_ID),
                service.getLeadNotes(LEAD_ID),
                service.getLeadEvents(LEAD_ID)
            ]);

            const result = {
                lead: lead,
                notes_count: notes.length,
                events_count: events.length,
                // Limit output size for console
                notes_sample: notes.slice(0, 3),
                events_sample: events.slice(0, 3),
            };

            console.log("---------------------------------------------------");
            console.log(JSON.stringify(result, null, 2));
            console.log("---------------------------------------------------");

        } catch (apiError) {
            console.error("API Error:", apiError.message);
            if (apiError.response) {
                console.error("Status:", apiError.response.status);
                console.error("Data:", JSON.stringify(apiError.response.data, null, 2));
            }
        }

    } catch (error) {
        console.error('System Error:', error);
    } finally {
        if (AppDataSource.isInitialized) {
            await AppDataSource.destroy();
        }
    }
}

main();
