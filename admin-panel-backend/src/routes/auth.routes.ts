import express from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { AppDataSource } from '../config/database';
import { User, UserRole, UserStatus } from '../entities/User';
import { successResponse } from '../utils/response';

const router = express.Router();

router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (email === process.env.ADMIN_EMAIL && password === process.env.ADMIN_PASSWORD) {
    const token = jwt.sign({ email }, process.env.ADMIN_JWT_SECRET!, { expiresIn: '7d' });
    return res.json(successResponse({ token }, 'Login successful'));
  }

  return res.status(401).json({ success: false, message: 'Invalid credentials' });
});

router.post('/register', async (req, res) => {
  try {
    const { email, phone, password, firstName, lastName, role, licenseNumber } = req.body;

    // Validate required fields
    if (!email || !phone || !password || !firstName || !lastName || !role) {
      return res.status(400).json({ success: false, message: 'All required fields must be provided' });
    }

    // Validate role
    if (!Object.values(UserRole).includes(role)) {
      return res.status(400).json({ success: false, message: 'Invalid role' });
    }

    // Validate broker requires license number
    if (role === UserRole.BROKER && !licenseNumber) {
      return res.status(400).json({ success: false, message: 'License number is required for BROKER role' });
    }

    const userRepository = AppDataSource.getRepository(User);

    // Check if user already exists
    const existingUser = await userRepository.findOne({
      where: [{ email }, { phone }],
    });

    if (existingUser) {
      return res.status(409).json({ success: false, message: 'User with this email or phone already exists' });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create user
    const user = userRepository.create({
      email,
      phone,
      passwordHash,
      firstName,
      lastName,
      role,
      licenseNumber: licenseNumber || null,
      status: role === UserRole.CLIENT ? UserStatus.ACTIVE : UserStatus.PENDING,
    });

    await userRepository.save(user);

    // Generate JWT token
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.ADMIN_JWT_SECRET!,
      { expiresIn: '7d' }
    );

    // Don't return password hash
    const { passwordHash: _, ...userWithoutPassword } = user;

    return res.status(201).json(successResponse({ user: userWithoutPassword, accessToken: token }, 'User created successfully'));
  } catch (error: any) {
    console.error('Registration error:', error);
    return res.status(500).json({ success: false, message: 'Failed to create user' });
  }
});

export default router;

