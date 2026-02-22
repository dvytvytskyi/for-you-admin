
import { ListObjectsV2Command, PutObjectAclCommand } from '@aws-sdk/client-s3';
import { s3Client, S3_CONFIG } from '../config/s3';

async function fixWebpPermissions() {
    try {
        console.log('🚀 Starting WebP permissions fix...');
        const bucket = S3_CONFIG.bucketName;

        let continuationToken: string | undefined = undefined;
        let processedCount = 0;
        let fixedCount = 0;

        do {
            const command = new ListObjectsV2Command({
                Bucket: bucket,
                ContinuationToken: continuationToken,
            });

            const response = await s3Client.send(command);
            continuationToken = response.NextContinuationToken;

            if (response.Contents) {
                for (const object of response.Contents) {
                    processedCount++;
                    if (object.Key?.toLowerCase().endsWith('.webp')) {
                        try {
                            // Set ACL to public-read
                            await s3Client.send(new PutObjectAclCommand({
                                Bucket: bucket,
                                Key: object.Key,
                                ACL: 'public-read'
                            }));
                            fixedCount++;
                            if (fixedCount % 10 === 0) process.stdout.write('.');
                        } catch (err) {
                            console.error(`\n❌ Failed to fix ${object.Key}:`, err);
                        }
                    }
                }
            }
        } while (continuationToken);

        console.log(`\n✅ Finished! Processed: ${processedCount}, Fixed WebP: ${fixedCount}`);

    } catch (error) {
        console.error('Fatal error:', error);
    }
}

fixWebpPermissions();
