import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { body, validationResult } from 'express-validator';
import getDb from '../database/db.js';
import { authenticateToken } from '../middleware/auth.middleware.js';
import { requireAdmin } from '../middleware/role.middleware.js';

const router = express.Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path.join(__dirname, '..', '..', 'uploads', 'ebooks');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: parseInt(process.env.MAX_FILE_SIZE) || 52428800 // 50MB default
    },
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'application/pdf') {
            cb(null, true);
        } else {
            cb(new Error('Only PDF files are allowed'));
        }
    }
});

// Get all e-books
router.get('/', authenticateToken, (req, res) => {
    const { category, search } = req.query;
    const db = getDb();

    let query = 'SELECT id, title, category, created_at FROM ebooks WHERE 1=1';
    const params = [];

    if (category) {
        query += ' AND category = ?';
        params.push(category);
    }

    if (search) {
        query += ' AND title LIKE ?';
        params.push(`%${search}%`);
    }

    query += ' ORDER BY title ASC';

    db.all(query, params, (err, ebooks) => {
        if (err) {
            console.error('Error fetching e-books:', err);
            return res.status(500).json({ error: 'Internal server error' });
        }
        res.json({ ebooks: ebooks || [] });
    });
});

// Get e-book by ID
router.get('/:id', authenticateToken, (req, res) => {
    const { id } = req.params;
    const db = getDb();

    db.get('SELECT id, title, category, created_at FROM ebooks WHERE id = ?', [id], (err, ebook) => {
        if (err) {
            console.error('Error fetching e-book:', err);
            return res.status(500).json({ error: 'Internal server error' });
        }
        if (!ebook) {
            return res.status(404).json({ error: 'E-book not found' });
        }
        res.json({ ebook });
    });
});

// Upload e-book (Admin only)
router.post('/', authenticateToken, requireAdmin, upload.single('file'), [
    body('title').notEmpty().withMessage('Title is required')
], (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        // Delete uploaded file if validation fails
        if (req.file) {
            fs.unlinkSync(req.file.path);
        }
        return res.status(400).json({ errors: errors.array() });
    }

    if (!req.file) {
        return res.status(400).json({ error: 'PDF file is required' });
    }

    const { title, category } = req.body;
    const filePath = req.file.filename;
    const db = getDb();

    const query = `
      INSERT INTO ebooks (title, file_path, category)
      VALUES (?, ?, ?)
    `;

    db.run(query, [title, filePath, category || null], function (err) {
        if (err) {
            console.error('Error uploading e-book:', err);
            // Delete uploaded file if database insert fails
            if (req.file) {
                fs.unlinkSync(req.file.path);
            }
            return res.status(500).json({ error: 'Internal server error' });
        }
        res.status(201).json({
            message: 'E-book uploaded successfully',
            ebookId: this.lastID
        });
    });
});

// Stream e-book file
router.get('/:id/read', authenticateToken, (req, res) => {
    const { id } = req.params;
    const db = getDb();

    db.get('SELECT * FROM ebooks WHERE id = ?', [id], (err, ebook) => {
        if (err) {
            console.error('Error reading e-book:', err);
            return res.status(500).json({ error: 'Internal server error' });
        }
        if (!ebook) {
            return res.status(404).json({ error: 'E-book not found' });
        }

        const filePath = path.join(__dirname, '..', '..', 'uploads', 'ebooks', ebook.file_path);

        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ error: 'E-book file not found' });
        }

        // Log the read access
        const logQuery = `
          INSERT INTO ebook_read_logs (user_id, user_type, ebook_id)
          VALUES (?, ?, ?)
        `;
        db.run(logQuery, [req.user.id, req.user.userType, id], (err) => {
            if (err) console.error('Error logging e-book read:', err);
        });

        // Stream the PDF file
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `inline; filename="${ebook.title}.pdf"`);

        const fileStream = fs.createReadStream(filePath);
        fileStream.pipe(res);
    });
});

// Delete e-book (Admin only)
router.delete('/:id', authenticateToken, requireAdmin, (req, res) => {
    const { id } = req.params;
    const db = getDb();

    db.get('SELECT * FROM ebooks WHERE id = ?', [id], (err, ebook) => {
        if (err) {
            console.error('Error finding e-book for deletion:', err);
            return res.status(500).json({ error: 'Internal server error' });
        }
        if (!ebook) {
            return res.status(404).json({ error: 'E-book not found' });
        }

        // Delete file from filesystem
        const filePath = path.join(__dirname, '..', '..', 'uploads', 'ebooks', ebook.file_path);
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }

        // Delete from database
        db.run('DELETE FROM ebooks WHERE id = ?', [id], (err) => {
            if (err) {
                console.error('Error deleting e-book record:', err);
                return res.status(500).json({ error: 'Internal server error' });
            }
            res.json({ message: 'E-book deleted successfully' });
        });
    });
});

// Get e-book read logs (Admin only)
router.get('/logs/all', authenticateToken, requireAdmin, (req, res) => {
    const db = getDb();

    const query = `
      SELECT erl.*, e.title as ebook_title
      FROM ebook_read_logs erl
      JOIN ebooks e ON erl.ebook_id = e.id
      ORDER BY erl.timestamp DESC
      LIMIT 100
    `;

    db.all(query, [], (err, logs) => {
        if (err) {
            console.error('Error fetching e-book read logs:', err);
            return res.status(500).json({ error: 'Internal server error' });
        }
        res.json({ logs: logs || [] });
    });
});

export default router;
