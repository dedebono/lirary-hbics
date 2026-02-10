import express from 'express';
import { body, validationResult } from 'express-validator';
import getDb from '../database/db.js';
import { authenticateToken } from '../middleware/auth.middleware.js';
import { requireAdmin } from '../middleware/role.middleware.js';

const router = express.Router();

// Get all users (Admin only)
// Get all users (Admin only)
router.get('/', authenticateToken, requireAdmin, (req, res) => {
    const { userType } = req.query;
    const db = getDb();

    let users = [];
    let completedQueries = 0;
    let expectedQueries = 0;

    const checkCompletion = () => {
        completedQueries++;
        if (completedQueries === expectedQueries) {
            res.json({ users });
        }
    };

    const handleError = (err) => {
        console.error('Error fetching users:', err);
        if (!res.headersSent) {
            res.status(500).json({ error: 'Internal server error' });
        }
    };

    if (!userType || userType === 'admin') expectedQueries++;
    if (!userType || userType === 'student') expectedQueries++;
    if (!userType || userType === 'teacher') expectedQueries++;

    if (expectedQueries === 0) return res.json({ users: [] });

    if (!userType || userType === 'admin') {
        db.all('SELECT id, name, role, username, created_at FROM users WHERE school_level = ?', [req.user.school_level], (err, admins) => {
            if (err) return handleError(err);
            users = users.concat((admins || []).map(u => ({ ...u, userType: 'admin' })));
            checkCompletion();
        });
    }

    if (!userType || userType === 'student') {
        db.all('SELECT id, name, class, barcode, photo, created_at FROM students WHERE school_level = ?', [req.user.school_level], (err, students) => {
            if (err) return handleError(err);
            users = users.concat((students || []).map(u => ({ ...u, userType: 'student' })));
            checkCompletion();
        });
    }

    if (!userType || userType === 'teacher') {
        db.all('SELECT id, name, barcode, photo, created_at FROM teachers WHERE school_level = ?', [req.user.school_level], (err, teachers) => {
            if (err) return handleError(err);
            users = users.concat((teachers || []).map(u => ({ ...u, userType: 'teacher' })));
            checkCompletion();
        });
    }
});

// Get user by ID (Admin only)
router.get('/:userType/:id', authenticateToken, requireAdmin, (req, res) => {
    const { userType, id } = req.params;
    const db = getDb();

    const handleUserResult = (err, user) => {
        if (err) {
            console.error('Error fetching user:', err);
            return res.status(500).json({ error: 'Internal server error' });
        }
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.json({ user: { ...user, userType } });
    };

    if (userType === 'admin') {
        db.get('SELECT id, name, role, username, created_at FROM users WHERE id = ? AND school_level = ?', [id, req.user.school_level], handleUserResult);
    } else if (userType === 'student') {
        db.get('SELECT id, name, class, barcode, photo, created_at FROM students WHERE id = ? AND school_level = ?', [id, req.user.school_level], handleUserResult);
    } else if (userType === 'teacher') {
        db.get('SELECT id, name, barcode, photo, created_at FROM teachers WHERE id = ? AND school_level = ?', [id, req.user.school_level], handleUserResult);
    } else {
        res.status(400).json({ error: 'Invalid user type' });
    }
});

import upload from '../middleware/upload.middleware.js';

// ... (imports)

// Update user (Admin only)
router.put('/:userType/:id', authenticateToken, requireAdmin, upload.single('photo'), (req, res) => {
    const { userType, id } = req.params;
    const db = getDb();
    const photo = req.file ? `/uploads/photos/${req.file.filename}` : undefined;

    const handleUpdateResult = (err) => {
        if (err) {
            console.error('Error updating user:', err);
            if (err.message.includes('UNIQUE constraint failed')) {
                return res.status(400).json({ error: 'Username or barcode already exists' });
            }
            return res.status(500).json({ error: 'Internal server error' });
        }
        res.json({ message: 'User updated successfully', photo });
    };

    if (userType === 'admin') {
        const { name, role, username } = req.body;
        // Admins don't have photo column in this migration
        db.run('UPDATE users SET name = ?, role = ?, username = ? WHERE id = ?', [name, role, username, id], handleUpdateResult);
    } else if (userType === 'student') {
        const { name, class: className, barcode } = req.body; // Multer parses body but 'class' might be mapped from 'className' in frontend or kept as 'class'. Frontend sends 'class'. 
        // Wait, frontend usually sends JSON. When using FormData, keys are strings. 
        // If frontend sends 'class', req.body.class will be set.
        // But in the original code: `const { name, className, barcode } = req.body;`
        // `db.run(..., [name, className, barcode, id])`
        // If the frontend sends `class`, then `className` would be undefined unless mapped.
        // Let's check the original code again.
        // Original: `const { name, className, barcode } = req.body;`
        // `UPDATE students SET ... class = ? ... [..., className, ...]`
        // This implies the frontend was sending `className`.
        // I should check frontend `UserManagement` to be sure. 
        // Or I can just support both.
        const cls = req.body.class || req.body.className;

        const query = `
            UPDATE students SET name = ?, class = ?, barcode = ? ${photo ? ', photo = ?' : ''} WHERE id = ?
        `;
        const params = [name, cls, barcode];
        if (photo) params.push(photo);
        params.push(id);

        db.run(query, params, handleUpdateResult);

    } else if (userType === 'teacher') {
        const { name, barcode } = req.body;

        const query = `
            UPDATE teachers SET name = ?, barcode = ? ${photo ? ', photo = ?' : ''} WHERE id = ?
        `;
        const params = [name, barcode];
        if (photo) params.push(photo);
        params.push(id);

        db.run(query, params, handleUpdateResult);

    } else {
        res.status(400).json({ error: 'Invalid user type' });
    }
});

// Delete user (Admin only)
router.delete('/:userType/:id', authenticateToken, requireAdmin, (req, res) => {
    const { userType, id } = req.params;
    const db = getDb();

    const handleDeleteResult = (err) => {
        if (err) {
            console.error('Error deleting user:', err);
            return res.status(500).json({ error: 'Internal server error' });
        }
        res.json({ message: 'User deleted successfully' });
    };

    if (userType === 'admin') {
        db.run('DELETE FROM users WHERE id = ?', [id], handleDeleteResult);
    } else if (userType === 'student') {
        db.run('DELETE FROM students WHERE id = ?', [id], handleDeleteResult);
    } else if (userType === 'teacher') {
        db.run('DELETE FROM teachers WHERE id = ?', [id], handleDeleteResult);
    } else {
        res.status(400).json({ error: 'Invalid user type' });
    }
});

export default router;
