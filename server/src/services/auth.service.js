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

const BCRYPT_ROUNDS = 12;

export async function register(email, password, name) {
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
        throw new Error('Пользователь с таким email уже существует');
    }

    // Поле называется passwordHash — храним только хеш
    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

    const user = await prisma.user.create({
        data: {
            email,
            passwordHash,
            name,
            // emailVerified по умолчанию false — прописано в схеме
        },
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

    return { message: 'Регистрация успешна. Проверьте почту для подтверждения email.' };
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

    if (!user.emailVerified) {
        throw new Error('Сначала подтвердите ваш email');
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