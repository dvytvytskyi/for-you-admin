
import { S3Client, ListBucketsCommand } from '@aws-sdk/client-s3';

const accessKeyId = 'NO4DMOF39TSO56UNYT0O';
const secretAccessKey = 'vmWltjsWNRcIFCUkz5HI51RQw0q21uSs9qB9cUkW';
const endpoint = 'https://nbg1.your-objectstorage.com';

async function testConnection() {
    const client = new S3Client({
        region: 'nbg1',
        endpoint: endpoint,
        credentials: {
            accessKeyId,
            secretAccessKey,
        },
        forcePathStyle: true, // Hetzner recommendation often requires this or supports virtual host. Let's try default or true.
    });

    try {
        const data = await client.send(new ListBucketsCommand({}));
        console.log('Success', data.Buckets);
    } catch (err) {
        console.error('Error', err);
    }
}

testConnection();
