import express from 'express';
import { body, validationResult } from 'express-validator';
import getDb from '../database/db.js';
import { authenticateToken } from '../middleware/auth.middleware.js';
import { requireAdmin } from '../middleware/role.middleware.js';

const router = express.Router();

// Get all books with search and filter
// Get all books with search and filter
router.get('/', authenticateToken, (req, res) => {
    const { search, status } = req.query;
    const db = getDb();

    let query = 'SELECT * FROM books WHERE school_level = ?';
    const params = [req.user.school_level];

    if (search) {
        query += ' AND (book_name LIKE ? OR author LIKE ? OR book_isbn LIKE ? OR book_barcode LIKE ?)';
        const searchTerm = `%${search}%`;
        params.push(searchTerm, searchTerm, searchTerm, searchTerm);
    }

    if (status) {
        query += ' AND status = ?';
        params.push(status);
    }

    query += ' ORDER BY book_name ASC';

    db.all(query, params, (err, books) => {
        if (err) {
            console.error('Error fetching books:', err);
            return res.status(500).json({ error: 'Internal server error' });
        }
        res.json({ books: books || [] });
    });
});

// Get book by ID
router.get('/:id', authenticateToken, (req, res) => {
    const { id } = req.params;
    const db = getDb();

    db.get('SELECT * FROM books WHERE id = ? AND school_level = ?', [id, req.user.school_level], (err, book) => {
        if (err) {
            console.error('Error fetching book:', err);
            return res.status(500).json({ error: 'Internal server error' });
        }
        if (!book) {
            return res.status(404).json({ error: 'Book not found' });
        }
        res.json({ book });
    });
});

// Search book by barcode
router.get('/barcode/:barcode', authenticateToken, (req, res) => {
    const { barcode } = req.params;
    const db = getDb();

    db.get('SELECT * FROM books WHERE book_barcode = ? AND school_level = ?', [barcode, req.user.school_level], (err, book) => {
        if (err) {
            console.error('Error fetching book by barcode:', err);
            return res.status(500).json({ error: 'Internal server error' });
        }
        if (!book) {
            return res.status(404).json({ error: 'Book not found' });
        }
        res.json({ book });
    });
});

import upload from '../middleware/upload.middleware.js';

// ... (imports)

// Add new book (Admin only)
router.post('/', authenticateToken, requireAdmin, upload.single('cover'), [
    // Validation body(...) checks fields in req.body (populated by multer)
    body('book_barcode').notEmpty().withMessage('Book barcode is required'),
    body('book_name').notEmpty().withMessage('Book name is required'),
    body('quantity').isInt({ min: 0 }).withMessage('Quantity must be a positive number')
], (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const {
        book_barcode,
        book_name,
        year,
        author,
        publisher,
        quantity,
        book_isbn
    } = req.body;

    // Handle uploaded file
    const book_cover = req.file ? `/uploads/covers/${req.file.filename}` : null;

    const db = getDb();

    const query = `
      INSERT INTO books (book_barcode, book_name, school_level, year, author, publisher, quantity, borrowed_count, status, available_qty, book_isbn, book_cover)
      VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?)
    `;

    const status = quantity > 0 ? 'Available' : 'Unavailable';
    const params = [
        book_barcode,
        book_name,
        req.user.school_level,
        year || null,
        author || null,
        publisher || null,
        quantity,
        status,
        quantity,
        book_isbn || null,
        book_cover
    ];

    db.run(query, params, function (err) {
        if (err) {
            console.error('Error adding book:', err);
            if (err.message.includes('UNIQUE constraint failed') || err.message.includes('SQLITE_CONSTRAINT')) {
                return res.status(400).json({ error: 'Book barcode already exists' });
            }
            return res.status(500).json({ error: 'Internal server error' });
        }

        res.status(201).json({
            message: 'Book added successfully',
            bookId: this.lastID,
            book_cover
        });
    });
});

// Update book (Admin only)
router.put('/:id', authenticateToken, requireAdmin, upload.single('cover'), (req, res) => {
    const { id } = req.params;
    const {
        book_barcode,
        book_name,
        year,
        author,
        publisher,
        quantity,
        book_isbn
    } = req.body;

    const book_cover_new = req.file ? `/uploads/covers/${req.file.filename}` : undefined;

    const db = getDb();

    db.get('SELECT * FROM books WHERE id = ?', [id], (err, book) => {
        if (err) {
            console.error('Error fetching book for update:', err);
            return res.status(500).json({ error: 'Internal server error' });
        }
        if (!book) {
            return res.status(404).json({ error: 'Book not found' });
        }

        const newQuantity = quantity !== undefined ? Number(quantity) : book.quantity;
        const borrowedCount = book.borrowed_count;
        const availableQty = newQuantity - borrowedCount;
        const status = availableQty > 0 ? 'Available' : 'Unavailable';

        const query = `
          UPDATE books
          SET book_barcode = ?, book_name = ?, year = ?, author = ?, publisher = ?, 
              quantity = ?, available_qty = ?, status = ?, book_isbn = ?
              ${book_cover_new ? ', book_cover = ?' : ''}
          WHERE id = ?
        `;

        const params = [
            book_barcode || book.book_barcode,
            book_name || book.book_name,
            year !== undefined ? year : book.year,
            author !== undefined ? author : book.author,
            publisher !== undefined ? publisher : book.publisher,
            newQuantity,
            availableQty,
            status,
            book_isbn !== undefined ? book_isbn : book.book_isbn
        ];

        if (book_cover_new) {
            params.push(book_cover_new);
        }
        params.push(id);

        db.run(query, params, function (err) {
            if (err) {
                console.error('Error updating book:', err);
                if (err.message.includes('UNIQUE constraint failed') || err.message.includes('SQLITE_CONSTRAINT')) {
                    return res.status(400).json({ error: 'Book barcode already exists' });
                }
                return res.status(500).json({ error: 'Internal server error' });
            }
            res.json({ message: 'Book updated successfully', book_cover: book_cover_new });
        });
    });
});

// Delete book (Admin only)
router.delete('/:id', authenticateToken, requireAdmin, (req, res) => {
    const { id } = req.params;
    const db = getDb();

    db.get('SELECT * FROM books WHERE id = ?', [id], (err, book) => {
        if (err) {
            console.error('Error fetching book for deletion:', err);
            return res.status(500).json({ error: 'Internal server error' });
        }
        if (!book) {
            return res.status(404).json({ error: 'Book not found' });
        }

        // Check if book has active borrows
        db.get('SELECT COUNT(*) as count FROM borrow_logs WHERE book_id = ? AND status = ?', [id, 'Borrowed'], (err, activeBorrows) => {
            if (err) {
                console.error('Error checking active borrows:', err);
                return res.status(500).json({ error: 'Internal server error' });
            }

            if (activeBorrows.count > 0) {
                return res.status(400).json({ error: 'Cannot delete book with active borrows' });
            }

            db.run('DELETE FROM books WHERE id = ?', [id], (err) => {
                if (err) {
                    console.error('Error deleting book:', err);
                    return res.status(500).json({ error: 'Internal server error' });
                }
                res.json({ message: 'Book deleted successfully' });
            });
        });
    });
});

export default router;
