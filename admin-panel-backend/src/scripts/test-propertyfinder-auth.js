const axios = require('axios');
require('dotenv').config();

async function testAuth() {
  const apiKey = process.env.PROPERTY_FINDER_API_KEY;
  const apiSecret = process.env.PROPERTY_FINDER_API_SECRET;
  const baseUrl = 'https://atlas.propertyfinder.com/v1';

  try {
    console.log('Testing PF Auth...');
    const response = await axios.post(`${baseUrl}/auth/token`, {
      apiKey,
      apiSecret
    });
    console.log('Auth Success! Token received:', response.data.accessToken.substring(0, 20) + '...');
    
    // Now try to search locations
    console.log('Testing Locations search...');
    const headers = { 
        'Authorization': `Bearer ${response.data.accessToken}`,
        'Accept': 'application/json'
    };
    const locResp = await axios.get(`${baseUrl}/locations`, {
       headers,
       params: { 'filter[type]': 'PROJECT', 'search': 'Dubai Marina' }
    });
    console.log('Locations search success! Found:', locResp.data.data.length);
    if(locResp.data.data.length > 0) {
        const id = locResp.data.data[0].id;
        console.log(`Testing Project details for ID ${id}...`);
        const pResp = await axios.get(`${baseUrl}/projects/${id}`, { headers });
        console.log('Project details success! Title:', pResp.data.title.en);
    }
  } catch (error) {
    if (error.response) {
      console.error('API Error:', error.response.status, error.response.data);
    } else {
      console.error('Error:', error.message);
    }
  }
}

testAuth();
