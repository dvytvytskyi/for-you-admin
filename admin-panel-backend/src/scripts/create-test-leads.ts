import axios from 'axios';
import { AppDataSource } from '../config/database';
import { AmoCrmService, AmoPipeline } from '../services/amo-crm.service';

const AMO_DOMAIN = process.env.AMO_DOMAIN || 'reforyou.amocrm.ru'; // Fallback or read from .env

async function main() {
    const manualToken = process.env.AMO_TOKEN;

    if (manualToken) {
        console.log('🔑 Using provided AMO_TOKEN (bypassing DB connection)...');
        try {
            await createLeadsWithToken(manualToken);
        } catch (e: any) {
            console.error('Error with manual token:', e.message);
        }
        return;
    }

    // If no token provided, try to use DB
    try {
        console.log('Initializing DataSource...');
        await AppDataSource.initialize();
        console.log('DataSource initialized.');

        const amoService = new AmoCrmService();

        console.log('Fetching pipelines...');
        const pipelines: AmoPipeline[] = await amoService.getPipelines();

        await processLeads(pipelines, async (leadData) => {
            return await amoService.createLead(leadData);
        });

    } catch (error) {
        console.error('Error:', error);
        console.log('\n💡 Hint: You can provide a token directly to bypass DB check:');
        console.log('AMO_TOKEN=eyJ... npx ts-node src/scripts/create-test-leads.ts');
    } finally {
        if (AppDataSource.isInitialized) {
            await AppDataSource.destroy();
        }
    }
}

async function createLeadsWithToken(token: string) {
    // Need to implement simplified fetch since we don't have AmoCrmService initialized with DB
    const headers = { Authorization: `Bearer ${token}` };
    const domain = AMO_DOMAIN;

    console.log(`Fetching pipelines from ${domain}...`);
    const response = await axios.get<{ _embedded: { pipelines: AmoPipeline[] } }>(
        `https://${domain}/api/v4/leads/pipelines`,
        { headers }
    );
    const pipelines = response.data._embedded?.pipelines || [];

    await processLeads(pipelines, async (leadData) => {
        const resp = await axios.post<{ _embedded: { leads: Array<{ id: number }> } }>(
            `https://${domain}/api/v4/leads`,
            [leadData],
            { headers }
        );
        return resp.data._embedded.leads[0].id;
    });
}

async function processLeads(pipelines: AmoPipeline[], createFn: (data: any) => Promise<number>) {
    // Collect all valid stages
    const allStages: { id: number; name: string; pipelineId: number }[] = [];

    for (const pipeline of pipelines) {
        if (pipeline._embedded && pipeline._embedded.statuses) {
            for (const status of pipeline._embedded.statuses) {
                allStages.push({
                    id: status.id,
                    name: status.name,
                    pipelineId: pipeline.id
                });
            }
        }
    }

    console.log(`Found ${allStages.length} stages in ${pipelines.length} pipelines.`);

    if (allStages.length === 0) {
        console.error('No stages found. Cannot create leads in unique columns.');
        return;
    }

    const leadsToCreate = 15;

    for (let i = 1; i <= leadsToCreate; i++) {
        // Round robin assignment of stages
        const stage = allStages[(i - 1) % allStages.length];

        const leadName = `Test ${i}`;
        const price = Math.floor(Math.random() * 100000) + 1000;

        console.log(`Creating lead "${leadName}" in stage "${stage.name}" (ID: ${stage.id}, Pipeline: ${stage.pipelineId})...`);

        try {
            const leadId = await createFn({
                name: leadName,
                price: price,
                status_id: stage.id,
                pipeline_id: stage.pipelineId
            });
            console.log(`✅ Created lead ${leadName} with ID: ${leadId}`);
        } catch (err: any) {
            console.error(`❌ Failed to create lead ${leadName}:`, err.response?.data || err.message);
        }
    }
}

main();
