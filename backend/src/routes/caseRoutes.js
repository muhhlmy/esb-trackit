import { Router } from 'express';
import { caseController } from '../controllers/caseController.js';

const router = Router();

// FAQ Articles Endpoints (Open Access - Authentication bypassed for development)
router.get('/popular', caseController.getPopularCases);
router.get('/', caseController.getAllCases);
router.get('/:id', caseController.getCaseById);
router.post('/:id/interaction', caseController.recordInteraction);

// CMS Endpoints
router.put('/home-reorder', caseController.reorderHomeCases);
router.post('/', caseController.createCase);
router.put('/:id', caseController.updateCase);
router.delete('/:id', caseController.deleteCase);

export default router;
