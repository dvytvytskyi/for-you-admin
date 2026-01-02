import express from 'express';
import { AppDataSource } from '../config/database';
import { InvestorChatMessage, MessageType } from '../entities/InvestorChatMessage';
import { authenticateJWT, AuthRequest } from '../middleware/auth';
import { successResponse } from '../utils/response';
import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';
const { CloudinaryStorage } = require('multer-storage-cloudinary');

const router = express.Router();

// MULTER & CLOUDINARY SETUP
const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'investor_chat',
        resource_type: 'auto',
    },
});
const upload = multer({ storage });

router.use(authenticateJWT);

// Get messages
router.get('/', async (req, res) => {
    try {
        const chatRepo = AppDataSource.getRepository(InvestorChatMessage);
        const messages = await chatRepo.find({
            relations: ['sender', 'property'],
            order: { createdAt: 'ASC' },
            take: 100, // Last 100 messages for now
        });

        res.json(successResponse(messages));
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Post message
router.post('/', upload.single('file'), async (req: AuthRequest, res) => {
    try {
        const { content, type, propertyId } = req.body;
        const chatRepo = AppDataSource.getRepository(InvestorChatMessage);

        const message = new InvestorChatMessage();
        message.type = type || MessageType.TEXT;
        message.content = content;
        message.senderId = req.user!.id;

        if (propertyId) {
            message.propertyId = propertyId;
        }

        if (req.file) {
            message.fileUrl = (req.file as any).path;
            message.fileName = req.file.originalname;
            // If we have a file and type is text, maybe we should change type based on mime
            if (message.type === MessageType.TEXT) {
                if (req.file.mimetype.startsWith('image/')) {
                    message.type = MessageType.IMAGE;
                } else {
                    message.type = MessageType.FILE;
                }
            }
        }

        const savedMessage = await chatRepo.save(message);

        // Fetch again to get relations
        const completeMessage = await chatRepo.findOne({
            where: { id: savedMessage.id },
            relations: ['sender', 'property'],
        });

        res.json(successResponse(completeMessage));
    } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
    }
});

export default router;
