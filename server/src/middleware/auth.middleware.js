// middleware/auth.middleware.js
import { verifyAccessToken } from '../utils/jwt.utils.js';

export function authMiddleware(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Токен доступа отсутствует' });
    }

    try {
        const payload = verifyAccessToken(token);
        req.userId = payload.userId;
        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ error: 'Токен истёк', code: 'TOKEN_EXPIRED' });
        }
        return res.status(401).json({ error: 'Невалидный токен' });
    }
}