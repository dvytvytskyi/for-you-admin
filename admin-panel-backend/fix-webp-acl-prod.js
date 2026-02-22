
const { s3Client, S3_CONFIG } = require('./dist/config/s3');
const { ListObjectsV2Command, PutObjectAclCommand } = require('@aws-sdk/client-s3');

async function fixAcl() {
    console.log('Starting ACL fix for WebP images in properties/ (Parallel)...');
    let token;
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

            const webpFiles = contents.filter(item => item.Key && item.Key.endsWith('.webp'));

            // Parallel processing in chunks of 20
            const batchSize = 20;
            for (let i = 0; i < webpFiles.length; i += batchSize) {
                const batch = webpFiles.slice(i, i + batchSize);
                await Promise.all(batch.map(async (item) => {
                    if (!item.Key) return;
                    try {
                        await s3Client.send(new PutObjectAclCommand({
                            Bucket: bucket,
                            Key: item.Key,
                            ACL: 'public-read'
                        }));
                        count++;
                    } catch (err) {
                        console.error(`Failed ${item.Key}:`, err.message);
                        errors++;
                    }
                }));
                process.stdout.write(`\rFixed ${count} files...`);
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
