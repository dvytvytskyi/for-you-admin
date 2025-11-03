import express from 'express';
import { AppDataSource } from '../config/database';
import { User } from '../entities/User';
import { authenticateJWT, authenticateAPIKey } from '../middleware/auth';
import { successResponse } from '../utils/response';

const router = express.Router();

router.use((req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  if (apiKey) return authenticateAPIKey(req, res, next);
  return authenticateJWT(req, res, next);
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

router.patch('/:id', async (req, res) => {
  try {
    const { firstName, lastName, email, phone, status, role, avatar, licenseNumber } = req.body;
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

