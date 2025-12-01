import express from 'express';
import { userDb } from '../db.js';

const router = express.Router();

// Middleware to ensure we are in a safe environment for demo creation
// In production, this should probably be restricted to admin or disabled
const ensureDevOrAdmin = (req, res, next) => {
    // For now, we'll allow it if it's explicitly enabled via env var or if in dev
    const enableDemoCreation = process.env.ENABLE_DEMO_CREATION === 'true' || process.env.NODE_ENV !== 'production';

    if (!enableDemoCreation) {
        return res.status(403).json({ error: 'Demo user creation is disabled in this environment' });
    }
    next();
};

/**
 * Create a new demo user
 * POST /api/demo/create-user
 * Body: { email, password, name }
 */
router.post('/create-user', ensureDevOrAdmin, async (req, res) => {
    try {
        const { email, password, name } = req.body;

        if (!email || !password || !name) {
            return res.status(400).json({ error: 'Email, password, and name are required' });
        }

        // Check if user exists
        const existingUser = userDb.findByEmail(email);
        if (existingUser) {
            return res.status(400).json({ error: 'User already exists' });
        }

        // Create user with isDemo = true
        const userId = userDb.create(email, password, name, true);

        res.status(201).json({
            success: true,
            user: {
                id: userId,
                email,
                name,
                is_demo: true
            },
            message: 'Demo user created successfully'
        });
    } catch (error) {
        console.error('Error creating demo user:', error);
        res.status(500).json({ error: 'Failed to create demo user' });
    }
});

/**
 * List all demo users (for debugging/admin)
 * GET /api/demo/users
 */
router.get('/users', ensureDevOrAdmin, (req, res) => {
    try {
        // This requires adding a method to db.js to list users, 
        // or we can just return a success message for now if that method doesn't exist
        // For safety, let's just return a placeholder until we add listUsers to db.js
        res.json({ message: 'List users functionality not yet implemented in db.js' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to list demo users' });
    }
});

export default router;
