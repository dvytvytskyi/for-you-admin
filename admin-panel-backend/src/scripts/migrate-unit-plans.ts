import 'reflect-metadata';
import { AppDataSource } from '../config/database';
import { PropertyUnit } from '../entities/PropertyUnit';
import { s3Client, S3_CONFIG } from '../config/s3';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import axios from 'axios';
import sharp from 'sharp';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';

async function migrateUnitPlans() {
  try {
    console.log('🔄 Connecting to database...');
    await AppDataSource.initialize();
    console.log('✅ Database connected');

    const unitRepository = AppDataSource.getRepository(PropertyUnit);

    const limit = process.env.LIMIT ? parseInt(process.env.LIMIT) : null;

    // Find all units with a planImage from Reelly S3 or other external sources
    let query = unitRepository.createQueryBuilder('unit')
      .where("unit.planImage IS NOT NULL")
      .andWhere("unit.planImage NOT LIKE :host", { host: `%${S3_CONFIG.publicUrl}%` });
    
    if (limit) {
        query = query.limit(limit);
    }

    const units = await query.getMany();

    console.log(`📊 Found ${units.length} units to migrate`);

    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < units.length; i++) {
      const unit = units[i];
      const imageUrl = unit.planImage;

      try {
        console.log(`[${i + 1}/${units.length}] Migrating: ${imageUrl}`);

        // Download image
        const response = await axios.get(imageUrl, { responseType: 'arraybuffer' });
        const buffer = Buffer.from(response.data);

        const fileName = `unit-plan-${unit.id}-${uuidv4()}.webp`;
        const folder = 'unit-plans';

        // Prepare sizes
        const sizes = [
            { name: 'original', width: null },
            { name: 'large', width: 1600 },
            { name: 'medium', width: 800 },
            { name: 'small', width: 400 }
        ];

        const uploadedUrls: any = {};

        for (const size of sizes) {
            let processedBuffer = buffer;
            if (size.width) {
                processedBuffer = await sharp(buffer)
                    .resize(size.width, null, { withoutEnlargement: true })
                    .webp({ quality: 80 })
                    .toBuffer();
            } else {
                processedBuffer = await sharp(buffer)
                    .webp({ quality: 90 })
                    .toBuffer();
            }

            const key = `${folder}/${size.name}/${fileName}`;
            
            await s3Client.send(new PutObjectCommand({
                Bucket: S3_CONFIG.bucketName,
                Key: key,
                Body: processedBuffer,
                ContentType: 'image/webp',
                ACL: 'public-read'
            }));

            uploadedUrls[size.name] = `${S3_CONFIG.publicUrl}/${key}`;
        }

        // Update unit in DB
        unit.planImages = uploadedUrls;
        unit.planImage = uploadedUrls.medium; // Use medium as the default
        await unitRepository.save(unit);

        successCount++;
        console.log(`   ✅ Success: ${uploadedUrls.medium}`);
      } catch (error: any) {
        errorCount++;
        console.error(`   ❌ Error migrating ${imageUrl}: ${error.message}`);
      }
    }

    console.log('\n📈 Final Summary:');
    console.log(`   ✅ Successfully migrated: ${successCount}`);
    console.log(`   ❌ Errors: ${errorCount}`);

    await AppDataSource.destroy();
    console.log('\n✅ Script completed');
    process.exit(0);
  } catch (error: any) {
    console.error('❌ Script failed:', error);
    process.exit(1);
  }
}

migrateUnitPlans();
