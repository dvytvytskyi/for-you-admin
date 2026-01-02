import express from 'express';
import { AppDataSource } from '../config/database';
import { User, UserRole, UserStatus } from '../entities/User';
import { AmoCrmUser } from '../entities/AmoCrmUser';
import { authenticateJWT, authenticateAPIKey } from '../middleware/auth';
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

router.get('/:id', async (req, res) => {
  try {
    const user = await AppDataSource.getRepository(User).findOne({
      where: { id: req.params.id },
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
      user.amoCrmUserId = amoCrmUserId === '' ? null : amoCrmUserId;
    }

    await userRepository.save(user);

    const { passwordHash, ...userWithoutPassword } = user;
    res.json(successResponse(userWithoutPassword, 'User updated successfully'));
  } catch (error: any) {
    console.error('Error updating user:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to update user' });
  }
});

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

    await userRepository.remove(user);

    res.json(successResponse(null, 'User deleted successfully'));
  } catch (error: any) {
    console.error('Error deleting user:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to delete user' });
  }
});

export default router;

