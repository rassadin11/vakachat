// routes/payment.routes.js
import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware.js';
import * as paymentController from '../controllers/payment.controller.js';

const router = Router();

router.post('/create', authMiddleware, paymentController.createPayment);
router.get('/history', authMiddleware, paymentController.getHistory);
router.post('/webhook', paymentController.webhook);

export default router;
