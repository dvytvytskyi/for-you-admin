import { AppDataSource } from '../config/database';
import { AmoCrmService } from '../services/amo-crm.service';

const LEAD_ID = 40805781;

async function main() {
    try {
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
                notes: notes,
                events: events
            };

            console.log(JSON.stringify(result, null, 2));

        } catch (apiError: any) {
            console.error("API Error:", apiError.message);
            if (apiError.response) {
                console.error("Status:", apiError.response.status);
                console.error("Data:", JSON.stringify(apiError.response.data, null, 2));
            }
        }

    } catch (error) {
        console.error('System Error:', error);
    } finally {
        await AppDataSource.destroy();
    }
}

main();
