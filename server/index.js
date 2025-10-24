import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import authRoutes from './routes/auth.js';
import stravaRoutes from './routes/strava.js';
import googleRoutes from './routes/google.js';
import trainingRoutes from './routes/training.js';
import analyticsRoutes from './routes/analytics.js';
import raceRoutes from './routes/race.js';
import raceTagRoutes from './routes/raceTags.js';
import adaptationRoutes from './routes/adaptation.js';
import userRoutes from './routes/user.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;
const isProduction = process.env.NODE_ENV === 'production';

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' })); // Increase limit for large activity datasets
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/strava', stravaRoutes);
app.use('/api/google', googleRoutes);
app.use('/api/training', trainingRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/race', raceRoutes);
app.use('/api/race-tags', raceTagRoutes);
app.use('/api/adaptation', adaptationRoutes);
app.use('/api/user', userRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Serve static files in production
if (isProduction) {
  const distPath = path.join(__dirname, '../dist');
  
  // Serve static files
  app.use(express.static(distPath));
  
  // Handle React routing - return all requests to React app
  app.get('*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`🚀 AI Fitness Coach server running on port ${PORT}`);
  console.log(`📊 Environment: ${isProduction ? 'production' : 'development'}`);
  if (isProduction) {
    console.log(`🌐 Serving static files from dist/`);
  }
});
