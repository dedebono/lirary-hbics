import express from 'express';
import { body, validationResult } from 'express-validator';
import { dbGet, dbRun, dbAll } from '../database/db.js';
import { authenticateToken } from '../middleware/auth.middleware.js';
import { requireAdmin } from '../middleware/role.middleware.js';

const router = express.Router();

// Helper to calculate due date (14 days)
const getDueDate = () => {
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 14);
    return dueDate;
};

// Borrow a book (Self)
router.post('/', authenticateToken, [
    body('bookId').isInt().withMessage('Valid book ID is required')
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { bookId } = req.body;
    const { id, userType } = req.user;

    try {
        // Check book availability
        const book = await dbGet('SELECT * FROM books WHERE id = ?', [bookId]);
        if (!book) return res.status(404).json({ error: 'Book not found' });
        if (book.available_qty <= 0) return res.status(400).json({ error: 'Book is not available' });

        // Check existing borrow
        const existingBorrow = await dbGet(
            `SELECT * FROM borrow_logs WHERE user_id = ? AND user_type = ? AND book_id = ? AND status = 'Borrowed'`,
            [id, userType, bookId]
        );
        if (existingBorrow) return res.status(400).json({ error: 'You already have this book borrowed' });

        const dueDate = getDueDate();

        // Transaction-like (sequential operations)
        const result = await dbRun(
            `INSERT INTO borrow_logs (user_id, user_type, book_id, due_date, status) VALUES (?, ?, ?, ?, 'Borrowed')`,
            [id, userType, bookId, dueDate.toISOString()]
        );

        await dbRun(
            `UPDATE books SET borrowed_count = borrowed_count + 1, available_qty = available_qty - 1, status = CASE WHEN available_qty - 1 <= 0 THEN 'Unavailable' ELSE 'Available' END WHERE id = ?`,
            [bookId]
        );

        res.status(201).json({
            message: 'Book borrowed successfully',
            borrowId: result.lastID,
            dueDate: dueDate.toISOString()
        });
    } catch (error) {
        console.error('Borrow error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Admin Borrow Book (On behalf of user)
router.post('/admin/borrow', authenticateToken, requireAdmin, [
    body('bookBarcode').notEmpty().withMessage('Book barcode is required')
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { bookBarcode, userBarcode, studentId, teacherId } = req.body;

    try {
        // 1. Find User
        let user = null;
        let pUserType = '';

        if (userBarcode) {
            // Try student
            user = await dbGet('SELECT * FROM students WHERE barcode = ?', [userBarcode]);
            if (user) {
                pUserType = 'student';
            } else {
                // Try teacher
                user = await dbGet('SELECT * FROM teachers WHERE barcode = ?', [userBarcode]);
                if (user) pUserType = 'teacher';
            }
        } else if (studentId) {
            user = await dbGet('SELECT * FROM students WHERE id = ?', [studentId]);
            pUserType = 'student';
        } else if (teacherId) {
            user = await dbGet('SELECT * FROM teachers WHERE id = ?', [teacherId]);
            pUserType = 'teacher';
        }

        if (!user) return res.status(404).json({ error: 'User not found' });

        // 2. Find Book
        const book = await dbGet('SELECT * FROM books WHERE book_barcode = ?', [bookBarcode]);
        if (!book) return res.status(404).json({ error: 'Book not found' });
        if (book.available_qty <= 0) return res.status(400).json({ error: 'Book is not available' });

        // 3. Check existing borrow
        const existingBorrow = await dbGet(
            `SELECT * FROM borrow_logs WHERE user_id = ? AND user_type = ? AND book_id = ? AND status = 'Borrowed'`,
            [user.id, pUserType, book.id]
        );
        if (existingBorrow) return res.status(400).json({ error: 'User already has this book borrowed' });

        const dueDate = getDueDate();

        // 4. Record Borrow
        const result = await dbRun(
            `INSERT INTO borrow_logs (user_id, user_type, book_id, due_date, status) VALUES (?, ?, ?, ?, 'Borrowed')`,
            [user.id, pUserType, book.id, dueDate.toISOString()]
        );

        await dbRun(
            `UPDATE books SET borrowed_count = borrowed_count + 1, available_qty = available_qty - 1, status = CASE WHEN available_qty - 1 <= 0 THEN 'Unavailable' ELSE 'Available' END WHERE id = ?`,
            [book.id]
        );

        res.status(201).json({
            message: 'Book borrowed successfully',
            borrowId: result.lastID,
            book: book,
            user: user,
            dueDate: dueDate.toISOString()
        });

    } catch (error) {
        console.error('Admin Borrow error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Return a book
router.post('/:id/return', authenticateToken, async (req, res) => {
    const { id: borrowId } = req.params;
    const { id: userId, userType, role } = req.user;

    try {
        const borrow = await dbGet('SELECT * FROM borrow_logs WHERE id = ?', [borrowId]);
        if (!borrow) return res.status(404).json({ error: 'Borrow record not found' });

        // Check auth
        if (borrow.user_id !== userId && role !== 'Admin' && role !== 'Librarian') {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        if (borrow.status === 'Returned') return res.status(400).json({ error: 'Book already returned' });

        await dbRun(
            `UPDATE borrow_logs SET status = 'Returned', return_date = CURRENT_TIMESTAMP WHERE id = ?`,
            [borrowId]
        );

        await dbRun(
            `UPDATE books SET borrowed_count = borrowed_count - 1, available_qty = available_qty + 1, status = 'Available' WHERE id = ?`,
            [borrow.book_id]
        );

        res.json({ message: 'Book returned successfully' });
    } catch (error) {
        console.error('Return error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get logs
router.get('/logs', authenticateToken, requireAdmin, async (req, res) => {
    const { status, userType } = req.query;
    let query = `
      SELECT bl.*, b.book_name, b.book_barcode, b.author,
      CASE 
          WHEN bl.user_type = 'student' THEN s.name
          WHEN bl.user_type = 'teacher' THEN t.name
      END as user_name
      FROM borrow_logs bl
      JOIN books b ON bl.book_id = b.id
      LEFT JOIN students s ON bl.user_type = 'student' AND bl.user_id = s.id
      LEFT JOIN teachers t ON bl.user_type = 'teacher' AND bl.user_id = t.id
      WHERE 1=1
    `;
    const params = [];

    if (status) {
        query += ' AND bl.status = ?';
        params.push(status);
    }
    if (userType) {
        query += ' AND bl.user_type = ?';
        params.push(userType);
    }
    query += ' ORDER BY bl.borrow_date DESC';

    try {
        const logs = await dbAll(query, params);
        res.json({ logs: logs || [] });
    } catch (error) {
        console.error('Error fetching logs:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get my loans
router.get('/my-loans', authenticateToken, async (req, res) => {
    const { id, userType } = req.user;
    try {
        const loans = await dbAll(
            `SELECT bl.*, b.book_name, b.book_barcode, b.author, b.publisher
             FROM borrow_logs bl
             JOIN books b ON bl.book_id = b.id
             WHERE bl.user_id = ? AND bl.user_type = ? AND bl.status = 'Borrowed'
             ORDER BY bl.borrow_date DESC`,
            [id, userType]
        );
        res.json({ loans: loans || [] });
    } catch (error) {
        console.error('Error fetching loans:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get my history
router.get('/my-history', authenticateToken, async (req, res) => {
    const { id, userType } = req.user;
    try {
        const history = await dbAll(
            `SELECT bl.*, b.book_name, b.book_barcode, b.author, b.publisher
             FROM borrow_logs bl
             JOIN books b ON bl.book_id = b.id
             WHERE bl.user_id = ? AND bl.user_type = ?
             ORDER BY bl.borrow_date DESC
             LIMIT 50`,
            [id, userType]
        );
        res.json({ history: history || [] });
    } catch (error) {
        console.error('Error fetching history:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get overdue
router.get('/overdue', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const overdueBooks = await dbAll(
            `SELECT bl.*, b.book_name, b.book_barcode, b.author,
             CASE 
                 WHEN bl.user_type = 'student' THEN s.name
                 WHEN bl.user_type = 'teacher' THEN t.name
             END as user_name
             FROM borrow_logs bl
             JOIN books b ON bl.book_id = b.id
             LEFT JOIN students s ON bl.user_type = 'student' AND bl.user_id = s.id
             LEFT JOIN teachers t ON bl.user_type = 'teacher' AND bl.user_id = t.id
             WHERE bl.status = 'Borrowed' AND DATE(bl.due_date) < DATE('now')
             ORDER BY bl.due_date ASC`
        );

        const booksWithDaysOverdue = (overdueBooks || []).map(book => {
            const dueDate = new Date(book.due_date);
            const now = new Date();
            const diffTime = Math.abs(now - dueDate);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            return { ...book, days_overdue: diffDays };
        });

        res.json({ overdueBooks: booksWithDaysOverdue });
    } catch (error) {
        console.error('Error fetching overdue:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
