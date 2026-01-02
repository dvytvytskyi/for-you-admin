
import { AppDataSource } from '../config/database';
import { AmoCrmLead } from '../entities/AmoCrmLead';
import { AmoCrmService } from '../services/amo-crm.service';

const BROKER_AMO_ID = 10688694;

async function enrich() {
    console.log('🚀 Starting lead enrichment...');

    try {
        if (!AppDataSource.isInitialized) {
            await AppDataSource.initialize();
            console.log('✅ Database connected');
        }

        const amoService = new AmoCrmService();
        const leadRepo = AppDataSource.getRepository(AmoCrmLead);

        // Get leads for the broker
        const leads = await leadRepo.find({
            where: { responsibleUserId: BROKER_AMO_ID },
            order: { createdAt: 'DESC' },
            take: 20 // Process last 20 leads to be safe
        });

        console.log(`ℹ️ Found ${leads.length} leads for broker.`);

        for (const [index, lead] of leads.entries()) {
            console.log(`\n🔹 Processing Lead: ${lead.name} (ID: ${lead.amoLeadId})`);

            try {
                // 1. Create a dummy Contact
                const contactName = `Guest ${index + 1} (${lead.name.substring(0, 10)}...)`;
                const contactId = await amoService.createContact({
                    name: contactName,
                    // customFields: ... (skip for now as we don't have field IDs)
                });

                // 2. Link Contact to Lead
                await amoService.linkContactToLead(lead.amoLeadId, contactId);

                // 3. Add a detailed Note
                const budget = lead.price ? `AED ${lead.price.toLocaleString()}` : 'Undisclosed';
                const preferences = ['Sea View', 'High Floor', 'Near Metro', 'Balcony', 'Gym Access'][Math.floor(Math.random() * 5)];
                const nationality = ['UK', 'France', 'Germany', 'Russia', 'India', 'UAE'][Math.floor(Math.random() * 6)];

                const noteText = `
⭐⭐⭐ CLIENT DETAILS ⭐⭐⭐
Name: ${contactName}
Nationality: ${nationality}
Budget: ${budget}
Preferences: ${preferences}
Phone: +971 50 ${Math.floor(1000000 + Math.random() * 9000000)}
Email: client${index}@example.com

💬 LATEST COMMENT:
Client is very interested in 2BR apartments in Downtown or Marina. Waiting for floor plans.
        `.trim();

                await amoService.addNote(lead.amoLeadId, 'leads', noteText);

                console.log(`✅ Enriched Lead ${lead.amoLeadId}`);

                // Small delay to be nice to API
                await new Promise(r => setTimeout(r, 500));

            } catch (err: any) {
                console.error(`❌ Failed to enrich lead ${lead.amoLeadId}:`, err.message);
            }
        }

    } catch (error) {
        console.error('❌ Error during enrichment:', error);
        process.exit(1);
    } finally {
        await AppDataSource.destroy();
        console.log('👋 Database disconnected');
    }
}

enrich();
