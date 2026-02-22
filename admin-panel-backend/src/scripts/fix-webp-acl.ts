
import { s3Client, S3_CONFIG } from '../config/s3';
import { ListObjectsV2Command, PutObjectAclCommand } from '@aws-sdk/client-s3';

async function fixAcl() {
    console.log('Starting ACL fix for WebP images in properties/...');
    let token: string | undefined;
    const bucket = S3_CONFIG.bucketName;
    let count = 0;
    let errors = 0;

    try {
        do {
            const cmd = new ListObjectsV2Command({
                Bucket: bucket,
                Prefix: 'properties/',
                ContinuationToken: token
            });
            const response = await s3Client.send(cmd);
            token = response.NextContinuationToken;

            const contents = response.Contents || [];
            if (contents.length === 0) continue;

            const webpFiles = contents.filter(item => item.Key?.endsWith('.webp'));

            // Process in chunks to avoid rate limits? standard parallel is fine
            // Sequential is safer for rate limits
            for (const item of webpFiles) {
                if (!item.Key) continue;
                try {
                    await s3Client.send(new PutObjectAclCommand({
                        Bucket: bucket,
                        Key: item.Key,
                        ACL: 'public-read'
                    }));
                    count++;
                    if (count % 100 === 0) console.log(`Fixed ${count} files...`);
                } catch (err) {
                    console.error(`Failed ${item.Key}:`, err);
                    errors++;
                }
            }
        } while (token);

        console.log(`\n✅ Finished. Fixed ACL for ${count} files. Errors: ${errors}`);
        process.exit(0);
    } catch (error) {
        console.error('Fatal error:', error);
        process.exit(1);
    }
}

fixAcl();
