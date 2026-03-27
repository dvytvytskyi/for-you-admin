const { S3Client, ListObjectsV2Command, PutObjectAclCommand } = require('@aws-sdk/client-s3');
const dotenv = require('dotenv');

dotenv.config({ path: '/Users/vytvytskyi/admin_for_you/admin-panel-backend/.env' });

const S3_CONFIG = {
    bucketName: process.env.S3_BUCKET_NAME || 'foryou',
    endpoint: process.env.S3_ENDPOINT || 'https://nbg1.your-objectstorage.com',
    region: process.env.S3_REGION || 'nbg1',
    accessKeyId: process.env.S3_ACCESS_KEY_ID || 'NO4DMOF39TSO56UNYT0O',
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || 'vmWltjsWNRcIFCUkz5HI51RQw0q21uSs9qB9cUkW',
};

const s3Client = new S3Client({
    region: S3_CONFIG.region,
    endpoint: S3_CONFIG.endpoint,
    credentials: {
        accessKeyId: S3_CONFIG.accessKeyId,
        secretAccessKey: S3_CONFIG.secretAccessKey,
    },
    forcePathStyle: true,
});

async function fixAcls() {
    console.log(`Starting to fix ACLs for bucket: ${S3_CONFIG.bucketName}...`);
    
    let continuationToken = undefined;
    let count = 0;
    
    do {
        const listCommand = new ListObjectsV2Command({
            Bucket: S3_CONFIG.bucketName,
            Prefix: 'property-finder/',
            ContinuationToken: continuationToken
        });
        
        const listResponse = await s3Client.send(listCommand);
        const contents = listResponse.Contents || [];
        
        for (const object of contents) {
            try {
                await s3Client.send(new PutObjectAclCommand({
                    Bucket: S3_CONFIG.bucketName,
                    Key: object.Key,
                    ACL: 'public-read'
                }));
                count++;
                if (count % 50 === 0) console.log(`Fixed ${count} objects...`);
            } catch (err) {
                console.error(`Failed to fix ACL for ${object.Key}:`, err.message);
            }
        }
        
        continuationToken = listResponse.NextContinuationToken;
    } while (continuationToken);
    
    console.log(`Finished! Total objects fixed: ${count}`);
}

fixAcls().catch(err => console.error(err));
