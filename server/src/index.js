import 'dotenv/config'; // ESM-способ загрузки .env (вместо require('dotenv').config())
import express from 'express';
import cookieParser from 'cookie-parser';
import authRoutes from './routes/auth.routes.js';
import chatRoutes from './routes/chat.routes.js';
import rateLimit from 'express-rate-limit';
import cors from 'cors';

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: 'Слишком много попыток, попробуйте позже' },
});

const app = express();

app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json());
app.use(cookieParser());

app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/chats', authLimiter, chatRoutes);

app.get("/api/models", authLimiter, async (req, res) => {
  const response = await fetch("https://openrouter.ai/api/v1/models", {
    headers: {
      Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
    },
  });
  const data = await response.json();
  res.json(data);
});

// Глобальный обработчик ошибок
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Внутренняя ошибка сервера' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Сервер запущен на порту ${PORT}`);
});