import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { body, validationResult } from 'express-validator';
import { PDFDocument } from 'pdf-lib';
import getDb from '../database/db.js';
import { authenticateToken } from '../middleware/auth.middleware.js';
import { requireAdmin } from '../middleware/role.middleware.js';

const execFileAsync = promisify(execFile);

const router = express.Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Compress a PDF file in-place:
 * 1. Try Ghostscript (gs) — best compression, pre-installed on most Linux servers
 * 2. Fall back to pdf-lib — pure Node.js, removes redundancy/metadata
 * Replaces the original file only if the output is smaller.
 */
const compressPdfAsync = async (filePath) => {
    const tmpPath = filePath + '.tmp.pdf';
    let usedGs = false;

    try {
        // Attempt Ghostscript compression (Linux/macOS production servers)
        await execFileAsync('gs', [
            '-sDEVICE=pdfwrite',
            '-dCompatibilityLevel=1.4',
            '-dPDFSETTINGS=/ebook',   // 150 dpi images — good balance
            '-dNOPAUSE', '-dQUIET', '-dBATCH',
            `-sOutputFile=${tmpPath}`,
            filePath,
        ]);
        usedGs = true;
    } catch {
        // gs not available — use pdf-lib (removes metadata/unused objects)
        try {
            const bytes = fs.readFileSync(filePath);
            const pdfDoc = await PDFDocument.load(bytes, { ignoreEncryption: true });
            pdfDoc.setTitle('');
            pdfDoc.setAuthor('');
            pdfDoc.setSubject('');
            pdfDoc.setKeywords([]);
            pdfDoc.setCreator('');
            pdfDoc.setProducer('');
            const compressed = await pdfDoc.save({ useObjectStreams: true, addDefaultPage: false });
            fs.writeFileSync(tmpPath, compressed);
        } catch (pdfLibErr) {
            console.error('[ebook compress] pdf-lib fallback failed:', pdfLibErr.message);
            return; // give up, keep original
        }
    }

    // Only replace if the new file is actually smaller
    try {
        const origSize = fs.statSync(filePath).size;
        const newSize = fs.statSync(tmpPath).size;
        if (newSize < origSize) {
            fs.renameSync(tmpPath, filePath);
            const saved = ((1 - newSize / origSize) * 100).toFixed(1);
            console.log(`[ebook compress] ${path.basename(filePath)}: ${(origSize / 1024).toFixed(0)}KB → ${(newSize / 1024).toFixed(0)}KB (-${saved}%) via ${usedGs ? 'gs' : 'pdf-lib'}`);
        } else {
            fs.unlinkSync(tmpPath);
            console.log(`[ebook compress] No size reduction for ${path.basename(filePath)}, keeping original`);
        }
    } catch (err) {
        console.error('[ebook compress] rename/cleanup error:', err.message);
        if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath);
    }
};

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

// Helper: check if this user's class can access an ebook
// allowed_classes is stored as JSON array string e.g. '["P1-A","P2-B"]', or NULL for all classes
const canAccessEbook = (ebook, userClass) => {
    if (!ebook.allowed_classes) return true; // null = all classes
    try {
        const classes = JSON.parse(ebook.allowed_classes);
        if (!Array.isArray(classes) || classes.length === 0) return true;
        return classes.includes(userClass);
    } catch {
        return true; // malformed JSON — grant access
    }
};

// Get all e-books (filtered by school + class for students)
router.get('/', authenticateToken, (req, res) => {
    const { category, search } = req.query;
    const { school_level, userType, class: userClass } = req.user;
    const db = getDb();

    let query = 'SELECT id, title, category, allowed_classes, created_at FROM ebooks WHERE school_level = ?';
    const params = [school_level];

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

        let result = ebooks || [];

        // Students: further filter by class visibility
        if (userType === 'student' && userClass) {
            result = result.filter(eb => canAccessEbook(eb, userClass));
        }

        res.json({ ebooks: result });
    });
});

// Get e-book by ID (school scoped)
router.get('/:id', authenticateToken, (req, res) => {
    const { id } = req.params;
    const { school_level, userType, class: userClass } = req.user;
    const db = getDb();

    db.get('SELECT id, title, category, allowed_classes, created_at FROM ebooks WHERE id = ? AND school_level = ?', [id, school_level], (err, ebook) => {
        if (err) {
            console.error('Error fetching e-book:', err);
            return res.status(500).json({ error: 'Internal server error' });
        }
        if (!ebook) {
            return res.status(404).json({ error: 'E-book not found' });
        }
        if (userType === 'student' && !canAccessEbook(ebook, userClass)) {
            return res.status(403).json({ error: 'Access denied for your class' });
        }
        res.json({ ebook });
    });
});

