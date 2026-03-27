const axios = require('axios');
require('dotenv').config();

async function debugRaw() {
    const API_KEY = process.env.PROPERTY_FINDER_API_KEY;
    const API_SECRET = process.env.PROPERTY_FINDER_API_SECRET;
    const BASE_URL = 'https://atlas.propertyfinder.com/v1';

    console.log('Authenticating...');
    const authResp = await axios.post(`${BASE_URL}/auth/token`, { apiKey: API_KEY, apiSecret: API_SECRET });
    const token = authResp.data.accessToken;

    console.log('Fetching ONE listing with ALL possible includes...');
    const resp = await axios.get(`${BASE_URL}/listings`, {
        headers: { 'Authorization': `Bearer ${token}`, 'X-PF-Country': 'ae', 'X-Domain': 'propertyfinder.ae' },
        params: {
            perPage: 1,
            include: 'amenities,description,age,category,type,developer,media,price,location,uaeEmirate,projectStatus,furnishingType,finishingType,compliance,street,parkingSlots,plotSize,size,assignedTo,createdBy,availableFrom,floorNumber,hasGarden,hasKitchen,hasParkingOnSite,landNumber,mojDeedLocationDescription,numberOfFloors,ownerName,plotNumber,unitNumber'
        }
    });

    const listing = resp.data.results[0];
    console.log('--- RAW DATA FROM PROPERTY FINDER ---');
    console.log(JSON.stringify(listing, null, 2));
}

debugRaw().catch(err => console.error(err.message));
