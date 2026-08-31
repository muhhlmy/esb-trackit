import { Router } from 'express';
import caseRoutes from './caseRoutes.js';
import authRoutes from './authRoutes.js';
import templateRoutes from './templateRoutes.js';
import statRoutes from './statRoutes.js';

const router = Router();

router.use('/cases', caseRoutes);
router.use('/auth', authRoutes);
router.use('/templates', templateRoutes);
router.use('/stats', statRoutes);

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'ESB Case Playbook Backend'
  });
});

export default router;
