
import { S3Client, ListObjectsV2Command } from '@aws-sdk/client-s3';

const BUCKET_NAME = 'foryou';
const S3_ENDPOINT = 'https://nbg1.your-objectstorage.com';
const S3_REGION = 'nbg1';

const s3Client = new S3Client({
    region: S3_REGION,
    endpoint: S3_ENDPOINT,
    credentials: {
        accessKeyId: 'NO4DMOF39TSO56UNYT0O',
        secretAccessKey: 'vmWltjsWNRcIFCUkz5HI51RQw0q21uSs9qB9cUkW',
    },
    forcePathStyle: true,
});

async function check() {
    try {
        console.log('Listing root...');
        const command = new ListObjectsV2Command({
            Bucket: BUCKET_NAME,
            Delimiter: '/'
        });
        const res = await s3Client.send(command);
        console.log('CommonPrefixes (Folders):', res.CommonPrefixes?.map(p => p.Prefix));

        // Check areas folder specifically
        console.log('Listing areas/...');
        const areasCmd = new ListObjectsV2Command({
            Bucket: BUCKET_NAME,
            Prefix: 'areas/',
            MaxKeys: 10
        });
        const areasRes = await s3Client.send(areasCmd);
        console.log('Files in areas/ :', areasRes.Contents?.map(c => c.Key));

    } catch (e) {
        console.error(e);
    }
}

check();
