/**
 * create-superadmin.js
 * ---------------------
 * One-time script to create a SuperAdmin account (SUPERMAN) in the database.
 * 
 * Usage:
 *   node scripts/create-superadmin.js
 *
 * This script:
 *  1. Disables SQLite CHECK constraint enforcement temporarily
 *  2. Inserts the SuperAdmin user
 *  3. Re-enables constraint enforcement
 */

import sqlite3 from 'sqlite3';
import bcrypt from 'bcryptjs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const dbPath = join(__dirname, '..', 'database.sqlite');
const db = new sqlite3.Database(dbPath);

const run = (sql, params = []) =>
    new Promise((resolve, reject) => {
        db.run(sql, params, function (err) {
            if (err) reject(err);
            else resolve({ lastID: this.lastID, changes: this.changes });
        });
    });

const get = (sql, params = []) =>
    new Promise((resolve, reject) => {
        db.get(sql, params, (err, row) => {
            if (err) reject(err);
            else resolve(row);
        });
    });

(async () => {
    try {
        console.log('🦸 Creating SuperAdmin account...\n');

        const username = 'SUPERMAN';
        const password = 'hbics99G';
        const name = 'Super Administrator';
        const role = 'SuperAdmin';
        const school_level = 'Primary'; // SuperAdmin spans all schools but needs a value

        // Check if already exists
        const existing = await get('SELECT id FROM users WHERE username = ?', [username]);
        if (existing) {
            console.log(`⚠️  User "${username}" already exists (id: ${existing.id}).`);
            console.log('   Updating password instead...');
            const newHash = await bcrypt.hash(password, 10);
            await run('UPDATE users SET password_hash = ?, role = ? WHERE username = ?', [newHash, role, username]);
            console.log(`✅ Password reset for "${username}" with role "${role}".`);
            db.close();
            return;
        }

        const passwordHash = await bcrypt.hash(password, 10);

        // Disable CHECK constraints temporarily (SQLite does not enforce them strictly
        // on direct inserts when writable_schema is used, but the simpler approach
        // is to use PRAGMA ignore_check_constraints which was added in SQLite 3.41.0).
        // For broader compatibility, we recreate the users table with SuperAdmin allowed.

        console.log('🔧 Updating users table to support SuperAdmin role...');

        // Step 1: Rename existing table
        await run('ALTER TABLE users RENAME TO users_old');

        // Step 2: Create new table with updated CHECK constraint
        await run(`
      CREATE TABLE users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        role TEXT NOT NULL CHECK(role IN ('Admin', 'Librarian', 'SuperAdmin')),
        school_level TEXT NOT NULL CHECK(school_level IN ('Primary', 'Secondary')),
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

        // Step 3: Copy existing data
        await run(`
      INSERT INTO users (id, name, role, school_level, username, password_hash, created_at)
      SELECT id, name, role, school_level, username, password_hash, created_at FROM users_old
    `);

        // Step 4: Drop old table
        await run('DROP TABLE users_old');

        // Step 5: Recreate index
        await run('CREATE INDEX IF NOT EXISTS idx_users_username ON users(username)');

        console.log('✅ Table schema updated.\n');

        // Insert SuperAdmin
        const result = await run(
            'INSERT INTO users (name, role, school_level, username, password_hash) VALUES (?, ?, ?, ?, ?)',
            [name, role, school_level, username, passwordHash]
        );

        console.log('🎉 SuperAdmin created successfully!');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log(`   Name     : ${name}`);
        console.log(`   Username : ${username}`);
        console.log(`   Password : ${password}`);
        console.log(`   Role     : ${role}`);
        console.log(`   ID       : ${result.lastID}`);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('\n✅ You can now log in with this account to reset other admin passwords.');

        db.close();
        process.exit(0);
    } catch (error) {
        console.error('❌ Error creating SuperAdmin:', error);
        db.close();
        process.exit(1);
    }
})();
