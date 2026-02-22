import express from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { AppDataSource } from '../config/database';
import { User, UserRole, UserStatus } from '../entities/User';
import { PasswordResetToken } from '../entities/PasswordResetToken';
import { successResponse } from '../utils/response';
import { authenticateJWT } from '../middleware/auth';
import { sendResetCodeEmail } from '../services/email.service';

const router = express.Router();

router.post('/login', async (req, res) => {
  try {
    // Перевіряємо чи БД ініціалізована
    if (!AppDataSource.isInitialized) {
      console.error('Database not initialized');
      await AppDataSource.initialize();
    }

    const { email, password } = req.body;
    console.log(`[AUTH] Login attempt received for: "${email}" (length: ${email?.length}), password length: ${password?.length}`);
    console.log(`[AUTH] Comparing with ADMIN_EMAIL: "${process.env.ADMIN_EMAIL}" (length: ${process.env.ADMIN_EMAIL?.length})`);

    if (!email || !password) {
      console.warn(`[AUTH] Login failed (400): Missing email or password. Fields present: ${Object.keys(req.body)}`);
      return res.status(400).json({ success: false, message: 'Email and password are required' });
    }

    // Спочатку перевіряємо через env (для старого адміна)
    if (email === process.env.ADMIN_EMAIL && password === process.env.ADMIN_PASSWORD) {
      // Шукаємо користувача в БД або створюємо токен з email
      const adminUser = await AppDataSource.getRepository(User).findOne({
        where: { email },
      });

      // Завжди створюємо токен з id (якщо користувач не знайдений в БД, створюємо ід з email)
      const payload = adminUser
        ? { id: adminUser.id, email, role: adminUser.role }
        : { id: 'admin-env-user', email, role: 'ADMIN' };

      if (!process.env.ADMIN_JWT_SECRET) {
        console.error('ADMIN_JWT_SECRET is not set');
        return res.status(500).json({ success: false, message: 'Server configuration error' });
      }

      const token = jwt.sign(payload, process.env.ADMIN_JWT_SECRET, { expiresIn: '7d' });
      const refreshToken = jwt.sign(payload, process.env.ADMIN_JWT_SECRET, { expiresIn: '30d' });

      // Якщо користувач не знайдений в БД, повертаємо мінімальні дані
      if (!adminUser) {
        return res.json(successResponse({
          token,
          refreshToken,
          user: {
            email,
            role: 'ADMIN',
            status: 'ACTIVE'
          }
        }, 'Login successful'));
      }

      console.log(`[AUTH] Login success (via env): ${email}`);
      const { passwordHash: _, ...userWithoutPassword } = adminUser;
      return res.json(successResponse({
        token,
        accessToken: token,
        access_token: token,
        refreshToken,
        refresh_token: refreshToken,
        user: userWithoutPassword
      }, 'Login successful'));
    }

    // Перевіряємо в БД для реєстрованих користувачів
    const user = await AppDataSource.getRepository(User).findOne({
      where: { email },
    });

    if (!user) {
      console.warn(`[AUTH] Login failed (401): User not found: ${email}`);
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    if (user.status === UserStatus.DELETED) {
      console.warn(`[AUTH] Login failed (403): User is deleted: ${email}`);
      return res.status(403).json({ success: false, message: 'Account deleted' });
    }

    if (user.status === UserStatus.BLOCKED) {
      console.warn(`[AUTH] Login failed (403): User is blocked: ${email}`);
      return res.status(403).json({ success: false, message: 'Account blocked' });
    }

    const isValidPassword = await bcrypt.compare(password, user.passwordHash);
    if (!isValidPassword) {
      console.warn(`[AUTH] Login failed (401): Invalid password for: ${email}`);
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    if (!process.env.ADMIN_JWT_SECRET) {
      console.error('ADMIN_JWT_SECRET is not set');
      return res.status(500).json({ success: false, message: 'Server configuration error' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.ADMIN_JWT_SECRET,
      { expiresIn: '7d' }
    );

    const refreshToken = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.ADMIN_JWT_SECRET,
      { expiresIn: '30d' }
    );

    const { passwordHash: _, ...userWithoutPassword } = user;
    console.log(`[AUTH] Login success: ${email} (Role: ${user.role})`);
    return res.json(successResponse({
      token,
      accessToken: token,
      access_token: token,
      refreshToken,
      refresh_token: refreshToken,
      user: userWithoutPassword
    }, 'Login successful'));
  } catch (error: any) {
    console.error('Login error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

router.get('/me', authenticateJWT, async (req: any, res) => {
  try {
    const userId = req.user?.id;
    const userEmail = req.user?.email;
    const userRole = req.user?.role;
    console.log(`[AUTH] /me request for: id=${userId}, email=${userEmail}, role=${userRole}`);

    if (!userId && !userEmail) {
      return res.status(401).json({ success: false, message: 'User not found' });
    }

    // Перевіряємо чи БД ініціалізована
    if (!AppDataSource.isInitialized) {
      console.error('Database not initialized');
      await AppDataSource.initialize();
    }

    // Якщо це env користувач (admin-env-user), повертаємо дані з токену
    if (userId === 'admin-env-user' || (userEmail === process.env.ADMIN_EMAIL && userRole === 'ADMIN')) {
      return res.json(successResponse({
        id: 'admin-env-user',
        email: userEmail || process.env.ADMIN_EMAIL,
        role: 'ADMIN',
        status: 'ACTIVE',
      }));
    }

    // Шукаємо користувача в БД
    const user = await AppDataSource.getRepository(User).findOne({
      where: userId ? { id: userId } : { email: userEmail },
      select: ['id', 'email', 'phone', 'firstName', 'lastName', 'role', 'status', 'licenseNumber', 'avatar', 'amoCrmUserId', 'createdAt', 'updatedAt'],
    });

    if (!user) {
      // Якщо користувач не знайдений, але є email в токені, повертаємо мінімальні дані
      if (userEmail) {
        return res.json(successResponse({
          id: userId || 'unknown',
          email: userEmail,
          role: userRole || 'ADMIN',
          status: 'ACTIVE',
        }));
      }
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    return res.json(successResponse(user));
  } catch (error: any) {
    console.error('Error fetching user:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch user' });
  }
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

    // Generate JWT tokens
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.ADMIN_JWT_SECRET!,
      { expiresIn: '7d' }
    );

    const refreshToken = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.ADMIN_JWT_SECRET!,
      { expiresIn: '30d' }
    );

    // Don't return password hash
    const { passwordHash: _, ...userWithoutPassword } = user;

    return res.status(201).json(successResponse({
      user: userWithoutPassword,
      token,
      accessToken: token,
      access_token: token,
      refreshToken,
      refresh_token: refreshToken
    }, 'User created successfully'));
  } catch (error: any) {
    console.error('Registration error:', error);
    return res.status(500).json({ success: false, message: 'Failed to create user' });
  }
});

// Generate 6-digit code
const generateResetCode = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ success: false, message: 'Email is required' });
    }

    const userRepository = AppDataSource.getRepository(User);
    const tokenRepository = AppDataSource.getRepository(PasswordResetToken);

    // Find user by email
    const user = await userRepository.findOne({
      where: { email: email.toLowerCase().trim() },
    });

    // Always return success (security: don't reveal if email exists)
    if (!user) {
      return res.json(successResponse(null, 'If the email exists, a password reset code has been sent'));
    }

    // Generate 6-digit code
    const code = generateResetCode();

    // Generate reset token (JWT)
    const resetToken = jwt.sign(
      { userId: user.id, email: user.email, type: 'password-reset' },
      process.env.ADMIN_JWT_SECRET!,
      { expiresIn: '15m' }
    );

    // Invalidate any existing reset tokens for this user
    await tokenRepository.update(
      { userId: user.id, used: false },
      { used: true }
    );

    // Create new reset token
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 15); // 15 minutes from now

    const resetTokenEntity = tokenRepository.create({
      userId: user.id,
      code,
      resetToken,
      used: false,
      expiresAt,
    });

    await tokenRepository.save(resetTokenEntity);

    // Send email with code
    await sendResetCodeEmail(user.email, code);

    return res.json(successResponse(null, 'If the email exists, a password reset code has been sent'));
  } catch (error: any) {
    console.error('Error in forgot-password:', error);
    return res.status(500).json({ success: false, message: 'Failed to process password reset request' });
  }
});

