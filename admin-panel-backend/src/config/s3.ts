import { S3Client } from '@aws-sdk/client-s3';

export const S3_CONFIG = {
    bucketName: 'foryou',
    endpoint: 'https://nbg1.your-objectstorage.com',
    region: 'nbg1',
    accessKeyId: 'NO4DMOF39TSO56UNYT0O',
    secretAccessKey: 'vmWltjsWNRcIFCUkz5HI51RQw0q21uSs9qB9cUkW',
    publicUrl: 'https://nbg1.your-objectstorage.com/foryou'
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
