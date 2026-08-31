import { Router } from 'express';
import { statController } from '../controllers/statController.js';

const router = Router();

router.get('/', statController.getStats);

export default router;
