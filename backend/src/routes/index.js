import { Router } from 'express';
import caseRoutes from './caseRoutes.js';
import authRoutes from './authRoutes.js';
import statRoutes from './statRoutes.js';
import faqRoutes from './faqRoutes.js';

const router = Router();

router.use('/cases', caseRoutes);
router.use('/auth', authRoutes);
router.use('/stats', statRoutes);
router.use('/faqs', faqRoutes);

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'ESB Case Playbook Backend'
  });
});

export default router;
