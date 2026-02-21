import express from 'express';
import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();
const db = new Database(path.join(__dirname, '../fitness-coach.db'));

// Middleware to verify session token
const verifyToken = (req, res, next) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  // Get user from session token
  const session = db.prepare('SELECT user_id FROM sessions WHERE token = ?').get(token);
  if (!session) {
    return res.status(401).json({ error: 'Invalid session' });
  }
  
  req.userId = session.user_id;
  next();
};

// GET all races for user
router.get('/', verifyToken, (req, res) => {
  try {
    const races = db.prepare(`
      SELECT * FROM season_races 
      WHERE user_id = ? 
      ORDER BY date ASC
    `).all(req.userId);
    
    res.json({ races });
  } catch (error) {
    console.error('Error fetching races:', error);
    res.status(500).json({ error: 'Failed to fetch races' });
  }
});

// POST create new race
router.post('/', verifyToken, (req, res) => {
  try {
    const { name, date, location, distance, elevation, url, registrationDeadline, entryFee, raceType, status, priority, isTeamRace, notes } = req.body;
    
    if (!name || !date) {
      return res.status(400).json({ error: 'Name and date are required' });
    }
    
    const result = db.prepare(`
      INSERT INTO season_races 
      (user_id, name, date, location, distance, elevation, url, registration_deadline, entry_fee, race_type, status, priority, is_team_race, notes, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `).run(
      req.userId,
      name,
      date,
      location || null,
      distance || null,
      elevation || null,
      url || null,
      registrationDeadline || null,
      entryFee || null,
      raceType || 'road_race',
      status || 'provisional',
      priority || 'B',
      isTeamRace ? 1 : 0,
      notes || null
    );
    
    const newRace = db.prepare('SELECT * FROM season_races WHERE id = ?').get(result.lastInsertRowid);
    
    res.json({ race: newRace });
  } catch (error) {
    console.error('Error creating race:', error);
    res.status(500).json({ error: 'Failed to create race' });
  }
});

// PUT update race
router.put('/:id', verifyToken, (req, res) => {
  try {
    const { id } = req.params;
    const { name, date, location, distance, elevation, url, registrationDeadline, entryFee, raceType, status, priority, isTeamRace, notes } = req.body;
    
    // Verify race belongs to user
    const race = db.prepare('SELECT * FROM season_races WHERE id = ? AND user_id = ?').get(id, req.userId);
    if (!race) {
      return res.status(404).json({ error: 'Race not found' });
    }
    
    db.prepare(`
      UPDATE season_races 
      SET name = ?, date = ?, location = ?, distance = ?, elevation = ?, url = ?, 
          registration_deadline = ?, entry_fee = ?, race_type = ?, 
          status = ?, priority = ?, is_team_race = ?, notes = ?, updated_at = datetime('now')
      WHERE id = ? AND user_id = ?
    `).run(
      name,
      date,
      location || null,
      distance || null,
      elevation || null,
      url || null,
      registrationDeadline || null,
      entryFee || null,
      raceType || 'road_race',
      status || 'provisional',
      priority || 'B',
      isTeamRace ? 1 : 0,
      notes || null,
      id,
      req.userId
    );
    
    const updatedRace = db.prepare('SELECT * FROM season_races WHERE id = ?').get(id);
    
    res.json({ race: updatedRace });
  } catch (error) {
    console.error('Error updating race:', error);
    res.status(500).json({ error: 'Failed to update race' });
  }
});

// DELETE race
router.delete('/:id', verifyToken, (req, res) => {
  try {
    const { id } = req.params;
    
    // Verify race belongs to user
    const race = db.prepare('SELECT * FROM season_races WHERE id = ? AND user_id = ?').get(id, req.userId);
    if (!race) {
      return res.status(404).json({ error: 'Race not found' });
    }
    
    db.prepare('DELETE FROM season_races WHERE id = ? AND user_id = ?').run(id, req.userId);
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting race:', error);
    res.status(500).json({ error: 'Failed to delete race' });
  }
});

export default router;
