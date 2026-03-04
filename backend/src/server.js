import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.routes.js';
import booksRoutes from './routes/books.routes.js';
import usersRoutes from './routes/users.routes.js';
import attendanceRoutes from './routes/attendance.routes.js';
import borrowRoutes from './routes/borrow.routes.js';
import ebooksRoutes from './routes/ebooks.routes.js';
import importRoutes from './routes/import.routes.js';
import getDb from './database/db.js';

import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
// CORS Configuration - supports multiple origins from environment variable
const corsOrigins = process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(',').map(origin => origin.trim())
    : ['http://localhost:3000'];

console.log('🔒 CORS enabled for origins:', corsOrigins);

const corsOptions = {
    origin: (origin, callback) => {
        // Allow requests with no origin (e.g. mobile apps, curl, Postman)
        if (!origin) return callback(null, true);
        // Allow any *.ytcb.org subdomain as a safety net
        if (origin.endsWith('.ytcb.org') || corsOrigins.includes(origin)) {
            return callback(null, true);
        }
        callback(new Error(`CORS: origin '${origin}' not allowed`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Authorization', 'Content-Type', 'Accept'],
};

// Diagnostic: log every request so we can see if OPTIONS reaches Node.js
app.use((req, res, next) => {
    if (req.method === 'OPTIONS') {
        console.log(`✈️  Preflight OPTIONS received from origin: ${req.headers.origin} → ${req.path}`);
    }
    next();
});

// Hard-inject CORS headers as a safety net for Cloudflare Tunnel edge interception
app.use((req, res, next) => {
    const origin = req.headers.origin;
    if (origin && (origin.endsWith('.ytcb.org') || corsOrigins.includes(origin))) {
        res.setHeader('Access-Control-Allow-Origin', origin);
        res.setHeader('Access-Control-Allow-Credentials', 'true');
        res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,PATCH,OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Authorization,Content-Type,Accept');
    }
    if (req.method === 'OPTIONS') {
        return res.sendStatus(204);
    }
    next();
});

// Explicitly handle preflight OPTIONS for all routes (required for Cloudflare Tunnel)
app.options('*', cors(corsOptions));
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/books', booksRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/borrow', borrowRoutes);
app.use('/api/ebooks', ebooksRoutes);
app.use('/api/import', importRoutes);

// Root routes (with and without /api prefix)
app.get('/', (req, res) => {
    res.json({ status: 'ok' });
});

app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        uptime: `${Math.floor(process.uptime())}s`,
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development',
        node: process.version,
    });
});

app.get('/api', (req, res) => {
    res.json({ status: 'ok' });
});

// Health check
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        message: 'Library Management System API is running',
        uptime: `${Math.floor(process.uptime())}s`,
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development',
        node: process.version,
    });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Error:', err);

    if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ error: 'File size too large' });
        }
        return res.status(400).json({ error: err.message });
    }

    res.status(err.status || 500).json({
        error: err.message || 'Internal server error'
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Route not found' });
});

// Migrate ebooks table: add school_level + allowed_classes if not present
const runEbookMigrations = () => {
    const db = getDb();
    db.run(`ALTER TABLE ebooks ADD COLUMN school_level TEXT`, (err) => {
        if (err && !err.message.includes('duplicate column')) {
            console.error('Migration error (school_level):', err.message);
        } else if (!err) {
            console.log('✅ ebooks.school_level column added');
        }
    });
    db.run(`ALTER TABLE ebooks ADD COLUMN allowed_classes TEXT`, (err) => {
        if (err && !err.message.includes('duplicate column')) {
            console.error('Migration error (allowed_classes):', err.message);
        } else if (!err) {
            console.log('✅ ebooks.allowed_classes column added');
        }
    });
    db.run(`ALTER TABLE ebooks ADD COLUMN thumbnail_path TEXT`, (err) => {
        if (err && !err.message.includes('duplicate column')) {
            console.error('Migration error (thumbnail_path):', err.message);
        } else if (!err) {
            console.log('✅ ebooks.thumbnail_path column added');
        }
    });
};

// Start server
app.listen(PORT, () => {
    runEbookMigrations();
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`📚 Library Management System API`);
    console.log(`\n📝 Available endpoints:`);
    console.log(`   - POST /api/auth/login`);
    console.log(`   - GET  /api/auth/me`);
    console.log(`   - POST /api/auth/register`);
    console.log(`   - GET  /api/books`);
    console.log(`   - GET  /api/users`);
    console.log(`   - POST /api/attendance/checkin`);
    console.log(`   - POST /api/attendance/checkout`);
    console.log(`   - POST /api/borrow`);
    console.log(`   - GET  /api/ebooks`);
    console.log(`\n✅ Server ready!`);
});

export default app;