router.post('/verify-reset-code', async (req, res) => {
  try {
    const { email, code } = req.body;

    if (!email || !code) {
      return res.status(400).json({ success: false, message: 'Email and code are required' });
    }

    const userRepository = AppDataSource.getRepository(User);
    const tokenRepository = AppDataSource.getRepository(PasswordResetToken);

    // Find user
    const user = await userRepository.findOne({
      where: { email: email.toLowerCase().trim() },
    });

    if (!user) {
      return res.status(404).json({ success: false, message: 'Invalid email or code' });
    }

    // Find active reset token
    const resetTokenEntity = await tokenRepository.findOne({
      where: {
        userId: user.id,
        code: code.trim(),
        used: false,
      },
      order: { createdAt: 'DESC' },
    });

    if (!resetTokenEntity) {
      return res.status(400).json({ success: false, message: 'Invalid or expired code' });
    }

    // Check if code is expired
    if (new Date() > resetTokenEntity.expiresAt) {
      return res.status(400).json({ success: false, message: 'Code has expired' });
    }

    // Return reset token (client will use this for reset-password)
    return res.json(successResponse({
      resetToken: resetTokenEntity.resetToken,
    }));
  } catch (error: any) {
    console.error('Error in verify-reset-code:', error);
    return res.status(500).json({ success: false, message: 'Failed to verify code' });
  }
});

