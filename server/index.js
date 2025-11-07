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
import feedbackRoutes from './routes/feedback.js';
import manualActivityRoutes from './routes/manualActivities.js';
import seasonRacesRoutes from './routes/seasonRaces.js';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const adminRoutes = require('./routes/admin.cjs');
const personaRoutes = require('./routes/personas.cjs');
const imageGenerationRoutes = require('./routes/imageGeneration.cjs');
const planTemplateRoutes = require('./routes/planTemplates.cjs');
const themeConfigRoutes = require('./routes/themeConfigs.cjs');
const modelPricingCron = require('./services/modelPricingCron.cjs');
const apiKeyLoader = require('./services/apiKeyLoader.cjs');

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
app.use('/api/feedback', feedbackRoutes);
app.use('/api/manual-activities', manualActivityRoutes);
app.use('/api/season-races', seasonRacesRoutes);
app.use('/api/personas', personaRoutes);
app.use('/api/image-generation', imageGenerationRoutes);
app.use('/api/plan-templates', planTemplateRoutes);
app.use('/api/admin/theme-configs', themeConfigRoutes);
app.use('/api/admin', adminRoutes);

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

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

app.listen(PORT, async () => {
  console.log(`🚀 AI Fitness Coach server running on port ${PORT}`);
  console.log(`📊 Environment: ${isProduction ? 'production' : 'development'}`);
  if (isProduction) {
    console.log(`🌐 Serving static files from dist/`);
  }
  
  // Load API keys from database
  await apiKeyLoader.loadApiKeys();
  
  // Initialize model pricing cron job
  modelPricingCron.initializeModelPricingCron();
});
