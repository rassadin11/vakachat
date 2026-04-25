// controllers/auth.controller.js
import * as authService from '../services/auth.service.js';
import { prisma } from '../prisma.js';

const REFRESH_COOKIE_OPTIONS = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 30 * 24 * 60 * 60 * 1000,
    path: '/api/auth',
};

export async function register(req, res) {
    try {
        const { email, password, name, promo } = req.body;

        const fieldErrors = {};

        if (!email) fieldErrors.email = 'Email обязателен';
        if (!password) fieldErrors.password = 'Пароль обязателен';
        if (!name) fieldErrors.name = 'Имя обязательно';

        if (password && password.length < 8) {
            fieldErrors.password = 'Пароль должен быть минимум 8 символов';
        }

        if (Object.keys(fieldErrors).length > 0) {
            return res.status(400).json({ fields: fieldErrors });
        }

        const result = await authService.register(email, password, name, promo);

        res.cookie('refreshToken', result.refreshToken, REFRESH_COOKIE_OPTIONS);
        res.status(201).json({ message: result.message, accessToken: result.accessToken });
    } catch (error) {
        const fieldMap = {
            'Пользователь с таким email уже существует': { field: 'email' },
            'Промокод не найден': { field: 'promo' },
            'Промокод больше не действителен': { field: 'promo' },
            'Промокод был только что использован последний раз': { field: 'promo' },
        };

        const mapped = fieldMap[error.message];

        if (mapped) {
            return res.status(400).json({
                fields: { [mapped.field]: error.message },
            });
        }

        // Неизвестная ошибка — не светим детали наружу
        console.error('Register error:', error);
        res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
}

export async function verifyEmail(req, res) {
    try {
        const { token } = req.query;

        if (!token) {
            return res.status(400).json({ error: 'Токен не передан' });
        }

        const result = await authService.verifyEmail(token);
        res.json(result);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
}

export async function login(req, res) {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email и пароль обязательны' });
        }

        const { accessToken, refreshToken } = await authService.login(email, password);

        res.cookie('refreshToken', refreshToken, REFRESH_COOKIE_OPTIONS);
        res.json({ accessToken });
    } catch (error) {
        res.status(401).json({ error: error.message });
    }
}

export async function refreshTokens(req, res) {
    try {
        const refreshToken = req.cookies?.refreshToken;

        const { accessToken, refreshToken: newRefreshToken } =
            await authService.refreshTokens(refreshToken);

        res.cookie('refreshToken', newRefreshToken, REFRESH_COOKIE_OPTIONS);
        res.json({ accessToken });
    } catch (error) {
        res.status(401).json({ error: error.message });
    }
}

export async function logout(req, res) {
    try {
        const refreshToken = req.cookies?.refreshToken;
        await authService.logout(refreshToken);

        res.clearCookie('refreshToken', { path: '/api/auth' });
        res.json({ message: 'Выход выполнен успешно' });
    } catch (error) {
        res.status(500).json({ error: 'Ошибка при выходе' });
    }
}

export async function forgotPassword(req, res) {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({ error: 'Email обязателен' });
        }

        const result = await authService.requestPasswordReset(email);
        res.json(result);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
}

export async function getStats(req, res) {
    try {
        const userId = req.userId;

        const [user, messageCount, aggregates, spentRub, modelGroups] = await Promise.all([
            prisma.user.findUnique({
                where: { id: userId },
                select: { createdAt: true },
            }),
            prisma.message.count({
                where: { chat: { userId }, role: 'user' },
            }),
            prisma.message.aggregate({
                where: { chat: { userId } },
                _sum: { inputTokens: true, outputTokens: true },
            }),
            prisma.transaction.aggregate({
                where: { userId, type: 'usage' },
                _sum: { amount: true },
            }),
            prisma.message.groupBy({
                by: ['model'],
                where: { chat: { userId }, role: 'assistant', model: { not: null } },
                _count: { model: true },
                orderBy: { _count: { model: 'desc' } },
            }),
        ]);

        const totalTokens =
            (aggregates._sum.inputTokens ?? 0) + (aggregates._sum.outputTokens ?? 0);

        res.json({
            createdAt: user.createdAt,
            messageCount,
            totalTokens,
            spentRub: Number(spentRub._sum.amount ?? 0),
            favoriteModel: modelGroups[0]?.model ?? null,
            uniqueModelsUsed: modelGroups.length,
        });
    } catch (error) {
        console.error('Get stats error:', error);
        res.status(500).json({ error: 'Ошибка получения статистики' });
    }
}

export async function resetPassword(req, res) {
    try {
        const { token, newPassword } = req.body;

        if (!token || !newPassword) {
            return res.status(400).json({ error: 'Токен и новый пароль обязательны' });
        }

        if (newPassword.length < 8) {
            return res.status(400).json({ error: 'Пароль должен быть минимум 8 символов' });
        }

        const result = await authService.resetPassword(token, newPassword);
        res.json(result);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
}