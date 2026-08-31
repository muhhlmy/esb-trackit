import { Router } from 'express';
import { faqController } from '../controllers/faqController.js';

const router = Router();

// Public Endpoints
router.get('/popular', faqController.getPopularFaqs);
router.get('/', faqController.getAllFaqs);
router.post('/:id/interaction', faqController.recordInteraction);

// Admin CMS Endpoints
router.put('/reorder', faqController.reorderFaqs);
router.post('/', faqController.createFaq);
router.put('/:id', faqController.updateFaq);
router.delete('/:id', faqController.deleteFaq);

export default router;