router.post('/reset-password', async (req, res) => {
  try {
    const { resetToken, newPassword } = req.body;

    if (!resetToken || !newPassword) {
      return res.status(400).json({ success: false, message: 'Reset token and new password are required' });
    }

    // Validate password strength
    if (newPassword.length < 8) {
      return res.status(400).json({ success: false, message: 'Password must be at least 8 characters long' });
    }

    // Verify reset token
    let decoded: any;
    try {
      decoded = jwt.verify(resetToken, process.env.ADMIN_JWT_SECRET!);
      if (decoded.type !== 'password-reset') {
        return res.status(400).json({ success: false, message: 'Invalid reset token' });
      }
    } catch (error) {
      return res.status(400).json({ success: false, message: 'Invalid or expired reset token' });
    }

    const userRepository = AppDataSource.getRepository(User);
    const tokenRepository = AppDataSource.getRepository(PasswordResetToken);

    // Find user
    const user = await userRepository.findOne({
      where: { id: decoded.userId },
    });

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Find and verify reset token entity
    const resetTokenEntity = await tokenRepository.findOne({
      where: {
        userId: user.id,
        resetToken,
        used: false,
      },
    });

    if (!resetTokenEntity) {
      return res.status(400).json({ success: false, message: 'Invalid or already used reset token' });
    }

    // Check if token is expired
    if (new Date() > resetTokenEntity.expiresAt) {
      return res.status(400).json({ success: false, message: 'Reset token has expired' });
    }

    // Hash new password
    const passwordHash = await bcrypt.hash(newPassword, 10);

    // Update user password
    user.passwordHash = passwordHash;
    await userRepository.save(user);

    // Mark reset token as used
    resetTokenEntity.used = true;
    await tokenRepository.save(resetTokenEntity);

    return res.json(successResponse(null, 'Password reset successfully'));
  } catch (error: any) {
    console.error('Error in reset-password:', error);
    return res.status(500).json({ success: false, message: 'Failed to reset password' });
  }
});

