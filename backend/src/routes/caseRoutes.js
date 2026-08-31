import { Router } from 'express';
import { caseController } from '../controllers/caseController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

const router = Router();

router.get('/', caseController.getAllCases);
router.get('/:id', caseController.getCaseById);
router.post('/', authenticateToken, caseController.createCase);
router.put('/:id', authenticateToken, caseController.updateCase);
router.delete('/:id', authenticateToken, caseController.deleteCase);

export default router;
