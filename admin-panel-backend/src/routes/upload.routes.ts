import express from 'express';
import multer from 'multer';
import sharp from 'sharp';
import { v4 as uuidv4 } from 'uuid';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { s3Client, S3_CONFIG } from '../config/s3';
import { authenticateJWT } from '../middleware/auth';
import { successResponse } from '../utils/response';

const router = express.Router();
router.use(authenticateJWT);

// Configure multer to use memory storage
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
  fileFilter: (req, file, cb) => {
    // Allow only images
    const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only images are allowed.'));
    }
  },
});

const docUpload = multer({
  storage,
  limits: {
    fileSize: 20 * 1024 * 1024, // 20MB
  },
});

/**
 * Helper to upload a file to S3
 */
async function uploadFileToS3(buffer: Buffer, key: string, contentType: string) {
  const command = new PutObjectCommand({
    Bucket: S3_CONFIG.bucketName,
    Key: key,
    Body: buffer,
    ContentType: contentType,
    ACL: 'public-read',
    CacheControl: 'public, max-age=31536000, immutable'
  });

  await s3Client.send(command);
  return `${S3_CONFIG.publicUrl}/${key}`;
}

/**
 * Process and upload image (both full and small versions)
 */
async function processAndUploadImage(file: Express.Multer.File, folder: string) {
  const fileUuid = uuidv4();
  const baseKey = `${folder}/${fileUuid}`;

  // 1. Full Version (Compressed but original size)
  const fullBuffer = await sharp(file.buffer)
    .jpeg({ quality: 80, mozjpeg: true, progressive: true })
    .toBuffer();

  const fullUrl = await uploadFileToS3(fullBuffer, `${baseKey}_full.jpg`, 'image/jpeg');

  // 2. Small Version (800px width)
  try {
    const smallBuffer = await sharp(file.buffer)
      .resize(800, null, { withoutEnlargement: true, fit: 'inside' })
      .jpeg({ quality: 80, mozjpeg: true, progressive: true })
      .toBuffer();

    await uploadFileToS3(smallBuffer, `${baseKey}_small.jpg`, 'image/jpeg');
  } catch (err) {
    console.error('Error creating small version, skipping:', err);
  }

  return fullUrl;
}

// Upload single image to S3
router.post('/image', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const folder = req.query.folder as string || 'properties';
    const url = await processAndUploadImage(req.file, folder);

    res.json(successResponse({ url }));
  } catch (error: any) {
    console.error('S3 upload error:', error);
    res.status(500).json({ error: error.message || 'Failed to upload image' });
  }
});

// Upload multiple images to S3
router.post('/images', upload.array('files', 20), async (req, res) => {
  try {
    const files = req.files as Express.Multer.File[];
    if (!files || files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }

    const folder = req.query.folder as string || 'properties';
    const uploadPromises = files.map(file => processAndUploadImage(file, folder));
    const urls = await Promise.all(uploadPromises);

    res.json(successResponse({ urls }));
  } catch (error: any) {
    console.error('S3 upload error:', error);
    res.status(500).json({ error: error.message || 'Failed to upload images' });
  }
});

// Upload document (PDF, Excel, etc.) to S3 AND create Document entity
router.post('/document', docUpload.single('file'), async (req: any, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const userId = req.user?.id || req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const fileUuid = uuidv4();
    const ext = req.file.originalname.split('.').pop();
    const key = `documents/${fileUuid}.${ext}`;

    const fileUrl = await uploadFileToS3(req.file.buffer, key, req.file.mimetype);

    // Create Document Entity
    const { AppDataSource } = require('../config/database');
    const { Document, DocumentType, DocumentCategory } = require('../entities/Document');

    const docRepo = AppDataSource.getRepository(Document);
    const newDoc = docRepo.create({
      type: DocumentType.OTHER,
      entityType: DocumentCategory.USER,
      entityId: String(userId),
      fileName: req.file.originalname,
      originalName: req.file.originalname,
      fileUrl: fileUrl,
      s3Key: key,
      mimeType: req.file.mimetype,
      fileSize: Number(req.file.size),
      uploadedBy: String(userId),
      isPublic: false
    });

    const savedDoc = await docRepo.save(newDoc);

    res.json(successResponse({
      id: savedDoc.id,
      url: fileUrl,
      originalName: req.file.originalname
    }));

  } catch (error: any) {
    console.error('S3 document upload error:', error);
    res.status(500).json({ error: error.message || 'Failed to upload document' });
  }
});

// Upload avatar and update user profile
router.post('/avatar', upload.single('file'), async (req: any, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const userId = req.user?.id || req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // Process Avatar (Fill 500x500)
    const avatarBuffer = await sharp(req.file.buffer)
      .resize(500, 500, { fit: 'cover', position: 'center' })
      .jpeg({ quality: 80, mozjpeg: true })
      .toBuffer();

    const fileUuid = uuidv4();
    const key = `avatars/${fileUuid}.jpg`;
    const fileUrl = await uploadFileToS3(avatarBuffer, key, 'image/jpeg');

    // Update User Entity
    const { AppDataSource } = require('../config/database');
    const { User } = require('../entities/User');

    const userRepo = AppDataSource.getRepository(User);
    await userRepo.update(userId, { avatar: fileUrl });

    res.json(successResponse({
      url: fileUrl,
      message: 'Avatar updated successfully'
    }));

  } catch (error: any) {
    console.error('Avatar upload error:', error);
    res.status(500).json({ error: error.message || 'Failed to upload avatar' });
  }
});

export default router;

