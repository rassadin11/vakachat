// routes/guest.routes.js
import { Router } from 'express';
import { guestMessage } from '../controllers/guest.controller.js';

const router = Router();

router.post('/message', guestMessage);

export default router;
