import { S3Client } from '@aws-sdk/client-s3';
import dotenv from 'dotenv';

dotenv.config();

export const S3_CONFIG = {
    bucketName: process.env.S3_BUCKET_NAME || 'foryou',
    endpoint: process.env.S3_ENDPOINT || 'https://nbg1.your-objectstorage.com',
    region: process.env.S3_REGION || 'nbg1',
    accessKeyId: process.env.S3_ACCESS_KEY_ID || 'NO4DMOF39TSO56UNYT0O',
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || 'vmWltjsWNRcIFCUkz5HI51RQw0q21uSs9qB9cUkW',
    publicUrl: process.env.S3_PUBLIC_URL || 'https://nbg1.your-objectstorage.com/foryou'
};

export const s3Client = new S3Client({
    region: S3_CONFIG.region,
    endpoint: S3_CONFIG.endpoint,
    credentials: {
        accessKeyId: S3_CONFIG.accessKeyId,
        secretAccessKey: S3_CONFIG.secretAccessKey,
    },
    forcePathStyle: true,
});
