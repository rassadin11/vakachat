import 'dotenv/config'; // ESM-способ загрузки .env (вместо require('dotenv').config())
import express from 'express';
import cookieParser from 'cookie-parser';
import authRoutes from './routes/auth.routes.js';
import chatRoutes from './routes/chat.routes.js';
import guestRoutes from './routes/guest.routes.js';
import paymentRoutes from './routes/payment.routes.js';
import rateLimit from 'express-rate-limit';
import cors from 'cors';
import { getModels } from './routes/models.js';
import { initCurrencyRate, getRate } from './constants/constants.js';

await initCurrencyRate();

const authLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 50,
  message: { error: 'Слишком много попыток, попробуйте позже' },
});

const guestLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 час
  max: 5,
  message: { error: 'Исчерпан лимит пробных запросов. Зарегистрируйтесь для продолжения.' },
});

const app = express();

app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json({ limit: "25mb" }));
app.use(express.urlencoded({ extended: true, limit: "25mb" }));

app.use(cookieParser());

app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/chats', authLimiter, chatRoutes);
app.use('/api/guest', guestLimiter, guestRoutes);
app.use('/api/payments', paymentRoutes);

app.get("/api/models", authLimiter, getModels);

// Глобальный обработчик ошибок
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Внутренняя ошибка сервера' });
});

const PORT = Number(process.env.PORT) || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Сервер запущен на порту ${PORT}`);
});