import 'reflect-metadata';
import { AppDataSource } from '../config/database';
import { Area } from '../entities/Area';
import cloudinary from '../config/cloudinary';
import * as https from 'https';
import * as http from 'http';

interface ImageUploadResult {
  originalUrl: string;
  cloudinaryUrl: string | null;
  error?: string;
}

// Helper function to download image from URL
async function downloadImage(url: string): Promise<Buffer | null> {
  return new Promise((resolve) => {
    const protocol = url.startsWith('https') ? https : http;
    const request = protocol.get(url, (response) => {
      if (response.statusCode !== 200) {
        console.error(`  ❌ Failed to download ${url}: HTTP ${response.statusCode}`);
        resolve(null);
        return;
      }

      const chunks: Buffer[] = [];
      response.on('data', (chunk: Buffer) => {
        chunks.push(chunk);
      });

      response.on('end', () => {
        resolve(Buffer.concat(chunks));
      });
    });

    request.on('error', (error: Error) => {
      console.error(`  ❌ Failed to download ${url}:`, error.message);
      resolve(null);
    });

    request.setTimeout(30000, () => {
      request.destroy();
      console.error(`  ❌ Download timeout for ${url}`);
      resolve(null);
    });
  });
}

// Helper function to upload image to Cloudinary
async function uploadToCloudinary(imageBuffer: Buffer, areaName: string, index: number): Promise<string | null> {
  return new Promise((resolve) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: 'areas',
        public_id: `${areaName.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${index}`,
        resource_type: 'image',
        overwrite: false,
      },
      (error, result) => {
        if (error) {
          console.error(`  ❌ Cloudinary upload error:`, error.message);
          resolve(null);
        } else {
          resolve(result?.secure_url || null);
        }
      }
    );

    uploadStream.end(imageBuffer);
  });
}

// Main migration function
async function migrateAreaImages() {
  try {
    console.log('🔄 Connecting to database...');
    await AppDataSource.initialize();
    console.log('✅ Database connected\n');

    const areaRepository = AppDataSource.getRepository(Area);

    // Get all areas with images
    const areas = await areaRepository.find({
      where: {},
    });

    console.log(`📊 Found ${areas.length} areas to check\n`);

    let totalAreasProcessed = 0;
    let totalAreasUpdated = 0;
    let totalImagesProcessed = 0;
    let totalImagesUploaded = 0;
    let totalErrors = 0;

    for (const area of areas) {
      if (!area.images || area.images.length === 0) {
        continue;
      }

      totalAreasProcessed++;
      console.log(`\n📍 Processing area: ${area.nameEn} (${area.images.length} images)`);

      const uploadResults: ImageUploadResult[] = [];
      let hasChanges = false;

      // Process each image
      for (let i = 0; i < area.images.length; i++) {
        const originalUrl = area.images[i];
        
        // Skip if already Cloudinary URL
        if (originalUrl.includes('res.cloudinary.com')) {
          console.log(`  ✅ Image ${i + 1} already on Cloudinary: ${originalUrl.substring(0, 60)}...`);
          uploadResults.push({
            originalUrl,
            cloudinaryUrl: originalUrl,
          });
          continue;
        }

        // Skip if not a valid URL
        if (!originalUrl.startsWith('http')) {
          console.log(`  ⚠️  Image ${i + 1} is not a valid URL: ${originalUrl}`);
          uploadResults.push({
            originalUrl,
            cloudinaryUrl: null,
            error: 'Invalid URL',
          });
          totalErrors++;
          continue;
        }

        console.log(`  📥 Downloading image ${i + 1}/${area.images.length}...`);
        const imageBuffer = await downloadImage(originalUrl);

        if (!imageBuffer) {
          uploadResults.push({
            originalUrl,
            cloudinaryUrl: null,
            error: 'Download failed',
          });
          totalErrors++;
          continue;
        }

        console.log(`  ☁️  Uploading to Cloudinary...`);
        const cloudinaryUrl = await uploadToCloudinary(imageBuffer, area.nameEn, i);

        if (cloudinaryUrl) {
          console.log(`  ✅ Uploaded: ${cloudinaryUrl.substring(0, 60)}...`);
          uploadResults.push({
            originalUrl,
            cloudinaryUrl,
          });
          totalImagesUploaded++;
          hasChanges = true;
        } else {
          console.log(`  ❌ Upload failed`);
          uploadResults.push({
            originalUrl,
            cloudinaryUrl: null,
            error: 'Upload failed',
          });
          totalErrors++;
        }

        totalImagesProcessed++;

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      // Update area with new URLs (use Cloudinary URLs where available, keep originals if upload failed)
      if (hasChanges) {
        const newImages = uploadResults.map(result => 
          result.cloudinaryUrl || result.originalUrl
        ).filter(Boolean) as string[];

        // Use raw query to update array properly
        await AppDataSource.query(
          `UPDATE areas SET images = $1 WHERE id = $2`,
          [newImages, area.id]
        );
        console.log(`  ✅ Area updated with ${newImages.length} images`);
        totalAreasUpdated++;
      } else {
        console.log(`  ℹ️  No changes needed`);
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ MIGRATION COMPLETED!');
    console.log('='.repeat(60));
    console.log(`📊 Areas processed: ${totalAreasProcessed}`);
    console.log(`✅ Areas updated: ${totalAreasUpdated}`);
    console.log(`📷 Images processed: ${totalImagesProcessed}`);
    console.log(`☁️  Images uploaded to Cloudinary: ${totalImagesUploaded}`);
    console.log(`❌ Errors: ${totalErrors}`);
    console.log('='.repeat(60) + '\n');

    await AppDataSource.destroy();
    process.exit(0);
  } catch (error: any) {
    console.error('❌ Error migrating area images:', error);
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
    }
    process.exit(1);
  }
}

migrateAreaImages();

