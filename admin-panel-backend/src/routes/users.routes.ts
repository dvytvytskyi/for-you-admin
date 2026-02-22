import express from 'express';
import { AppDataSource } from '../config/database';
import { User, UserRole, UserStatus } from '../entities/User';
import { AmoCrmUser } from '../entities/AmoCrmUser';
import { UserBlock } from '../entities/UserBlock';
import { authenticateJWT, authenticateAPIKey, AuthRequest } from '../middleware/auth';
import { successResponse, errorResponse } from '../utils/response';
import { sendBrokerInvitationEmail } from '../services/email.service';
import bcrypt from 'bcrypt';
import crypto from 'crypto';

const router = express.Router();

router.use((req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  if (apiKey) return authenticateAPIKey(req, res, next);
  return authenticateJWT(req, res, next);
});

/**
 * POST /api/users/invite-broker
 * Запросити брокера (створити користувача та прив'язати до AmoCRM)
 */
router.post('/invite-broker', async (req, res) => {
  try {
    // 1. Перевірка прав (має бути адмін)
    // TODO: Додати requireAdmin middleware, поки що просто перевіряємо роль з токена якщо він є
    // (але цей роут захищений authenticateJWT зверху)

    const { amoUserId, email, firstName, lastName, phone } = req.body;

    if (!amoUserId) {
      return res.status(400).json(errorResponse('amoUserId is required'));
    }

    const userRepository = AppDataSource.getRepository(User);
    const amoRepo = AppDataSource.getRepository(AmoCrmUser);

    // 2. Знаходимо AmoCRM користувача
    const amoUser = await amoRepo.findOne({
      where: { id: amoUserId },
      relations: ['user']
    });

    if (!amoUser) {
      return res.status(404).json(errorResponse('AmoCRM user not found'));
    }

    if (amoUser.user) {
      return res.status(400).json(errorResponse('This AmoCRM user is already linked to a system user'));
    }

    // 3. Визначаємо email та інші дані
    const targetEmail = email || amoUser.email;
    if (!targetEmail) {
      return res.status(400).json(errorResponse('Email is required (not found in AmoCRM profile)'));
    }

    const targetFirstName = firstName || amoUser.name.split(' ')[0] || 'Broker';
    const targetLastName = lastName || amoUser.name.split(' ').slice(1).join(' ') || '';
    const targetPhone = phone || amoUser.phone || '';

    // 4. Перевіряємо чи існує вже користувач з таким email
    const existingUser = await userRepository.findOne({
      where: { email: targetEmail }
    });

    if (existingUser) {
      return res.status(409).json(errorResponse('User with this email already exists'));
    }

    // 5. Генеруємо пароль
    const password = crypto.randomBytes(8).toString('hex'); // 16 symbol random password
    const passwordHash = await bcrypt.hash(password, 10);

    // 6. Створюємо користувача
    const newUser = userRepository.create({
      email: targetEmail,
      passwordHash,
      firstName: targetFirstName,
      lastName: targetLastName,
      phone: targetPhone,
      role: UserRole.BROKER,
      status: UserStatus.ACTIVE,
      amoCrmUser: amoUser // Link foreign key
    });

    await userRepository.save(newUser);

    // 7. Відправляємо email
    await sendBrokerInvitationEmail(targetEmail, password);

    // 8. Відповідь
    const { passwordHash: _, ...userWithoutPassword } = newUser;

    return res.status(201).json(successResponse({
      user: userWithoutPassword,
      linkedTo: {
        id: amoUser.id,
        name: amoUser.name,
        amoId: amoUser.amoUserId
      }
    }, 'Broker invited successfully'));

  } catch (error: any) {
    console.error('Error inviting broker:', error);
    return res.status(500).json(errorResponse(error.message || 'Failed to invite broker'));
  }
});

/**
 * GET /api/users/counts/investors
 * Отримати кількість інвесторів
 */
router.get('/counts/investors', async (req, res) => {
  try {
    const count = await AppDataSource.getRepository(User).count({
      where: { role: UserRole.INVESTOR }
    });
    return res.json(successResponse({ count }));
  } catch (error: any) {
    console.error('Error counting investors:', error);
    return res.status(500).json(errorResponse(error.message || 'Failed to count investors'));
  }
});

router.get('/', async (req, res) => {
  try {
    const users = await AppDataSource.getRepository(User).find({
      order: { createdAt: 'DESC' },
    });
    res.json(successResponse(users));
  } catch (error: any) {
    console.error('Error loading users:', error);
    res.status(500).json({ success: false, message: 'Failed to load users' });
  }
});

