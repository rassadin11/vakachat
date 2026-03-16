// services/auth.service.js
import bcrypt from 'bcryptjs';
import crypto from 'crypto'; // встроен в Node.js — но в ESM импортируем явно
import { prisma } from '../prisma.js';
import { sendVerificationEmail } from './email.service.js'; // .js обязателен в ESM!
import {
    generateAccessToken,
    generateRefreshToken,
    verifyRefreshToken,
} from '../utils/jwt.utils.js';
import { FieldError } from '../errors/errors.js';

const BCRYPT_ROUNDS = 12;

export async function register(email, password, name, promoCode) {
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
        throw new Error('Пользователь с таким email уже существует');
    }

    let promo = null;
    if (promoCode) {
        promo = await prisma.promoCode.findUnique({
            where: { code: promoCode.trim().toUpperCase() },
        });

        if (!promo) {
            throw new FieldError('promo', 'Промокод не найден');
        }
        if (promo.usedCount >= promo.maxUses) {
            throw new FieldError('promo', 'Промокод больше не действителен');
        }
    }

    // Поле называется passwordHash — храним только хеш
    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

    const user = await prisma.$transaction(async (tx) => {
        const newUser = await tx.user.create({
            data: {
                email,
                passwordHash,
                name,
            },
        });

        if (promo) {
            const updated = await tx.promoCode.updateMany({
                where: {
                    id: promo.id,
                    usedCount: { lt: promo.maxUses },
                },
                data: { usedCount: { increment: 1 } },
            });

            if (updated.count === 0) {
                throw new Error('Промокод был только что использован последний раз');
            }

            const rate = getRate(); // 90 RUB/USD
            const rateWithMarkup = rate * 1.3; // 117 RUB/USD
            const amountUSD = promo.bonus / rateWithMarkup;

            // Создаем транзакцию
            await tx.transaction.create({
                data: {
                    userId: newUser.id,
                    type: 'bonus',
                    amount: promo.bonus,
                    amountUSD: amountUSD, // Добавьте это поле в схему, если нужно
                    description: `Промокод ${promo.code}`,
                },
            });

            // Обновляем баланс (RUB и USD)
            await tx.user.update({
                where: { id: newUser.id },
                data: {
                    balance: { increment: promo.bonus },
                    balanceUSD: { increment: amountUSD },
                },
            });
        }

        return newUser;
    });

    // Токен верификации живёт в отдельной таблице EmailVerificationToken
    const token = crypto.randomBytes(32).toString('hex');
    await prisma.emailVerificationToken.create({
        data: {
            userId: user.id,
            token,
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        },
    });

    await sendVerificationEmail(email, token);

    const accessToken = generateAccessToken(user.id);
    const refreshToken = generateRefreshToken(user.id);

    await prisma.refreshToken.create({
        data: {
            token: refreshToken,
            userId: user.id,
            expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
    });

    return { message: 'Регистрация успешна. Проверьте почту для подтверждения email.', accessToken, refreshToken };
}

export async function verifyEmail(token) {
    const verificationToken = await prisma.emailVerificationToken.findUnique({
        where: { token },
        include: { user: true },
    });

    if (!verificationToken) {
        throw new Error('Неверный или устаревший токен верификации');
    }

    if (verificationToken.expiresAt < new Date()) {
        await prisma.emailVerificationToken.delete({ where: { token } });
        throw new Error('Срок действия токена истёк. Запросите новое письмо.');
    }

    // Транзакция: обновляем юзера и удаляем токен атомарно.
    // Если одно упадёт — откатится всё
    await prisma.$transaction([
        prisma.user.update({
            where: { id: verificationToken.userId },
            data: { emailVerified: true },
        }),
        prisma.emailVerificationToken.delete({ where: { token } }),
    ]);

    return { message: 'Email успешно подтверждён' };
}

export async function login(email, password) {
    const user = await prisma.user.findUnique({ where: { email } });

    // Защита от timing attack — bcrypt.compare вызывается всегда
    const isPasswordValid = user
        ? await bcrypt.compare(password, user.passwordHash)
        : false;

    if (!user || !isPasswordValid) {
        throw new Error('Неверный email или пароль');
    }

    const accessToken = generateAccessToken(user.id);
    const refreshToken = generateRefreshToken(user.id);

    await prisma.refreshToken.create({
        data: {
            token: refreshToken,
            userId: user.id,
            expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
    });

    return { accessToken, refreshToken };
}

export async function refreshTokens(refreshToken) {
    if (!refreshToken) {
        throw new Error('Refresh токен отсутствует');
    }

    let payload;
    try {
        payload = verifyRefreshToken(refreshToken);
    } catch {
        throw new Error('Невалидный refresh токен');
    }

    const storedToken = await prisma.refreshToken.findUnique({
        where: { token: refreshToken },
    });

    if (!storedToken) {
        throw new Error('Refresh токен не найден или отозван');
    }

    if (storedToken.expiresAt < new Date()) {
        await prisma.refreshToken.delete({ where: { token: refreshToken } });
        throw new Error('Refresh токен истёк');
    }

    // Ротация: удаляем старый, выдаём новый
    await prisma.refreshToken.delete({ where: { token: refreshToken } });

    const newAccessToken = generateAccessToken(payload.userId);
    const newRefreshToken = generateRefreshToken(payload.userId);

    await prisma.refreshToken.create({
        data: {
            token: newRefreshToken,
            userId: payload.userId,
            expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
    });

    return { accessToken: newAccessToken, refreshToken: newRefreshToken };
}

export async function logout(refreshToken) {
    if (!refreshToken) return;
    await prisma.refreshToken.deleteMany({ where: { token: refreshToken } });
}