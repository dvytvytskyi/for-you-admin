import express from 'express';
import multer from 'multer';
import cloudinary from '../config/cloudinary';
import { authenticateJWT } from '../middleware/auth';
import { successResponse } from '../utils/response';

const router = express.Router();
router.use(authenticateJWT);

// Configure multer to use memory storage for Cloudinary upload
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
  fileFilter: (req, file, cb) => {
    const allowedMimes = [
      'application/pdf',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/csv',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];
    if (allowedMimes.includes(file.mimetype) || file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      // For Cloudinary 'raw' we can be more flexible
      cb(null, true);
    }
  },
});

// Upload single image to Cloudinary
router.post('/image', upload.single('file'), async (req, res) => {
  try {
    console.log('[Upload] POST /image - Headers:', req.headers['content-type']);
    if (!req.file) {
      console.error('[Upload] No file received in /image');
      return res.status(400).json({ error: 'No file uploaded' });
    }
    console.log('[Upload] File received:', req.file.originalname, req.file.mimetype, req.file.size);

    // Upload to Cloudinary
    const uploadResult = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: 'properties',
          resource_type: 'image',
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );

      uploadStream.end(req.file!.buffer);
    });

    const url = (uploadResult as any).secure_url;
    res.json(successResponse({ url }));
  } catch (error: any) {
    console.error('Cloudinary upload error:', error);
    res.status(500).json({ error: error.message || 'Failed to upload image' });
  }
});

// Upload multiple images to Cloudinary
router.post('/images', upload.array('files', 10), async (req, res) => {
  try {
    if (!req.files || (req.files as Express.Multer.File[]).length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }

    const files = req.files as Express.Multer.File[];
    const uploadPromises = files.map((file) => {
      return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            folder: 'properties',
            resource_type: 'image',
          },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        );

        uploadStream.end(file.buffer);
      });
    });

    const results = await Promise.all(uploadPromises);
    const urls = results.map((result: any) => result.secure_url);

    res.json(successResponse({ urls }));
  } catch (error: any) {
    console.error('Cloudinary upload error:', error);
    res.status(500).json({ error: error.message || 'Failed to upload images' });
  }
});

// Upload document (PDF, Excel, etc.) to Cloudinary AND create Document entity
router.post('/document', docUpload.single('file'), async (req: any, res) => {
  try {
    console.log('[Upload] POST /document - Headers:', req.headers['content-type']);
    if (!req.file) {
      console.error('[Upload] No file received in /document');
      return res.status(400).json({ error: 'No file uploaded' });
    }
    console.log('[Upload] Document received:', req.file.originalname, req.file.mimetype, req.file.size);

    const userId = req.user?.id || req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // Upload to Cloudinary
    const uploadResult = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: 'documents',
          resource_type: 'auto', // Auto handles PDF, Excel, etc.
          public_id: req.file?.originalname.split('.')[0] + '_' + Date.now(),
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );

      uploadStream.end(req.file!.buffer);
    });

    const fileUrl = (uploadResult as any).secure_url;
    const s3Key = (uploadResult as any).public_id;

    // Create Document Entity
    const { AppDataSource } = require('../config/database');
    const { Document, DocumentType, DocumentCategory } = require('../entities/Document');

    const docRepo = AppDataSource.getRepository(Document);
    const newDoc = docRepo.create({
      type: DocumentType.OTHER,
      entityType: DocumentCategory.USER, // Fixed: USER (all caps)
      entityId: String(userId),
      fileName: req.file.originalname,
      originalName: req.file.originalname,
      fileUrl: fileUrl,
      s3Key: s3Key,
      mimeType: req.file.mimetype,
      fileSize: Number(req.file.size),
      uploadedBy: String(userId),
      isPublic: false
    });

    const savedDoc = await docRepo.save(newDoc);

    // Return ID included
    res.json(successResponse({
      id: savedDoc.id,
      url: fileUrl,
      originalName: req.file.originalname
    }));

  } catch (error: any) {
    console.error('Cloudinary upload error:', error);
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

    // Upload to Cloudinary
    const uploadResult = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: 'avatars',
          resource_type: 'image',
          transformation: [
            { width: 500, height: 500, crop: 'fill', gravity: 'face' } // Auto-crop to face for avatars
          ]
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );

      uploadStream.end(req.file.buffer);
    });

    const fileUrl = (uploadResult as any).secure_url;

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

