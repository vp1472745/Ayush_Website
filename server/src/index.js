import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from .env.local
dotenv.config({ path: path.join(__dirname, '../.env.local') });

import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import connectDB from './config/db.js';
import seedInitialData from './config/seed.js';
import apiRoutes from './router/index.js';
import { notFound, errorHandler } from './middleware/errorMiddleware.js';

const app = express();

// Connect to MongoDB Database
connectDB().then(async () => {
  // Automatically ensure default admin credentials exist
  await seedInitialData();
});

// Middleware
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:3000', process.env.CLIENT_URL].filter(Boolean),
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
}

// Serve uploaded photos/avatars statically
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Root Route
app.get('/', (req, res) => {
  res.json({
    message: 'Welcome to Ayush Rider Portal Backend API Server',
    api_docs: '/api/health',
  });
});

// Mount All API Routes
app.use('/api', apiRoutes);

// Centralized Error Handling Middlewares
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 8050;
const server = app.listen(PORT, () => {
  console.log(`\n======================================================`);
  console.log(`🚀 [Server Running]: http://localhost:${PORT}`);
  console.log(`📁 [Uploads Served]: http://localhost:${PORT}/uploads`);
  console.log(`🔑 [API Endpoints]: http://localhost:${PORT}/api`);
  console.log(`======================================================\n`);
});

export { app, server };