router.delete('/me', async (req: any, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'User not found' });
    }

    const userRepository = AppDataSource.getRepository(User);
    const user = await userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Soft delete
    user.status = UserStatus.DELETED;
    // Also clear sensitive data if needed, but for "soft delete" status is enough for login block
    // We can also anonymize email/phone to allow re-registration but keep history?
    // For now, simple status change as requested.

    await userRepository.save(user);

    return res.json(successResponse(null, 'Account deleted successfully'));
  } catch (error: any) {
    console.error('Error deleting account:', error);
    return res.status(500).json({ success: false, message: 'Failed to delete account' });
  }
});

/**
 * POST /api/users/block/:userId
 * Block a user
 */
router.post('/block/:userId', async (req: AuthRequest, res) => {
  try {
    const userId = req.user?.id;
    const blockedUserId = req.params.userId;

    if (!userId) {
      return res.status(401).json(errorResponse('User not authenticated'));
    }

    if (userId === blockedUserId) {
      return res.status(400).json(errorResponse('You cannot block yourself'));
    }

    const blockRepo = AppDataSource.getRepository(UserBlock);

    // Check if already blocked
    const existingBlock = await blockRepo.findOne({
      where: { userId, blockedUserId }
    });

    if (existingBlock) {
      return res.json(successResponse(null, 'User is already blocked'));
    }

    const newBlock = blockRepo.create({
      userId,
      blockedUserId
    });

    await blockRepo.save(newBlock);
    return res.json(successResponse(null, 'User blocked successfully'));
  } catch (error: any) {
    console.error('Error blocking user:', error);
    return res.status(500).json(errorResponse(error.message || 'Failed to block user'));
  }
});

/**
 * GET /api/users/me/blocks
 * Get list of blocked user IDs
 */
router.get('/me/blocks', async (req: AuthRequest, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json(errorResponse('User not authenticated'));
    }

    const blockRepo = AppDataSource.getRepository(UserBlock);
    const blocks = await blockRepo.find({
      where: { userId },
      select: ['blockedUserId']
    });

    const blockedIds = blocks.map(b => b.blockedUserId);
    return res.json(successResponse(blockedIds));
  } catch (error: any) {
    console.error('Error fetching blocked users:', error);
    return res.status(500).json(errorResponse(error.message || 'Failed to fetch blocked users'));
  }
});

/**
 * DELETE /api/users/block/:userId
 * Unblock a user
 */
router.delete('/block/:userId', async (req: AuthRequest, res) => {
  try {
    const userId = req.user?.id;
    const blockedUserId = req.params.userId;

    if (!userId) {
      return res.status(401).json(errorResponse('User not authenticated'));
    }

    const blockRepo = AppDataSource.getRepository(UserBlock);
    await blockRepo.delete({ userId, blockedUserId });

    return res.json(successResponse(null, 'User unblocked successfully'));
  } catch (error: any) {
    console.error('Error unblocking user:', error);
    return res.status(500).json(errorResponse(error.message || 'Failed to unblock user'));
  }
});


router.get('/:id', async (req, res) => {
  try {
    const user = await AppDataSource.getRepository(User).findOne({
      where: { id: req.params.id },
      relations: ['amoCrmUser'],
    });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    const { passwordHash, ...userWithoutPassword } = user;
    res.json(successResponse(userWithoutPassword));
  } catch (error: any) {
    console.error('Error loading user:', error);
    res.status(500).json({ success: false, message: 'Failed to load user' });
  }
});

router.patch('/:id/password', async (req, res) => {
  try {
    const { newPassword } = req.body;

    if (!newPassword || newPassword.length < 8) {
      return res.status(400).json({ success: false, message: 'Password must be at least 8 characters long' });
    }

    const userRepository = AppDataSource.getRepository(User);
    const user = await userRepository.findOne({
      where: { id: req.params.id },
    });

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Hash new password
    const passwordHash = await bcrypt.hash(newPassword, 10);
    user.passwordHash = passwordHash;

    await userRepository.save(user);

    res.json(successResponse(null, 'Password updated successfully'));
  } catch (error: any) {
    console.error('Error updating user password:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to update password' });
  }
});

