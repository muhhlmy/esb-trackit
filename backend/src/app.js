// Express Application Configuration & Entry
import express from 'express';
import cors from 'cors';
import './config/env.js';
import routes from './routes/index.js';
import { errorHandler } from './middleware/errorHandler.js';

const app = express();
const PORT = process.env.PORT || 5000;

// Security & Parsing Middlewares
app.use(cors({
  origin: process.env.CLIENT_ORIGIN || '*',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Register API Routes
app.use('/api', routes);

// Root fallback route
app.get('/', (req, res) => {
  res.json({
    message: 'ESB Case API Server (Express v5 & Prisma ORM) is running.',
    docs: '/api/health'
  });
});

// Global Error Handler
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  console.log(`🚀 ESB Case Backend Server is running on http://localhost:${PORT}`);
  console.log(`📡 API Health Check: http://localhost:${PORT}/api/health`);
});

export default app;