// Upload e-book (Admin only)
// Body: title (required), category (optional), allowed_classes (JSON array string or "all")
router.post('/', authenticateToken, requireAdmin, upload.single('file'), [
    body('title').notEmpty().withMessage('Title is required')
], (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        if (req.file) fs.unlinkSync(req.file.path);
        return res.status(400).json({ errors: errors.array() });
    }

    if (!req.file) {
        return res.status(400).json({ error: 'PDF file is required' });
    }

    const { title, category, allowed_classes } = req.body;
    const { school_level } = req.user;
    const filePath = req.file.filename;
    const db = getDb();

    // allowed_classes: "all" or a JSON array string like '["P1-A","P2-B"]'
    // Store NULL for "all classes", otherwise store the JSON string
    let classesValue = null;
    if (allowed_classes && allowed_classes !== 'all') {
        try {
            const parsed = JSON.parse(allowed_classes);
            classesValue = Array.isArray(parsed) && parsed.length > 0 ? JSON.stringify(parsed) : null;
        } catch {
            classesValue = null;
        }
    }

    const query = `INSERT INTO ebooks (title, file_path, category, school_level, allowed_classes) VALUES (?, ?, ?, ?, ?)`;

    db.run(query, [title, filePath, category || null, school_level, classesValue], function (err) {
        if (err) {
            console.error('Error uploading e-book:', err);
            if (req.file) fs.unlinkSync(req.file.path);
            return res.status(500).json({ error: 'Internal server error' });
        }
        // Respond immediately so the admin isn't waiting
        res.status(201).json({
            message: 'E-book uploaded successfully',
            ebookId: this.lastID
        });
        // Compress in the background after responding
        const fullPath = path.join(__dirname, '..', '..', 'uploads', 'ebooks', req.file.filename);
        compressPdfAsync(fullPath).catch(err =>
            console.error('[ebook compress] Unhandled error:', err.message)
        );
    });
});

// Stream e-book file (school + class scoped)
router.get('/:id/read', authenticateToken, (req, res) => {
    const { id } = req.params;
    const { school_level, userType, class: userClass } = req.user;
    const db = getDb();

    db.get('SELECT * FROM ebooks WHERE id = ? AND school_level = ?', [id, school_level], (err, ebook) => {
        if (err) {
            console.error('Error reading e-book:', err);
            return res.status(500).json({ error: 'Internal server error' });
        }
        if (!ebook) {
            return res.status(404).json({ error: 'E-book not found' });
        }
        if (userType === 'student' && !canAccessEbook(ebook, userClass)) {
            return res.status(403).json({ error: 'Access denied for your class' });
        }

        const filePath = path.join(__dirname, '..', '..', 'uploads', 'ebooks', ebook.file_path);

        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ error: 'E-book file not found' });
        }

        // Log the read access
        const logQuery = `INSERT INTO ebook_read_logs (user_id, user_type, ebook_id) VALUES (?, ?, ?)`;
        db.run(logQuery, [req.user.id, req.user.userType, id], (err) => {
            if (err) console.error('Error logging e-book read:', err);
        });

        res.setHeader('Accept-Ranges', 'bytes');
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `inline; filename="${ebook.title}.pdf"`);

        const stat = fs.statSync(filePath);
        const fileSize = stat.size;
        const rangeHeader = req.headers['range'];

        if (rangeHeader) {
            // Parse "bytes=start-end"
            const [, rangeStr] = rangeHeader.match(/bytes=(\d*)-(\d*)/) || [];
            const parts = rangeHeader.replace('bytes=', '').split('-');
            const start = parseInt(parts[0], 10);
            const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

            if (isNaN(start) || start >= fileSize || end >= fileSize) {
                res.status(416).setHeader('Content-Range', `bytes */${fileSize}`);
                return res.end();
            }

            const chunkSize = (end - start) + 1;
            res.status(206);
            res.setHeader('Content-Range', `bytes ${start}-${end}/${fileSize}`);
            res.setHeader('Content-Length', chunkSize);
            const fileStream = fs.createReadStream(filePath, { start, end });
            fileStream.pipe(res);
        } else {
            // Full file (first load / non-range request)
            res.setHeader('Content-Length', fileSize);
            const fileStream = fs.createReadStream(filePath);
            fileStream.pipe(res);
        }
    });
});

// Delete e-book (Admin only, school scoped)
router.delete('/:id', authenticateToken, requireAdmin, (req, res) => {
    const { id } = req.params;
    const { school_level } = req.user;
    const db = getDb();

    db.get('SELECT * FROM ebooks WHERE id = ? AND school_level = ?', [id, school_level], (err, ebook) => {
        if (err) {
            console.error('Error finding e-book for deletion:', err);
            return res.status(500).json({ error: 'Internal server error' });
        }
        if (!ebook) {
            return res.status(404).json({ error: 'E-book not found' });
        }

        const filePath = path.join(__dirname, '..', '..', 'uploads', 'ebooks', ebook.file_path);
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }

        db.run('DELETE FROM ebooks WHERE id = ?', [id], (err) => {
            if (err) {
                console.error('Error deleting e-book record:', err);
                return res.status(500).json({ error: 'Internal server error' });
            }
            res.json({ message: 'E-book deleted successfully' });
        });
    });
});

// Get e-book read logs (Admin only, school scoped)
router.get('/logs/all', authenticateToken, requireAdmin, (req, res) => {
    const { school_level } = req.user;
    const db = getDb();

    const query = `
      SELECT erl.*, e.title as ebook_title
      FROM ebook_read_logs erl
      JOIN ebooks e ON erl.ebook_id = e.id
      WHERE e.school_level = ?
      ORDER BY erl.timestamp DESC
      LIMIT 100
    `;

    db.all(query, [school_level], (err, logs) => {
        if (err) {
            console.error('Error fetching e-book read logs:', err);
            return res.status(500).json({ error: 'Internal server error' });
        }
        res.json({ logs: logs || [] });
    });
});

export default router;
