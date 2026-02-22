
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

async function countFolders() {
    let count = 0;
    let continuationToken;
    console.log('Counting folders in properties/...');
    try {
        do {
            const command = new ListObjectsV2Command({
                Bucket: BUCKET_NAME,
                Prefix: 'properties/',
                Delimiter: '/',
                ContinuationToken: continuationToken
            });
            const res: any = await s3Client.send(command);
            count += res.CommonPrefixes?.length || 0;
            continuationToken = res.NextContinuationToken;
            process.stdout.write('.');
        } while (continuationToken);
        console.log(`\nTotal folders in properties/: ${count}`);
    } catch (e) {
        console.error(e);
    }
}

countFolders();
