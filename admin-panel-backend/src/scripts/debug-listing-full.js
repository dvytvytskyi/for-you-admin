const axios = require('axios');

const API_KEY = 'OJIlJ.2x35n9PkjxHYTwuN5xI3UsqLxXqUR9c44R';
const API_SECRET = '1mAsFUrBgd0aPFHc6BvGja25DbKe1Bb5';
const BASE_URL = 'https://atlas.propertyfinder.com/v1';

async function testSingleListing() {
    console.log('--- AUTHENTICATING ---');
    try {
        const authResp = await axios.post(`${BASE_URL}/auth/token`, {
            apiKey: API_KEY,
            apiSecret: API_SECRET
        }).catch(err => {
            console.error('AUTH FAILED:', err.response ? err.response.data : err.message);
            throw err;
        });
        const token = authResp.data.accessToken;
        console.log('Got Access Token:', token.substring(0, 10), '...');

        const headers = { 
            'Authorization': 'Bearer ' + token, 
            'X-PF-Country': 'ae', 
            'X-Domain': 'propertyfinder.ae'
        };

        console.log(`--- FETCHING LISTINGS WITH FULL FIELDS ---`);
        const resp = await axios.get(`${BASE_URL}/listings`, { 
            headers,
            params: { 
                perPage: 1,
                include: 'amenities,description,age,category,type,developer,media,price,location,uaeEmirate,projectStatus,furnishingType,finishingType'
            } 
        });
        
        if (resp.data.results && resp.data.results.length > 0) {
            console.log('SUCCESS! Fields found in list:');
            const item = resp.data.results[0];
            console.log('Amenities:', item.amenities);
            console.log('Description:', item.description ? 'PRESENT' : 'MISSING');
            console.log('Age:', item.age);
            console.log('Full JSON Keys:', Object.keys(item).join(', '));
        } else {
            console.log('No results found.');
        }
    } catch (e) {
        console.error('ERROR STATUS:', e.response ? e.response.status : e.message);
        if (e.response && e.response.data) {
            console.error('API Error Response:', JSON.stringify(e.response.data, null, 2));
        }
    }
}

testSingleListing();
