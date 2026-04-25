// controllers/payment.controller.js
import * as paymentService from '../services/payment.service.js';

export async function createPayment(req, res) {
    try {
        const { amount } = req.body;
        const amountRub = Number(amount);

        if (!amount || isNaN(amountRub) || amountRub <= 0) {
            return res.status(400).json({ error: 'Укажите корректную сумму' });
        }

        const result = await paymentService.createPayment(req.userId, amountRub);
        res.json(result);
    } catch (error) {
        console.error('Create payment error:', error);
        res.status(400).json({ error: error.message });
    }
}

export async function webhook(req, res) {
    try {
        const { event, object } = req.body;
        await paymentService.handleWebhook(event, object);
        res.status(200).json({ ok: true });
    } catch (error) {
        console.error('Webhook error:', error);
        res.status(200).json({ ok: true }); // всегда 200, чтобы ЮКасса не повторяла
    }
}

export async function getHistory(req, res) {
    try {
        const payments = await paymentService.getPaymentHistory(req.userId);
        res.json(payments);
    } catch (error) {
        res.status(500).json({ error: 'Ошибка получения истории платежей' });
    }
}