router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({ success: false, message: 'Refresh token is required' });
    }

    if (!process.env.ADMIN_JWT_SECRET) {
      console.error('ADMIN_JWT_SECRET is not set');
      return res.status(500).json({ success: false, message: 'Server configuration error' });
    }

    // Verify refresh token
    let decoded: any;
    try {
      decoded = jwt.verify(refreshToken, process.env.ADMIN_JWT_SECRET);
    } catch (error) {
      return res.status(401).json({ success: false, message: 'Invalid or expired refresh token' });
    }

    // Generate new access token
    const token = jwt.sign(
      { id: decoded.id, email: decoded.email, role: decoded.role },
      process.env.ADMIN_JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Generate new refresh token
    const newRefreshToken = jwt.sign(
      { id: decoded.id, email: decoded.email, role: decoded.role },
      process.env.ADMIN_JWT_SECRET,
      { expiresIn: '30d' }
    );

    return res.json(successResponse({
      token,
      accessToken: token,
      access_token: token,
      refreshToken: newRefreshToken,
      refresh_token: newRefreshToken
    }, 'Token refreshed successfully'));
  } catch (error: any) {
    console.error('Refresh token error:', error);
    return res.status(500).json({ success: false, message: 'Failed to refresh token' });
  }
});

router.post('/change-password', authenticateJWT, async (req: any, res) => {
  try {
    const userId = req.user?.id;
    const { oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword) {
      return res.status(400).json({ success: false, message: 'Current and new passwords are required' });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ success: false, message: 'New password must be at least 8 characters long' });
    }

    const userRepository = AppDataSource.getRepository(User);
    const user = await userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Check old password
    const isMatch = await bcrypt.compare(oldPassword, user.passwordHash);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: 'Invalid current password' });
    }

    // Hash and save new password
    user.passwordHash = await bcrypt.hash(newPassword, 10);
    await userRepository.save(user);

    return res.json(successResponse(null, 'Password changed successfully'));
  } catch (error: any) {
    console.error('Error in change-password:', error);
    return res.status(500).json({ success: false, message: 'Failed to change password' });
  }
});

router.patch('/profile', authenticateJWT, async (req: any, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'User not found' });
    }

    const { firstName, lastName, email, phone, licenseNumber, avatar } = req.body;

    const userRepository = AppDataSource.getRepository(User);

    // Find user
    const user = await userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Update only provided fields
    if (firstName !== undefined) {
      user.firstName = firstName;
    }
    if (lastName !== undefined) {
      user.lastName = lastName;
    }
    if (email !== undefined) {
      // Check if email is already taken by another user
      const existingUser = await userRepository.findOne({
        where: { email: email.toLowerCase().trim() },
      });
      if (existingUser && existingUser.id !== userId) {
        return res.status(409).json({ success: false, message: 'Email is already taken' });
      }
      user.email = email.toLowerCase().trim();
    }
    if (phone !== undefined) {
      // Check if phone is already taken by another user
      const existingUser = await userRepository.findOne({
        where: { phone },
      });
      if (existingUser && existingUser.id !== userId) {
        return res.status(409).json({ success: false, message: 'Phone is already taken' });
      }
      user.phone = phone;
    }
    if (licenseNumber !== undefined) {
      user.licenseNumber = licenseNumber;
    }
    if (avatar !== undefined) {
      user.avatar = avatar;
    }

    await userRepository.save(user);

    // Return user without password hash
    const { passwordHash: _, ...userWithoutPassword } = user;

    return res.json(successResponse({ user: userWithoutPassword }, 'Profile updated successfully'));
  } catch (error: any) {
    console.error('Error updating profile:', error);
    return res.status(500).json({ success: false, message: 'Failed to update profile' });
  }
});

export default router;

