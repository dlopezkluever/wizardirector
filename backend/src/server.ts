import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import * as dotenv from 'dotenv';

import { healthRouter } from './routes/health.js';
import { projectsRouter } from './routes/projects.js';
import { stageStatesRouter } from './routes/stageStates.js';
import { llmRouter } from './routes/llm.js';
import { seedRouter } from './routes/seed.js';
import styleCapsulesRouter from './routes/styleCapsules.js';
import { imagesRouter } from './routes/images.js';
import { assetsRouter } from './routes/assets.js';
import { projectAssetsRouter } from './routes/projectAssets.js';
import { authenticateUser } from './middleware/auth.js';
import { errorHandler } from './middleware/errorHandler.js';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Security middleware
app.use(helmet());

// CORS configuration
app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? ['https://your-frontend-domain.com']
    : ['http://localhost:5173', 'http://localhost:3000'],
  credentials: true,
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check route
app.use('/api/health', healthRouter);

// Projects routes (protected)
app.use('/api/projects', authenticateUser, projectsRouter);

// Project assets routes (protected, nested under projects)
app.use('/api/projects', authenticateUser, projectAssetsRouter);

// Stage states routes (protected, nested under projects)
app.use('/api/projects', authenticateUser, stageStatesRouter);

// LLM routes (protected)
app.use('/api/llm', authenticateUser, llmRouter);

// Seed routes (protected)
app.use('/api/seed', authenticateUser, seedRouter);

// Style Capsules routes (protected)
app.use('/api/style-capsules', authenticateUser, styleCapsulesRouter);

// Image generation routes (protected)
app.use('/api/images', authenticateUser, imagesRouter);

// Global assets routes (protected)
app.use('/api/assets', authenticateUser, assetsRouter);

// Error handling middleware (must be last)
app.use(errorHandler);

// Export app for integration tests (supertest); only listen when not in test
export { app };

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`🚀 Wizardirector API server running on port ${PORT}`);
    console.log(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
  });
}
