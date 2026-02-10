import express from 'express';
import { body, validationResult } from 'express-validator';
import getDb from '../database/db.js';
import { authenticateToken } from '../middleware/auth.middleware.js';
import { requireAdmin } from '../middleware/role.middleware.js';

const router = express.Router();

// Check-in (Student/Teacher)
router.post('/checkin', authenticateToken, (req, res) => {
    const { id, userType } = req.user;
    const db = getDb();

    // Prevent admins from checking in (database constraint)
    if (userType !== 'student' && userType !== 'teacher') {
        return res.status(403).json({ error: 'Only students and teachers can check in' });
    }

    // Check if already checked in
    db.get('SELECT * FROM attendance_logs WHERE user_id = ? AND user_type = ? ORDER BY timestamp DESC LIMIT 1', [id, userType], (err, lastLog) => {
        if (err) {
            console.error('Check-in error (fetch):', err);
            return res.status(500).json({ error: 'Internal server error' });
        }

        if (lastLog && lastLog.type === 'In') {
            return res.status(400).json({ error: 'Already checked in' });
        }

        db.run('INSERT INTO attendance_logs (user_id, user_type, type) VALUES (?, ?, "In")', [id, userType], function (err) {
            if (err) {
                console.error('Check-in error (insert):', err);
                return res.status(500).json({ error: 'Internal server error' });
            }

            res.status(201).json({
                message: 'Checked in successfully',
                logId: this.lastID
            });
        });
    });
});

// Check-out (Student/Teacher)
router.post('/checkout', authenticateToken, (req, res) => {
    const { id, userType } = req.user;
    const db = getDb();

    // Prevent admins from checking out
    if (userType !== 'student' && userType !== 'teacher') {
        return res.status(403).json({ error: 'Only students and teachers can check out' });
    }

    // Check if checked in
    db.get('SELECT * FROM attendance_logs WHERE user_id = ? AND user_type = ? ORDER BY timestamp DESC LIMIT 1', [id, userType], (err, lastLog) => {
        if (err) {
            console.error('Check-out error (fetch):', err);
            return res.status(500).json({ error: 'Internal server error' });
        }

        if (!lastLog || lastLog.type === 'Out') {
            return res.status(400).json({ error: 'Not checked in' });
        }

        db.run('INSERT INTO attendance_logs (user_id, user_type, type) VALUES (?, ?, "Out")', [id, userType], function (err) {
            if (err) {
                console.error('Check-out error (insert):', err);
                return res.status(500).json({ error: 'Internal server error' });
            }

            res.status(201).json({
                message: 'Checked out successfully',
                logId: this.lastID
            });
        });
    });
});

// Get attendance status
router.get('/status', authenticateToken, (req, res) => {
    const { id, userType } = req.user;
    const db = getDb();

    db.get('SELECT * FROM attendance_logs WHERE user_id = ? AND user_type = ? ORDER BY timestamp DESC LIMIT 1', [id, userType], (err, lastLog) => {
        if (err) {
            console.error('Error fetching attendance status:', err);
            return res.status(500).json({ error: 'Internal server error' });
        }

        res.json({
            isCheckedIn: lastLog && lastLog.type === 'In',
            lastLog: lastLog || null
        });
    });
});

// Get all attendance logs (Admin only)
router.get('/logs', authenticateToken, requireAdmin, (req, res) => {
    const { startDate, endDate, userType } = req.query;
    const db = getDb();

    let query = `
        SELECT 
            al.id,
            al.user_id,
            al.user_type,
            al.timestamp,
            al.type,
            CASE 
                WHEN al.user_type = 'student' THEN s.name
                WHEN al.user_type = 'teacher' THEN t.name
            END as user_name,
            CASE 
                WHEN al.user_type = 'student' THEN s.barcode
                WHEN al.user_type = 'teacher' THEN t.barcode
            END as barcode
        FROM attendance_logs al
        LEFT JOIN students s ON al.user_type = 'student' AND al.user_id = s.id
        LEFT JOIN teachers t ON al.user_type = 'teacher' AND al.user_id = t.id
        WHERE (
            (al.user_type = 'student' AND s.school_level = ?) OR
            (al.user_type = 'teacher' AND t.school_level = ?)
        )
    `;
    const params = [req.user.school_level, req.user.school_level];

    if (startDate) {
        query += ' AND DATE(al.timestamp) >= DATE(?)';
        params.push(startDate);
    }

    if (endDate) {
        query += ' AND DATE(al.timestamp) <= DATE(?)';
        params.push(endDate);
    }

    if (userType) {
        query += ' AND al.user_type = ?';
        params.push(userType);
    }

    query += ' ORDER BY al.timestamp DESC';

    db.all(query, params, (err, logs) => {
        if (err) {
            console.error('Error fetching attendance logs:', err);
            return res.status(500).json({ error: 'Internal server error' });
        }

        // Ensure logs is an array and filter out logs with missing user data
        const logsArray = Array.isArray(logs) ? logs : [];
        const formattedLogs = logsArray
            .filter(log => log && log.type && log.user_name) // Only include logs with valid data
            .map(log => ({
                ...log,
                action: log.type === 'In' ? 'Check-in' : 'Check-out'
            }));

        res.json({ logs: formattedLogs });
    });
});

// Get my attendance logs
router.get('/my-logs', authenticateToken, (req, res) => {
    const { id, userType } = req.user;
    const db = getDb();

    db.all('SELECT * FROM attendance_logs WHERE user_id = ? AND user_type = ? ORDER BY timestamp DESC LIMIT 50', [id, userType], (err, logs) => {
        if (err) {
            console.error('Error fetching my attendance logs:', err);
            return res.status(500).json({ error: 'Internal server error' });
        }

        res.json({ logs: logs || [] });
    });
});

// Scan barcode for attendance (Check-in/Check-out Toggle)
router.post('/scan', authenticateToken, (req, res) => {
    const { barcode } = req.body;
    const db = getDb();

    if (!barcode) {
        return res.status(400).json({ error: 'Barcode is required' });
    }

    // Find user by barcode (Student or Teacher)
    const findUserQuery = `
        SELECT id, name, 'student' as user_type FROM students WHERE barcode = ?
        UNION
        SELECT id, name, 'teacher' as user_type FROM teachers WHERE barcode = ?
    `;

    db.get(findUserQuery, [barcode, barcode], (err, user) => {
        if (err) {
            console.error('Error finding user by barcode:', err);
            return res.status(500).json({ error: 'Internal server error' });
        }

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Get last attendance log
        db.get('SELECT * FROM attendance_logs WHERE user_id = ? AND user_type = ? ORDER BY timestamp DESC LIMIT 1', [user.id, user.user_type], (err, lastLog) => {
            if (err) {
                console.error('Error fetching last log:', err);
                return res.status(500).json({ error: 'Internal server error' });
            }

            // Determine action: If last was In, now Out. Otherwise In.
            const action = (lastLog && lastLog.type === 'In') ? 'Out' : 'In';

            db.run('INSERT INTO attendance_logs (user_id, user_type, type) VALUES (?, ?, ?)', [user.id, user.user_type, action], function (err) {
                if (err) {
                    console.error('Error recording attendance:', err);
                    return res.status(500).json({ error: 'Internal server error' });
                }

                const message = action === 'In' ? 'Checked in successfully' : 'Checked out successfully';
                res.json({
                    message,
                    action,
                    user: {
                        id: user.id,
                        name: user.name,
                        userType: user.user_type
                    }
                });
            });
        });
    });
});

export default router;
