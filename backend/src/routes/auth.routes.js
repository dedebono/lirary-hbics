import express from 'express';
import bcrypt from 'bcryptjs';
import { body, validationResult } from 'express-validator';
import { dbGet, dbRun } from '../database/db.js';
import { authenticateToken, generateToken } from '../middleware/auth.middleware.js';

const router = express.Router();

// Login endpoint
router.post('/login', [
    body('username').notEmpty().withMessage('Username or barcode is required'),
    body('password').notEmpty().withMessage('Password is required'),
    body('userType').isIn(['admin', 'student', 'teacher']).withMessage('Invalid user type')
], async (req, res) => {
    console.log('Login request received:', { username: req.body.username, userType: req.body.userType });

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        console.log('Validation errors:', errors.array());
        return res.status(400).json({ errors: errors.array() });
    }

    const { username, password, userType } = req.body;

    try {
        let user = null;
        let role = null;

        if (userType === 'admin') {
            user = await dbGet('SELECT * FROM users WHERE username = ?', [username]);
            role = user?.role;
        } else if (userType === 'student') {
            user = await dbGet('SELECT * FROM students WHERE barcode = ?', [username]);
            role = 'Student';
        } else if (userType === 'teacher') {
            user = await dbGet('SELECT * FROM teachers WHERE barcode = ?', [username]);
            role = 'Teacher';
        }

        if (!user) {
            console.log('User not found:', { username, userType });
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const isValidPassword = await bcrypt.compare(password, user.password_hash);
        if (!isValidPassword) {
            console.log('Invalid password for user:', username);
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const token = generateToken({
            id: user.id,
            name: user.name,
            role: role,
            userType: userType,
            school_level: user.school_level
        });

        console.log('Login successful:', { username, role });
        res.json({
            token,
            user: {
                id: user.id,
                name: user.name,
                role: role,
                userType: userType,
                school_level: user.school_level
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get current user info
router.get('/me', authenticateToken, (req, res) => {
    res.json({ user: req.user });
});

import upload from '../middleware/upload.middleware.js';

// ... (imports)

// Register new user (Admin only)
router.post('/register', authenticateToken, upload.single('photo'), [
    // Validation body(...) checks fields in req.body (populated by multer)
    body('name').notEmpty().withMessage('Name is required'),
    body('userType').isIn(['admin', 'student', 'teacher']).withMessage('Invalid user type'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
], async (req, res) => {
    // Check if user is admin
    if (req.user.role !== 'Admin' && req.user.role !== 'Librarian') {
        return res.status(403).json({ error: 'Admin access required' });
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { name, userType, password, username, barcode, className, role } = req.body;
    const photo = req.file ? `/uploads/photos/${req.file.filename}` : null;
    const school_level = req.user.school_level; // Inherit from logged-in admin

    try {
        const passwordHash = await bcrypt.hash(password, 10);

        if (userType === 'admin') {
            if (!username) {
                return res.status(400).json({ error: 'Username is required for admin users' });
            }

            const result = await dbRun(
                'INSERT INTO users (name, role, school_level, username, password_hash) VALUES (?, ?, ?, ?, ?)',
                [name, role || 'Admin', school_level, username, passwordHash]
            );

            res.status(201).json({
                message: 'Admin user created successfully',
                userId: result.lastID
            });
        } else if (userType === 'student') {
            if (!barcode || !className) {
                return res.status(400).json({ error: 'Barcode and class are required for students' });
            }

            const result = await dbRun(
                'INSERT INTO students (name, class, school_level, barcode, password_hash, photo) VALUES (?, ?, ?, ?, ?, ?)',
                [name, className, school_level, barcode, passwordHash, photo]
            );

            res.status(201).json({
                message: 'Student created successfully',
                userId: result.lastID,
                photo
            });
        } else if (userType === 'teacher') {
            if (!barcode) {
                return res.status(400).json({ error: 'Barcode is required for teachers' });
            }

            const result = await dbRun(
                'INSERT INTO teachers (name, school_level, barcode, password_hash, photo) VALUES (?, ?, ?, ?, ?)',
                [name, school_level, barcode, passwordHash, photo]
            );

            res.status(201).json({
                message: 'Teacher created successfully',
                userId: result.lastID,
                photo
            });
        }
    } catch (error) {
        console.error('Registration error:', error);
        if (error.message && error.message.includes('UNIQUE constraint failed')) {
            return res.status(400).json({ error: 'Username or barcode already exists' });
        }
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
