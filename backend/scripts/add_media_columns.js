import sqlite3 from 'sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const dbPath = join(__dirname, '..', 'database.sqlite');
const db = new sqlite3.Database(dbPath);

console.log('🗄️  Migrating database: Adding media columns...');

const run = (sql) => {
    return new Promise((resolve, reject) => {
        db.run(sql, function (err) {
            if (err) {
                // Ignore error if column already exists (simplistic check)
                if (err.message.includes('duplicate column')) {
                    resolve({ skipped: true });
                } else {
                    reject(err);
                }
            }
            else resolve({ changes: this.changes });
        });
    });
};

(async () => {
    try {
        // Add book_cover to books
        try {
            await run(`ALTER TABLE books ADD COLUMN book_cover TEXT`);
            console.log('✅ Added book_cover column to books table');
        } catch (err) {
            console.log('ℹ️  Skipped adding book_cover (might already exist)');
        }

        // Add photo to students
        try {
            await run(`ALTER TABLE students ADD COLUMN photo TEXT`);
            console.log('✅ Added photo column to students table');
        } catch (err) {
            console.log('ℹ️  Skipped adding photo to students (might already exist)');
        }

        // Add photo to teachers
        try {
            await run(`ALTER TABLE teachers ADD COLUMN photo TEXT`);
            console.log('✅ Added photo column to teachers table');
        } catch (err) {
            console.log('ℹ️  Skipped adding photo to teachers (might already exist)');
        }

        console.log('\n🎉 Migration completed successfully!');
        db.close();
        process.exit(0);
    } catch (error) {
        console.error('❌ Error during migration:', error);
        db.close();
        process.exit(1);
    }
})();
