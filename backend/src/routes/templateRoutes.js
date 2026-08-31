import { Router } from 'express';
import { templateController } from '../controllers/templateController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

const router = Router();

router.get('/', templateController.getAllTemplates);
router.post('/', authenticateToken, templateController.createTemplate);

export default router;
