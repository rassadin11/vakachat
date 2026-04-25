// services/payment.service.js
import { prisma } from '../prisma.js';
import { getRate } from '../constants/constants.js';

const YUKASSA_API = 'https://api.yookassa.ru/v3/payments';

function yukassaAuth() {
    const shopId = process.env.YUKASSA_SHOP_ID;
    const secretKey = process.env.YUKASSA_SECRET_KEY;
    return 'Basic ' + Buffer.from(`${shopId}:${secretKey}`).toString('base64');
}

export async function createPayment(userId, amountRub) {
    if (amountRub < 10) {
        throw new Error('Минимальная сумма пополнения — 10 ₽');
    }

    const idempotenceKey = crypto.randomUUID();

    const body = {
        amount: { value: amountRub.toFixed(2), currency: 'RUB' },
        confirmation: {
            type: 'redirect',
            return_url: `${process.env.CLIENT_URL}/payment/result`,
        },
        capture: true,
        description: `Пополнение баланса vakachat на ${amountRub} ₽`,
        metadata: { userId },
    };

    const response = await fetch(YUKASSA_API, {
        method: 'POST',
        headers: {
            Authorization: yukassaAuth(),
            'Content-Type': 'application/json',
            'Idempotence-Key': idempotenceKey,
        },
        body: JSON.stringify(body),
    });

    if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.description || 'Ошибка создания платежа');
    }

    const payment = await response.json();

    await prisma.payment.create({
        data: {
            userId,
            yookassaId: payment.id,
            amountRub,
            status: 'pending',
        },
    });

    return { confirmationUrl: payment.confirmation.confirmation_url };
}

export async function handleWebhook(event, paymentObject) {
    if (event !== 'payment.succeeded') return;

    const yookassaId = paymentObject.id;

    // Перепроверяем статус напрямую в ЮКассе (защита от поддельных вебхуков)
    const response = await fetch(`${YUKASSA_API}/${yookassaId}`, {
        headers: { Authorization: yukassaAuth() },
    });

    if (!response.ok) return;

    const verified = await response.json();
    if (verified.status !== 'succeeded') return;

    const payment = await prisma.payment.findUnique({ where: { yookassaId } });
    if (!payment || payment.status === 'succeeded') return; // уже обработан

    const amountRub = Number(payment.amountRub);
    const rate = getRate();
    const rateWithMarkup = rate * 1.21;
    const amountUSD = amountRub / rateWithMarkup;

    await prisma.$transaction([
        prisma.payment.update({
            where: { yookassaId },
            data: { status: 'succeeded' },
        }),
        prisma.user.update({
            where: { id: payment.userId },
            data: {
                balance: { increment: amountRub },
                balanceUSD: { increment: amountUSD },
            },
        }),
        prisma.transaction.create({
            data: {
                userId: payment.userId,
                type: 'topup',
                amount: amountRub,
                description: `Пополнение баланса на ${amountRub} ₽`,
            },
        }),
    ]);
}

export async function getPaymentHistory(userId) {
    return prisma.payment.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        select: {
            id: true,
            amountRub: true,
            status: true,
            createdAt: true,
        },
    });
}