router.patch('/:id', async (req, res) => {
  try {
    const { firstName, lastName, email, phone, status, role, avatar, licenseNumber, amoCrmUserId } = req.body;
    const userRepository = AppDataSource.getRepository(User);

    const user = await userRepository.findOne({
      where: { id: req.params.id },
    });

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Prevent changing role to ADMIN or from ADMIN
    if (role === 'ADMIN' || user.role === 'ADMIN') {
      return res.status(403).json({ success: false, message: 'Cannot modify ADMIN role' });
    }

    // Update fields if provided
    if (firstName !== undefined) user.firstName = firstName;
    if (lastName !== undefined) user.lastName = lastName;
    if (email !== undefined) user.email = email;
    if (phone !== undefined) user.phone = phone;
    if (status !== undefined) user.status = status;
    if (role !== undefined && role !== 'ADMIN') user.role = role;
    if (avatar !== undefined) user.avatar = avatar;
    if (licenseNumber !== undefined) user.licenseNumber = licenseNumber;

    if (amoCrmUserId !== undefined) {
      if (amoCrmUserId === '' || amoCrmUserId === null) {
        user.amoCrmUserId = null;
      } else {
        // Check if this CRM user is already linked to another system user
        const existingUserWithCrmId = await userRepository.findOne({
          where: { amoCrmUserId: amoCrmUserId },
        });

        // If found and it's NOT the current user, unlink it first (to avoid unique constraint error)
        if (existingUserWithCrmId && existingUserWithCrmId.id !== user.id) {
          console.log(`Unlinking CRM User ${amoCrmUserId} from User ${existingUserWithCrmId.id} to link to ${user.id}`);
          existingUserWithCrmId.amoCrmUserId = null; // or undefined, but null is safer for DB
          await userRepository.save(existingUserWithCrmId);
        }

        user.amoCrmUserId = amoCrmUserId;
      }
    }

    await userRepository.save(user);

    const { passwordHash, ...userWithoutPassword } = user;
    res.json(successResponse(userWithoutPassword, 'User updated successfully'));
  } catch (error: any) {
    console.error('Error updating user:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to update user' });
  }
});

// Add missing imports
import { PortfolioItem } from '../entities/PortfolioItem';
import { Favorite } from '../entities/Favorite';
import { Investment } from '../entities/Investment';
import { NotificationHistory } from '../entities/NotificationHistory';
import { NotificationSettings } from '../entities/NotificationSettings';
import { UserDevice } from '../entities/UserDevice';
import { PasswordResetToken } from '../entities/PasswordResetToken';
import { InvestorChatMessage } from '../entities/InvestorChatMessage';
import { AmoCrmToken } from '../entities/AmoCrmToken';
import { Collection } from '../entities/Collection';
import { CourseProgress } from '../entities/CourseProgress'; // Assuming has cascade but let's be safe or just imports
// CourseProgress has cascade onDelete, so we might skip it or include it to be sure.

router.delete('/:id', async (req, res) => {
  try {
    const userRepository = AppDataSource.getRepository(User);

    const user = await userRepository.findOne({
      where: { id: req.params.id },
    });

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Prevent deleting ADMIN users
    if (user.role === 'ADMIN') {
      return res.status(403).json({ success: false, message: 'Cannot delete ADMIN user' });
    }

    // Perform deletion in a transaction
    await AppDataSource.transaction(async (transactionalEntityManager) => {
      // Delete related records manually where Cascade is not guaranteed or to be safe

      // 1. Entities with userId
      await transactionalEntityManager.delete(PortfolioItem, { userId: user.id });
      await transactionalEntityManager.delete(Favorite, { userId: user.id });
      await transactionalEntityManager.delete(Investment, { userId: user.id });
      await transactionalEntityManager.delete(NotificationHistory, { userId: user.id });

      // NotificationSettings often has userId
      await transactionalEntityManager.delete(NotificationSettings, { userId: user.id });

      // UserDevice
      await transactionalEntityManager.delete(UserDevice, { userId: user.id });

      // PasswordResetToken
      await transactionalEntityManager.delete(PasswordResetToken, { userId: user.id });

      // AmoCrmToken
      await transactionalEntityManager.delete(AmoCrmToken, { userId: user.id });

      // Collection
      await transactionalEntityManager.delete(Collection, { userId: user.id });

      // Chat messages (sender)
      await transactionalEntityManager.delete(InvestorChatMessage, { senderId: user.id });

      // Finally delete the user
      await transactionalEntityManager.remove(user);
    });

    res.json(successResponse(null, 'User deleted successfully'));
  } catch (error: any) {
    console.error('Error deleting user:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to delete user' });
  }
});

export default router;

