const { AppDataSource } = require('./dist/config/database');
const { Document } = require('./dist/entities/Document');
const cloudinary = require('./dist/config/cloudinary').default;
const axios = require('axios');

async function testDownload() {
    try {
        await AppDataSource.initialize();
        console.log('DB Connected');

        const docRepo = AppDataSource.getRepository(Document);
        const docs = await docRepo.find({
            order: { createdAt: 'DESC' },
            take: 1
        });

        if (!docs || docs.length === 0) {
            console.log('No documents found in DB to test.');
            return;
        }

        const doc = docs[0];
        console.log(`Testing document: ${doc.originalName} (ID: ${doc.id}, S3Key: ${doc.s3Key})`);

        const resourceType = doc.mimeType?.startsWith('image/') ? 'image' : 'raw';
        const extension = doc.originalName?.split('.').pop() || 'pdf';

        // Generate signed URL
        const downloadUrl = cloudinary.utils.private_download_url(doc.s3Key, extension, {
            resource_type: resourceType,
            expires_at: Math.floor(Date.now() / 1000) + 3600,
            attachment: true
        });

        console.log('Generated Signed URL:', downloadUrl);

        // Verify URL by making a HEAD request
        console.log('Verifying URL availability...');
        const response = await axios.get(downloadUrl, { responseType: 'stream' });

        if (response.status === 200) {
            console.log('SUCCESS: File is reachable and downloadable!');
            console.log('Content-Type:', response.headers['content-type']);
        } else {
            console.log(`FAILED: Received status ${response.status}`);
        }

    } catch (error) {
        console.error('Test Failed:', error.message);
        if (error.response) {
            console.error('Status:', error.response.status);
            // console.error('Data:', error.response.data);
        }
    } finally {
        if (AppDataSource.isInitialized) await AppDataSource.destroy();
    }
}

testDownload();
