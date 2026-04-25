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
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);

router.get('/me/stats', authMiddleware, authController.getStats);

router.get('/me', authMiddleware, async (req, res) => {
    const user = await prisma.user.findUnique({
        where: { id: req.userId },
        select: { id: true, email: true, name: true, balance: true, balanceUSD: true, systemPrompt: true, createdAt: true },
    });

    if (!user) return res.status(404).json({ error: 'Пользователь не найден' });

    res.json(user);
});

router.patch('/me', authMiddleware, async (req, res) => {
    try {
        const { name, systemPrompt } = req.body;
        const data = {};
        if (name !== undefined) {
            if (!name.trim()) return res.status(400).json({ error: 'Имя не может быть пустым' });
            data.name = name.trim();
        }
        if (systemPrompt !== undefined) data.systemPrompt = systemPrompt;
        if (Object.keys(data).length === 0) return res.status(400).json({ error: 'Нет данных для обновления' });

        const user = await prisma.user.update({
            where: { id: req.userId },
            data,
            select: { id: true, email: true, name: true, balance: true, balanceUSD: true, systemPrompt: true, createdAt: true },
        });
        res.json(user);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

export default router;