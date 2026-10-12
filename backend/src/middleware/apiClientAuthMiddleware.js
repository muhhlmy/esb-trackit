import { verifyApiKey } from '../services/apiClientService.js';
import { authenticateToken } from './authMiddleware.js';

function extractApiKey(req) {
  const headerKey = req.headers['x-api-key'];
  if (typeof headerKey === 'string' && headerKey.trim()) {
    return headerKey.trim();
  }

  const authorization = req.headers.authorization;
  if (typeof authorization === 'string' && authorization.startsWith('Bearer trkit_')) {
    return authorization.slice(7).trim();
  }

  return null;
}

export async function authenticateApiClient(req, res, next) {
  const apiKey = extractApiKey(req);
  if (!apiKey) {
    return res.status(401).json({
      error: {
        code: 'API_KEY_REQUIRED',
        message: 'An API key is required. Provide it via the X-API-Key header or as "Bearer trkit_...".',
      },
    });
  }

  try {
    const client = await verifyApiKey(apiKey);
    if (!client) {
      return res.status(401).json({
        error: {
          code: 'INVALID_API_KEY',
          message: 'The provided API key is invalid, expired, or has been revoked.',
        },
      });
    }

    req.apiClient = client;
    req.authType = 'api_client';
    next();
  } catch (error) {
    next(error);
  }
}

export function authorizeScope(...requiredScopes) {
  return (req, res, next) => {
    // Jalur 1: Client M2M (API Client)
    if (req.apiClient) {
      const clientScopes = Array.isArray(req.apiClient.scopes) ? req.apiClient.scopes : [];
      const hasAllScopes = requiredScopes.every(scope => clientScopes.includes(scope));

      if (hasAllScopes) {
        return next();
      }

      return res.status(403).json({
        error: {
          code: 'INSUFFICIENT_SCOPE',
          message: `The API client is missing one or more required scopes: ${requiredScopes.join(', ')}`,
          requiredScopes,
          grantedScopes: clientScopes,
        },
      });
    }

    // Jalur 2: Pengguna Sesi Manusia (User JWT)
    if (req.user) {
      if (req.user.role === 'superadmin' || req.user.role === 'admin') {
        return next();
      }

      // Validasi permission spesifik jika user biasa
      return next();
    }

    return res.status(401).json({
      error: {
        code: 'AUTHENTICATION_REQUIRED',
        message: 'Authentication is required. Provide an API key or a user session token.',
      },
    });
  };
}

export async function authenticateUserOrApiClient(req, res, next) {
  const apiKey = extractApiKey(req);
  if (apiKey) {
    return authenticateApiClient(req, res, next);
  }
  return authenticateToken(req, res, next);
}
