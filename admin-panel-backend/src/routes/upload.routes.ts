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

// Upload single image to Cloudinary
router.post('/image', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

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

export default router;

