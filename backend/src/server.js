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

app.use(cors({
    origin: corsOrigins,
    credentials: true
}));
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

// Root API route
app.get('/api', (req, res) => {
    res.json({ status: 'ok' });
});

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', message: 'Library Management System API is running' });
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

// Start server
app.listen(PORT, () => {
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
