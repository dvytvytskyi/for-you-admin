import express from 'express';
import multer from 'multer';
import { randomUUID } from 'crypto';
import cloudinary from '../config/cloudinary';
import { AppDataSource } from '../config/database';
import { Document, DocumentType, DocumentCategory } from '../entities/Document';
import { User, UserRole } from '../entities/User';
import { authenticateJWT, requireAdmin, requireBrokerOrAdmin, AuthRequest } from '../middleware/auth';
import { successResponse, errorResponse } from '../utils/response';

const router = express.Router();

// Configure multer for document uploads (20MB limit, multiple file types)
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 20 * 1024 * 1024, // 20MB
  },
  fileFilter: (req, file, cb) => {
    // Allow PDF, Images, Word, Excel
    const allowedMimes = [
      'application/pdf',
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/webp',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Allowed: PDF, Images, Word, Excel'));
    }
  },
});

/**
 * POST /api/v1/documents/upload
 * Завантажити документ (тільки BROKER, ADMIN)
 */
router.post('/upload', authenticateJWT, requireBrokerOrAdmin, upload.single('file'), async (req: AuthRequest, res) => {
  try {
    if (!req.file) {
      return res.status(400).json(errorResponse('No file uploaded'));
    }

    const { type, entityType, entityId, description, isPublic } = req.body;
    const userId = req.user?.id || req.user?.userId;

    // Валідація
    if (!type || !Object.values(DocumentType).includes(type as DocumentType)) {
      return res.status(400).json(errorResponse(`Invalid document type. Must be one of: ${Object.values(DocumentType).join(', ')}`));
    }

    if (!entityType || !Object.values(DocumentCategory).includes(entityType as DocumentCategory)) {
      return res.status(400).json(errorResponse(`Invalid entity type. Must be one of: ${Object.values(DocumentCategory).join(', ')}`));
    }

    if (!entityId) {
      return res.status(400).json(errorResponse('entityId is required'));
    }

    // Завантажити файл на Cloudinary
    const fileName = `${randomUUID()}-${req.file.originalname}`;
    const folder = `documents/${entityType.toLowerCase()}/${entityId}`;

    const uploadResult = await new Promise<any>((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder,
          resource_type: 'auto', // auto-detect (image, raw for PDF, etc.)
          public_id: fileName.replace(/\.[^/.]+$/, ''), // remove extension
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );

      uploadStream.end(req.file!.buffer);
    });

    // Створити запис в БД
    const document = AppDataSource.getRepository(Document).create({
      type: type as DocumentType,
      entityType: entityType as DocumentCategory,
      entityId,
      fileName: uploadResult.public_id,
      originalName: req.file.originalname,
      fileUrl: uploadResult.secure_url,
      s3Key: uploadResult.public_id,
      mimeType: req.file.mimetype,
      fileSize: req.file.size,
      description: description || undefined,
      isPublic: isPublic === 'true' || isPublic === true,
      uploadedBy: userId!,
    });

    const savedDocument = await AppDataSource.getRepository(Document).save(document);

    // Завантажити з relations
    const documentWithRelations = await AppDataSource.getRepository(Document).findOne({
      where: { id: savedDocument.id },
      relations: ['uploader'],
    });

    res.json(successResponse(documentWithRelations));
  } catch (error: any) {
    console.error('Error uploading document:', error);
    res.status(500).json(errorResponse('Failed to upload document', error.message));
  }
});

/**
 * GET /api/v1/documents/entity/:entityType/:entityId
 * Отримати документи для сутності
 */
router.get('/entity/:entityType/:entityId', async (req, res) => {
  try {
    const { entityType, entityId } = req.params;

    if (!Object.values(DocumentCategory).includes(entityType as DocumentCategory)) {
      return res.status(400).json(errorResponse(`Invalid entity type. Must be one of: ${Object.values(DocumentCategory).join(', ')}`));
    }

    // Якщо є авторизація, показуємо всі документи
    // Якщо немає, показуємо тільки публічні
    const userId = (req as AuthRequest).user?.id || (req as AuthRequest).user?.userId;
    
    const where: any = {
      entityType: entityType as DocumentCategory,
      entityId,
    };

    // Якщо не авторизований, показуємо тільки публічні
    if (!userId) {
      where.isPublic = true;
    }

    const documents = await AppDataSource.getRepository(Document).find({
      where,
      relations: ['uploader'],
      order: { createdAt: 'DESC' },
    });

    res.json(successResponse(documents));
  } catch (error: any) {
    console.error('Error fetching documents:', error);
    res.status(500).json(errorResponse('Failed to fetch documents', error.message));
  }
});

