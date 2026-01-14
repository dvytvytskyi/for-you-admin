const cloudinary = require('./dist/config/cloudinary').default;
const axios = require('axios');

async function testManual() {
    try {
        const s3Key = "documents/PRO PART - TRADE LICENSE Renewal_1767480602617";
        const extension = "pdf";

        console.log(`Generating signed URL for: ${s3Key}`);

        const downloadUrl = cloudinary.utils.private_download_url(s3Key, extension, {
            resource_type: 'raw',
            expires_at: Math.floor(Date.now() / 1000) + 3600,
            attachment: true
        });

        console.log('Generated Signed URL:', downloadUrl);

        console.log('Verifying availability...');
        const response = await axios.get(downloadUrl, { responseType: 'stream' });

        if (response.status === 200) {
            console.log('SUCCESS: File is reachable!');
        } else {
            console.log(`FAILED: Status ${response.status}`);
        }

    } catch (error) {
        console.error('Test Failed:', error.message);
    }
}

testManual();
