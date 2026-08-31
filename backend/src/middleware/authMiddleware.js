import jwt from 'jsonwebtoken';
import '../config/env.js';

export function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'Akses ditolak: Token autentikasi tidak ditemukan.'
    });
  }

  jwt.verify(token, process.env.JWT_SECRET || 'super_secret_jwt_key_esb_case_2026', (err, user) => {
    if (err) {
      return res.status(403).json({
        success: false,
        error: 'Token tidak valid atau telah kadaluarsa.'
      });
    }

    req.user = user;
    next();
  });
}

export const requireAuth = authenticateToken;
