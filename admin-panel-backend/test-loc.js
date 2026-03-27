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

        // Try to fetch location details for a known location ID
        const locId = 12940; // From previous run
        console.log(`Fetching location details for ID ${locId}...`);
        const locResp = await axios.get(`${baseUrl}/locations`, {
            headers,
            params: { 'filter[id]': locId }
        });
        console.log('Location Response:', JSON.stringify(locResp.data.data?.[0], null, 2));

    } catch (e) {
        console.error(e.response?.data || e.message);
    }
}

test();
