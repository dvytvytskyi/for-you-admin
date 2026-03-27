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

        const richFields = 'amenities,description,age,category,type,developer,media,price,location,uaeEmirate,projectStatus,furnishingType,finishingType,compliance,street,parkingSlots,plotSize,size,assignedTo,createdBy,availableFrom,floorNumber,hasGarden,hasKitchen,hasParkingOnSite,landNumber,mojDeedLocationDescription,numberOfFloors,ownerName,plotNumber,unitNumber,bedrooms,bathrooms';
        
        console.log('Fetching one listing...');
        const resp = await axios.get(`${baseUrl}/listings`, { 
            headers, 
            params: { perPage: 1, include: richFields } 
        });

        const listing = resp.data.results?.[0];
        console.log('Listing Title:', listing?.title?.en);
        console.log('Location:', JSON.stringify(listing?.location, null, 2));
        
        if (listing?.project) {
            console.log('Project ID:', listing.project.id);
            console.log('Fetching Project Metadata...');
            const pResp = await axios.get(`${baseUrl}/projects/${listing.project.id}`, { headers });
            console.log('Project Metadata Location:', JSON.stringify(pResp.data.location, null, 2));
        }

    } catch (e) {
        console.error(e.response?.data || e.message);
    }
}

test();
