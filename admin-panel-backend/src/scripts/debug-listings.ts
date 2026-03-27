import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

const API_KEY = process.env.PROPERTY_FINDER_API_KEY;
const API_SECRET = process.env.PROPERTY_FINDER_API_SECRET;
const BASE_URL = 'https://atlas.propertyfinder.com/v1';

async function authenticate() {
    const resp = await axios.post(`${BASE_URL}/auth/token`, {
        apiKey: API_KEY,
        apiSecret: API_SECRET
    });
    return resp.data.accessToken;
}

async function debug() {
    const token = await authenticate();
    const headers = { 'Authorization': `Bearer ${token}`, 'X-PF-Country': 'ae', 'X-Domain': 'propertyfinder.ae' };
    
    console.log('Fetching one listing for debug...');
    const resp = await axios.get(`${BASE_URL}/listings`, {
        headers,
        params: { perPage: 1 }
    });

    const listing = resp.data.results[0];
    console.log('--- LISTING STRUCTURE ---');
    console.log(JSON.stringify(listing, null, 2));
}

debug().catch(console.error);
