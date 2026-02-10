import express from 'express';
import multer from 'multer';
import { parse } from 'csv-parse/sync';
import bcrypt from 'bcryptjs';
import { authenticateToken } from '../middleware/auth.middleware.js';
import { requireAdmin } from '../middleware/role.middleware.js';
import { dbRun } from '../database/db.js';

const router = express.Router();

// Configure multer for CSV file upload
const storage = multer.memoryStorage();
const upload = multer({
    storage: storage,
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
            cb(null, true);
        } else {
            cb(new Error('Only CSV files are allowed'));
        }
    }
});

// Import students from CSV
router.post('/import-students', authenticateToken, requireAdmin, upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        // Parse CSV
        const csvContent = req.file.buffer.toString('utf-8');
        const records = parse(csvContent, {
            columns: true,
            skip_empty_lines: true,
            trim: true
        });

        console.log('Parsed CSV records:', records.length);

        const results = {
            success: [],
            errors: []
        };

        // Default password for imported students
        const defaultPassword = 'student123';
        const passwordHash = await bcrypt.hash(defaultPassword, 10);

        // Process each record
        for (let i = 0; i < records.length; i++) {
            const record = records[i];
            const rowNumber = i + 2; // +2 because row 1 is header and arrays are 0-indexed

            try {
                // Validate required fields
                if (!record.barcode || !record.name || !record.class) {
                    results.errors.push({
                        row: rowNumber,
                        barcode: record.barcode || 'N/A',
                        error: 'Missing required fields (barcode, name, or class)'
                    });
                    continue;
                }

                // Insert student
                await dbRun(
                    'INSERT INTO students (name, class, barcode, password_hash) VALUES (?, ?, ?, ?)',
                    [record.name.trim(), record.class.trim(), record.barcode.trim(), passwordHash]
                );

                results.success.push({
                    row: rowNumber,
                    barcode: record.barcode,
                    name: record.name
                });

            } catch (error) {
                results.errors.push({
                    row: rowNumber,
                    barcode: record.barcode || 'N/A',
                    error: error.message.includes('UNIQUE') ? 'Barcode already exists' : error.message
                });
            }
        }

        res.json({
            message: 'Import completed',
            total: records.length,
            imported: results.success.length,
            failed: results.errors.length,
            results: results
        });

    } catch (error) {
        console.error('Import error:', error);
        res.status(500).json({ error: error.message || 'Import failed' });
    }
});

// Import teachers from CSV
router.post('/import-teachers', authenticateToken, requireAdmin, upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const csvContent = req.file.buffer.toString('utf-8');
        const records = parse(csvContent, {
            columns: true,
            skip_empty_lines: true,
            trim: true
        });

        const results = {
            success: [],
            errors: []
        };

        const defaultPassword = 'teacher123';
        const passwordHash = await bcrypt.hash(defaultPassword, 10);

        for (let i = 0; i < records.length; i++) {
            const record = records[i];
            const rowNumber = i + 2;

            try {
                if (!record.barcode || !record.name) {
                    results.errors.push({
                        row: rowNumber,
                        barcode: record.barcode || 'N/A',
                        error: 'Missing required fields (barcode or name)'
                    });
                    continue;
                }

                await dbRun(
                    'INSERT INTO teachers (name, barcode, password_hash) VALUES (?, ?, ?)',
                    [record.name.trim(), record.barcode.trim(), passwordHash]
                );

                results.success.push({
                    row: rowNumber,
                    barcode: record.barcode,
                    name: record.name
                });

            } catch (error) {
                results.errors.push({
                    row: rowNumber,
                    barcode: record.barcode || 'N/A',
                    error: error.message.includes('UNIQUE') ? 'Barcode already exists' : error.message
                });
            }
        }

        res.json({
            message: 'Import completed',
            total: records.length,
            imported: results.success.length,
            failed: results.errors.length,
            results: results
        });

    } catch (error) {
        console.error('Import error:', error);
        res.status(500).json({ error: error.message || 'Import failed' });
    }
});

// Import books from CSV
router.post('/import-books', authenticateToken, requireAdmin, upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const csvContent = req.file.buffer.toString('utf-8');
        const records = parse(csvContent, {
            columns: true,
            skip_empty_lines: true,
            trim: true
        });

        const results = {
            success: [],
            errors: []
        };

        for (let i = 0; i < records.length; i++) {
            const record = records[i];
            const rowNumber = i + 2;

            try {
                if (!record.book_barcode || !record.book_name || !record.quantity) {
                    results.errors.push({
                        row: rowNumber,
                        barcode: record.book_barcode || 'N/A',
                        error: 'Missing required fields (book_barcode, book_name, or quantity)'
                    });
                    continue;
                }

                const quantity = parseInt(record.quantity, 10);
                if (isNaN(quantity) || quantity < 0) {
                    results.errors.push({
                        row: rowNumber,
                        barcode: record.book_barcode,
                        error: 'Quantity must be a valid non-negative number'
                    });
                    continue;
                }

                const status = quantity > 0 ? 'Available' : 'Unavailable';

                await dbRun(
                    `INSERT INTO books (book_barcode, book_name, year, author, publisher, quantity, borrowed_count, status, available_qty, book_isbn)
                     VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?, ?)`,
                    [
                        record.book_barcode.trim(),
                        record.book_name.trim(),
                        record.year || null,
                        record.author || null,
                        record.publisher || null,
                        quantity,
                        status,
                        quantity,
                        record.book_isbn || null
                    ]
                );

                results.success.push({
                    row: rowNumber,
                    barcode: record.book_barcode,
                    name: record.book_name
                });

            } catch (error) {
                results.errors.push({
                    row: rowNumber,
                    barcode: record.book_barcode || 'N/A',
                    error: error.message.includes('UNIQUE') ? 'Barcode already exists' : error.message
                });
            }
        }

        res.json({
            message: 'Import completed',
            total: records.length,
            imported: results.success.length,
            failed: results.errors.length,
            results: results
        });

    } catch (error) {
        console.error('Import error:', error);
        res.status(500).json({ error: error.message || 'Import failed' });
    }
});

export default router;
