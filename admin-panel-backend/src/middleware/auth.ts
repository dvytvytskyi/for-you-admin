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
  // Support both lowercase and uppercase header names (case-insensitive)
  const apiKey = (req.headers['x-api-key'] || req.headers['X-Api-Key'] || req.headers['X-API-KEY']) as string;
  const apiSecret = (req.headers['x-api-secret'] || req.headers['X-Api-Secret'] || req.headers['X-API-SECRET']) as string;

  // Log ALL headers for debugging (sanitized)
  console.log('[API Auth] ========================================');
  console.log('[API Auth] Incoming request:', {
    url: req.url,
    method: req.method,
    ip: req.ip || req.socket.remoteAddress,
  });
  console.log('[API Auth] Headers check:', {
    'x-api-key': !!req.headers['x-api-key'],
    'X-Api-Key': !!req.headers['X-Api-Key'],
    'X-API-KEY': !!req.headers['X-API-KEY'],
    'x-api-secret': !!req.headers['x-api-secret'],
    'X-Api-Secret': !!req.headers['X-Api-Secret'],
    'X-API-SECRET': !!req.headers['X-API-SECRET'],
  });
  console.log('[API Auth] Extracted values:', {
    hasApiKey: !!apiKey,
    hasApiSecret: !!apiSecret,
    apiKeyLength: apiKey?.length,
    apiSecretLength: apiSecret?.length,
    apiKeyPrefix: apiKey?.substring(0, 30),
    apiSecretPrefix: apiSecret?.substring(0, 30),
  });

  if (!apiKey || !apiSecret) {
    console.log('[API Auth] ❌ Missing API key or secret');
    console.log('[API Auth] ========================================');
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

    // First, try to find the key by apiKey (exact match)
    let keyByApiKey = await AppDataSource.getRepository(ApiKey).findOne({
      where: { apiKey: trimmedApiKey },
    });

    // If not found, try without prefix (in case key was stored without prefix)
    if (!keyByApiKey && trimmedApiKey.startsWith('ak_')) {
      const keyWithoutPrefix = trimmedApiKey.substring(3);
      keyByApiKey = await AppDataSource.getRepository(ApiKey).findOne({
        where: { apiKey: keyWithoutPrefix },
      });
      if (keyByApiKey) {
        console.log('[API Auth] ⚠️ Found key without prefix, but request has prefix');
      }
    }

    // Also try with fyr_ prefix (current generation format)
    if (!keyByApiKey && !trimmedApiKey.startsWith('fyr_')) {
      const keyWithFyrPrefix = `fyr_${trimmedApiKey.replace(/^(ak_|fyr_)/, '')}`;
      keyByApiKey = await AppDataSource.getRepository(ApiKey).findOne({
        where: { apiKey: keyWithFyrPrefix },
      });
      if (keyByApiKey) {
        console.log('[API Auth] ⚠️ Found key with fyr_ prefix, but request has different prefix');
      }
    }

    if (!keyByApiKey) {
      console.log('[API Auth] ❌ API key not found in database');
      console.log('[API Auth] Searched for:', trimmedApiKey);
      
      // List all available keys (first 3) for debugging
      const allKeys = await AppDataSource.getRepository(ApiKey).find({
        take: 3,
        select: ['id', 'apiKey', 'isActive', 'name'],
      });
      console.log('[API Auth] Available keys in DB (first 3):', allKeys.map(k => ({
        id: k.id,
        apiKeyPrefix: k.apiKey.substring(0, 20) + '...',
        isActive: k.isActive,
        name: k.name,
      })));
      
      console.log('[API Auth] ========================================');
      return res.status(403).json({ message: 'Invalid API key or secret' });
    }

    console.log('[API Auth] ✅ API key found in database:', {
      id: keyByApiKey.id,
      name: keyByApiKey.name,
      isActive: keyByApiKey.isActive,
      dbApiKeyPrefix: keyByApiKey.apiKey.substring(0, 30) + '...',
      reqApiKeyPrefix: trimmedApiKey.substring(0, 30) + '...',
      apiKeyExactMatch: keyByApiKey.apiKey === trimmedApiKey,
      dbSecretLength: keyByApiKey.apiSecret.length,
      reqSecretLength: trimmedApiSecret.length,
      dbSecretPrefix: keyByApiKey.apiSecret.substring(0, 30) + '...',
      reqSecretPrefix: trimmedApiSecret.substring(0, 30) + '...',
      secretExactMatch: keyByApiKey.apiSecret === trimmedApiSecret,
    });

    // Check if key is active
    if (!keyByApiKey.isActive) {
      console.log('[API Auth] ❌ API key is not active');
      return res.status(403).json({ message: 'Invalid API key or secret' });
    }

    // Check secret match
    // Support multiple formats: exact match, with/without prefixes
    let secretMatch = keyByApiKey.apiSecret === trimmedApiSecret;
    
    // Try without as_ prefix if secret has it
    if (!secretMatch && trimmedApiSecret.startsWith('as_')) {
      const secretWithoutPrefix = trimmedApiSecret.substring(3);
      secretMatch = keyByApiKey.apiSecret === secretWithoutPrefix;
      if (secretMatch) {
        console.log('[API Auth] ⚠️ Secret matched after removing as_ prefix');
      }
    }
    
    // Try with fyr_ prefix if secret doesn't have it (for fyr_ format keys)
    if (!secretMatch && keyByApiKey.apiKey.startsWith('fyr_') && !trimmedApiSecret.startsWith('fyr_') && !trimmedApiSecret.startsWith('as_')) {
      const secretWithFyrPrefix = `fyr_${trimmedApiSecret}`;
      secretMatch = keyByApiKey.apiSecret === secretWithFyrPrefix;
      if (secretMatch) {
        console.log('[API Auth] ⚠️ Secret matched after adding fyr_ prefix');
      }
    }
    
    // Try without fyr_ prefix if secret has it but DB doesn't
    if (!secretMatch && trimmedApiSecret.startsWith('fyr_') && !keyByApiKey.apiSecret.startsWith('fyr_')) {
      const secretWithoutFyrPrefix = trimmedApiSecret.substring(4);
      secretMatch = keyByApiKey.apiSecret === secretWithoutFyrPrefix;
      if (secretMatch) {
        console.log('[API Auth] ⚠️ Secret matched after removing fyr_ prefix');
      }
    }

    if (!secretMatch) {
      console.log('[API Auth] ❌ API secret does not match');
      console.log('[API Auth] DB secret length:', keyByApiKey.apiSecret.length);
      console.log('[API Auth] Request secret length:', trimmedApiSecret.length);
      console.log('[API Auth] DB secret prefix:', keyByApiKey.apiSecret.substring(0, 30) + '...');
      console.log('[API Auth] Request secret prefix:', trimmedApiSecret.substring(0, 30) + '...');
      console.log('[API Auth] Character-by-character comparison (first 50):');
      for (let i = 0; i < Math.min(50, Math.max(keyByApiKey.apiSecret.length, trimmedApiSecret.length)); i++) {
        const dbChar = keyByApiKey.apiSecret[i] || 'MISSING';
        const reqChar = trimmedApiSecret[i] || 'MISSING';
        if (dbChar !== reqChar) {
          const dbCode = dbChar !== 'MISSING' ? dbChar.charCodeAt(0) : 'N/A';
          const reqCode = reqChar !== 'MISSING' ? reqChar.charCodeAt(0) : 'N/A';
          console.log(`[API Auth]   Position ${i}: DB='${dbChar}' (${dbCode}) vs REQ='${reqChar}' (${reqCode})`);
          break;
        }
      }
      console.log('[API Auth] ========================================');
      return res.status(403).json({ message: 'Invalid API key or secret' });
    }

    // Update last used timestamp
    keyByApiKey.lastUsedAt = new Date();
    await AppDataSource.getRepository(ApiKey).save(keyByApiKey);

    console.log('[API Auth] ✅ Authentication successful');
    console.log('[API Auth] ========================================');
    req.apiKey = keyByApiKey;
    next();
  } catch (error: any) {
    console.error('[API Auth] ❌ Error authenticating API key:', error);
    console.error('[API Auth] Error stack:', error.stack);
    return res.status(500).json({ message: 'Authentication error' });
  }
};

