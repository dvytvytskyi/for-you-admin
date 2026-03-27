const axios = require('axios');
require('dotenv').config({ path: '/Users/vytvytskyi/admin_for_you/admin-panel-backend/.env' });

async function test() {
    const apiKey = process.env.PROPERTY_FINDER_API_KEY;
    const apiSecret = process.env.PROPERTY_FINDER_API_SECRET;
    const authUrl = 'https://atlas.propertyfinder.com/v1/auth/token';
    const baseUrl = 'https://atlas.propertyfinder.com/v1';

    try {
        const authResp = await axios.post(authUrl, { apiKey, apiSecret });
        const token = authResp.data.accessToken;
        const headers = {
            'Authorization': `Bearer ${token}`,
            'X-PF-Country': 'ae',
            'X-Domain': 'propertyfinder.ae'
        };

        const projectId = 14630; // From our psql check
        console.log(`Fetching project details for ID ${projectId}...`);
        const pResp = await axios.get(`${baseUrl}/projects/${projectId}`, { headers });
        console.log('Project Metadata Location:', JSON.stringify(pResp.data.location, null, 2));

    } catch (e) {
        console.error(e.response?.data || e.message);
    }
}

test();