/**
 * GET /api/v1/documents/:id
 * Отримати документ по ID
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = (req as AuthRequest).user?.id || (req as AuthRequest).user?.userId;

    const document = await AppDataSource.getRepository(Document).findOne({
      where: { id },
      relations: ['uploader', 'verifier'],
    });

    if (!document) {
      return res.status(404).json(errorResponse('Document not found'));
    }

    // Перевірка доступу: якщо не публічний і не власник - заборонено
    if (!document.isPublic && document.uploadedBy !== userId) {
      // Перевірити чи користувач ADMIN
      if (userId) {
        const user = await AppDataSource.getRepository(User).findOne({
          where: { id: userId },
        });
        if (user?.role !== UserRole.ADMIN) {
          return res.status(403).json(errorResponse('Access denied'));
        }
      } else {
        return res.status(403).json(errorResponse('Access denied'));
      }
    }

    res.json(successResponse(document));
  } catch (error: any) {
    console.error('Error fetching document:', error);
    res.status(500).json(errorResponse('Failed to fetch document', error.message));
  }
});

/**
 * PATCH /api/v1/documents/:id
 * Оновити метадані документа
 */
router.patch('/:id', authenticateJWT, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { description } = req.body;
    const userId = req.user?.id || req.user?.userId;

    const document = await AppDataSource.getRepository(Document).findOne({
      where: { id },
    });

    if (!document) {
      return res.status(404).json(errorResponse('Document not found'));
    }

    // Перевірка прав: тільки власник або ADMIN
    if (document.uploadedBy !== userId) {
      const user = await AppDataSource.getRepository(User).findOne({
        where: { id: userId },
      });
      if (user?.role !== UserRole.ADMIN) {
        return res.status(403).json(errorResponse('Access denied'));
      }
    }

    // Оновити опис
    if (description !== undefined) {
      document.description = description || undefined;
    }

    const updatedDocument = await AppDataSource.getRepository(Document).save(document);

    res.json(successResponse(updatedDocument));
  } catch (error: any) {
    console.error('Error updating document:', error);
    res.status(500).json(errorResponse('Failed to update document', error.message));
  }
});

/**
 * DELETE /api/v1/documents/:id
 * Видалити документ
 */
router.delete('/:id', authenticateJWT, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id || req.user?.userId;

    const document = await AppDataSource.getRepository(Document).findOne({
      where: { id },
    });

    if (!document) {
      return res.status(404).json(errorResponse('Document not found'));
    }

    // Перевірка прав: тільки власник або ADMIN
    if (document.uploadedBy !== userId) {
      const user = await AppDataSource.getRepository(User).findOne({
        where: { id: userId },
      });
      if (user?.role !== UserRole.ADMIN) {
        return res.status(403).json(errorResponse('Access denied'));
      }
    }

    // Видалити з Cloudinary
    try {
      await cloudinary.uploader.destroy(document.s3Key || document.fileName);
    } catch (cloudinaryError) {
      console.warn('Error deleting from Cloudinary:', cloudinaryError);
      // Продовжуємо видалення з БД навіть якщо помилка Cloudinary
    }

    // Видалити з БД
    await AppDataSource.getRepository(Document).remove(document);

    res.json(successResponse(null, 'Document deleted successfully'));
  } catch (error: any) {
    console.error('Error deleting document:', error);
    res.status(500).json(errorResponse('Failed to delete document', error.message));
  }
});

/**
 * POST /api/v1/documents/:id/verify
 * Верифікувати документ (тільки ADMIN)
 */
router.post('/:id/verify', authenticateJWT, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id || req.user?.userId;

    const document = await AppDataSource.getRepository(Document).findOne({
      where: { id },
    });

    if (!document) {
      return res.status(404).json(errorResponse('Document not found'));
    }

    document.isVerified = true;
    document.verifiedBy = userId!;
    document.verifiedAt = new Date();

    const updatedDocument = await AppDataSource.getRepository(Document).save(document);

    res.json(successResponse(updatedDocument));
  } catch (error: any) {
    console.error('Error verifying document:', error);
    res.status(500).json(errorResponse('Failed to verify document', error.message));
  }
});

/**
 * GET /api/v1/documents
 * Всі документи з фільтрами (тільки ADMIN)
 */
router.get('/', authenticateJWT, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { entityType, type, isVerified, page = '1', limit = '20' } = req.query;

    const queryBuilder = AppDataSource.getRepository(Document).createQueryBuilder('document');

    if (entityType && Object.values(DocumentCategory).includes(entityType as DocumentCategory)) {
      queryBuilder.where('document.entityType = :entityType', { entityType });
    }

    if (type && Object.values(DocumentType).includes(type as DocumentType)) {
      queryBuilder.andWhere('document.type = :type', { type });
    }

    if (isVerified !== undefined) {
      queryBuilder.andWhere('document.isVerified = :isVerified', { isVerified: isVerified === 'true' });
    }

    // Пагінація
    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const skip = (pageNum - 1) * limitNum;

    const [documents, total] = await queryBuilder
      .leftJoinAndSelect('document.uploader', 'uploader')
      .leftJoinAndSelect('document.verifier', 'verifier')
      .orderBy('document.createdAt', 'DESC')
      .skip(skip)
      .take(limitNum)
      .getManyAndCount();

    res.json(successResponse({
      data: documents,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum),
    }));
  } catch (error: any) {
    console.error('Error fetching documents:', error);
    res.status(500).json(errorResponse('Failed to fetch documents', error.message));
  }
});

export default router;

