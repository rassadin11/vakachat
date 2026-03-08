// routes/auth.routes.js
import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware.js';
import * as authController from '../controllers/auth.controller.js';
import { prisma } from '../prisma.js';

const router = Router();

router.post('/register', authController.register);
router.get('/verify-email', authController.verifyEmail);
router.post('/login', authController.login);
router.post('/refresh', authController.refreshTokens);
router.post('/logout', authController.logout);

router.get('/me', authMiddleware, async (req, res) => {
    const user = await prisma.user.findUnique({
        where: { id: req.userId },
        select: { id: true, email: true, balance: true, createdAt: true }, // пароль не отдаём!
    });

    if (!user) return res.status(404).json({ error: 'Пользователь не найден' });

    res.json(user);
});

export default router;