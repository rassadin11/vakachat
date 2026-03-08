// routes/chat.routes.js
import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware.js';
import * as chatController from '../controllers/chat.controller.js';

const router = Router();

// Все роуты чатов требуют авторизации — вешаем authMiddleware на весь роутер
router.use(authMiddleware);

// Чаты
router.post('/', chatController.createChat);
router.get('/', chatController.getUserChats);
router.patch('/:chatId/title', chatController.updateChatTitle);
router.delete('/:chatId', chatController.deleteChat);
router.get('/:chatId', chatController.getChat);

// Сообщения
router.get('/:chatId/messages', chatController.getChatMessages);
router.post('/:chatId/messages', chatController.createMessage);
router.patch('/:chatId/messages/:messageId', chatController.updateMessage);
router.delete('/:chatId/messages/:messageId', chatController.deleteMessage);
router.post('/:chatId/proxy', chatController.proxyChatRequest);

export default router;