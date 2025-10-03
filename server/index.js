import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.js';
import stravaRoutes from './routes/strava.js';
import googleRoutes from './routes/google.js';
import trainingRoutes from './routes/training.js';
import analyticsRoutes from './routes/analytics.js';
import raceRoutes from './routes/race.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/strava', stravaRoutes);
app.use('/api/google', googleRoutes);
app.use('/api/training', trainingRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/race', raceRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`🚀 AI Fitness Coach server running on port ${PORT}`);
});
