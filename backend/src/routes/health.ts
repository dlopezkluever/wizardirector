import { Router } from 'express';

const router = Router();

router.get('/', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'wizardirector-api',
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development'
  });
});

export { router as healthRouter };
