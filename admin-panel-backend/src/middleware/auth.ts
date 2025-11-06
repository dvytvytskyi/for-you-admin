import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AppDataSource } from '../config/database';
import { ApiKey } from '../entities/ApiKey';

export interface AuthRequest extends Request {
  user?: any;
  apiKey?: ApiKey;
}

export const authenticateJWT = (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ message: 'Unauthorized: No authorization header' });
  }

  const token = authHeader.split(' ')[1];
  if (!token) {
    return res.status(401).json({ message: 'Unauthorized: No token provided' });
  }

  if (!process.env.ADMIN_JWT_SECRET) {
    console.error('ADMIN_JWT_SECRET is not set in environment variables');
    return res.status(500).json({ message: 'Server configuration error' });
  }

  try {
    const decoded = jwt.verify(token, process.env.ADMIN_JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error: any) {
    console.error('JWT verification error:', error.message);
    return res.status(403).json({ message: `Invalid token: ${error.message}` });
  }
};

export const authenticateAPIKey = (req: Request, res: Response, next: NextFunction) => {
  const apiKey = req.headers['x-api-key'];
  if (apiKey !== process.env.API_KEY) {
    return res.status(403).json({ message: 'Invalid API Key' });
  }
  next();
};

// Authenticate with API Key and Secret from database
export const authenticateApiKeyWithSecret = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const apiKey = req.headers['x-api-key'] as string;
  const apiSecret = req.headers['x-api-secret'] as string;

  // Log incoming headers for debugging
  console.log('[API Auth] Incoming request:', {
    hasApiKey: !!apiKey,
    hasApiSecret: !!apiSecret,
    apiKeyLength: apiKey?.length,
    apiSecretLength: apiSecret?.length,
    apiKeyPrefix: apiKey?.substring(0, 20),
    apiSecretPrefix: apiSecret?.substring(0, 20),
    url: req.url,
    method: req.method,
  });

  if (!apiKey || !apiSecret) {
    console.log('[API Auth] ❌ Missing API key or secret');
    return res.status(401).json({ message: 'API key and secret are required' });
  }

  // Trim whitespace from keys
  const trimmedApiKey = apiKey.trim();
  const trimmedApiSecret = apiSecret.trim();

  try {
    if (!AppDataSource.isInitialized) {
      console.log('[API Auth] ❌ Database not initialized');
      return res.status(500).json({ message: 'Database connection not initialized' });
    }

    // First, try to find the key by apiKey only
    const keyByApiKey = await AppDataSource.getRepository(ApiKey).findOne({
      where: { apiKey: trimmedApiKey },
    });

    if (!keyByApiKey) {
      console.log('[API Auth] ❌ API key not found in database');
      console.log('[API Auth] Searched for:', trimmedApiKey);
      return res.status(403).json({ message: 'Invalid API key or secret' });
    }

    console.log('[API Auth] ✅ API key found in database:', {
      id: keyByApiKey.id,
      name: keyByApiKey.name,
      isActive: keyByApiKey.isActive,
      apiKeyMatch: keyByApiKey.apiKey === trimmedApiKey,
      secretLength: keyByApiKey.apiSecret.length,
      secretMatch: keyByApiKey.apiSecret === trimmedApiSecret,
    });

    // Check if key is active
    if (!keyByApiKey.isActive) {
      console.log('[API Auth] ❌ API key is not active');
      return res.status(403).json({ message: 'Invalid API key or secret' });
    }

    // Check secret match
    if (keyByApiKey.apiSecret !== trimmedApiSecret) {
      console.log('[API Auth] ❌ API secret does not match');
      console.log('[API Auth] Expected length:', keyByApiKey.apiSecret.length);
      console.log('[API Auth] Received length:', trimmedApiSecret.length);
      console.log('[API Auth] Expected prefix:', keyByApiKey.apiSecret.substring(0, 20));
      console.log('[API Auth] Received prefix:', trimmedApiSecret.substring(0, 20));
      return res.status(403).json({ message: 'Invalid API key or secret' });
    }

    // Update last used timestamp
    keyByApiKey.lastUsedAt = new Date();
    await AppDataSource.getRepository(ApiKey).save(keyByApiKey);

    console.log('[API Auth] ✅ Authentication successful');
    req.apiKey = keyByApiKey;
    next();
  } catch (error: any) {
    console.error('[API Auth] ❌ Error authenticating API key:', error);
    console.error('[API Auth] Error stack:', error.stack);
    return res.status(500).json({ message: 'Authentication error' });
  }
};

