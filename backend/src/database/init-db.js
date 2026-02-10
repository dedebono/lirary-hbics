import sqlite3 from 'sqlite3';
import bcrypt from 'bcryptjs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const dbPath = join(__dirname, '..', '..', 'database.sqlite');
const db = new sqlite3.Database(dbPath);

console.log('🗄️  Initializing database for Multi-School Support (Primary & Secondary)...');

// Enable foreign keys
db.run('PRAGMA foreign_keys = ON');

// Helper to run queries with promises
const run = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
};

// Drop existing tables (for fresh initialization)
const dropTables = async () => {
  console.log('Dropping existing tables...');
  await run(`DROP TABLE IF EXISTS ebook_read_logs`);
  await run(`DROP TABLE IF EXISTS borrow_logs`);
  await run(`DROP TABLE IF EXISTS attendance_logs`);
  await run(`DROP TABLE IF EXISTS ebooks`);
  await run(`DROP TABLE IF EXISTS books`);
  await run(`DROP TABLE IF EXISTS teachers`);
  await run(`DROP TABLE IF EXISTS students`);
  await run(`DROP TABLE IF EXISTS users`);
};

// Create tables
const createTables = async () => {
  console.log('Creating tables with school_level support...');

  // Users table (Admin/Librarian)
  // Added school_level column
  await run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('Admin', 'Librarian')),
      school_level TEXT NOT NULL CHECK(school_level IN ('Primary', 'Secondary')),
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Students table
  // Added school_level column
  await run(`
    CREATE TABLE IF NOT EXISTS students (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      class TEXT NOT NULL,
      school_level TEXT NOT NULL CHECK(school_level IN ('Primary', 'Secondary')),
      barcode TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      photo TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Teachers table
  // Added school_level column
  await run(`
    CREATE TABLE IF NOT EXISTS teachers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      school_level TEXT NOT NULL CHECK(school_level IN ('Primary', 'Secondary')),
      barcode TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      photo TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Books table
  // Added school_level column
  await run(`
    CREATE TABLE IF NOT EXISTS books (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      book_barcode TEXT UNIQUE NOT NULL,
      book_name TEXT NOT NULL,
      school_level TEXT NOT NULL CHECK(school_level IN ('Primary', 'Secondary')),
      year INTEGER,
      author TEXT,
      publisher TEXT,
      quantity INTEGER DEFAULT 0,
      borrowed_count INTEGER DEFAULT 0,
      status TEXT DEFAULT 'Available' CHECK(status IN ('Available', 'Unavailable')),
      available_qty INTEGER DEFAULT 0,
      book_isbn TEXT,
      book_cover TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // E-books table (Shared or School specific? Typically shared or can be specific. Let's make it specific for consistency if needed, but for now assuming shared unless specified.
  // User said: "HBICS primary had their own books... HBICS Secondary had their own books..."
  // Ebooks? Assuming shared for now as they are files. Or add school_level later.
  // I will add school_level to be safe, defaulting to 'Primary' or making it optional for now?
  // Let's keep Ebooks simple for now (User didn't explicitly mention separate Ebooks, just Books).
  // I'll leave Ebooks as is for now.
  await run(`
    CREATE TABLE IF NOT EXISTS ebooks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      file_path TEXT NOT NULL,
      category TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Attendance logs table
  // No change needed to schema, but user filtering will need to join with users/students tables.
  await run(`
    CREATE TABLE IF NOT EXISTS attendance_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      user_type TEXT NOT NULL CHECK(user_type IN ('student', 'teacher')),
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      type TEXT NOT NULL CHECK(type IN ('In', 'Out'))
    )
  `);

  // Borrow logs table
  // Same, filtered by book ownership or user ownership.
  await run(`
    CREATE TABLE IF NOT EXISTS borrow_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      user_type TEXT NOT NULL CHECK(user_type IN ('student', 'teacher')),
      book_id INTEGER NOT NULL,
      borrow_date DATETIME DEFAULT CURRENT_TIMESTAMP,
      return_date DATETIME,
      due_date DATETIME,
      status TEXT DEFAULT 'Borrowed' CHECK(status IN ('Borrowed', 'Returned', 'Overdue')),
      FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
    )
  `);

  // E-book read logs table
  await run(`
    CREATE TABLE IF NOT EXISTS ebook_read_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      user_type TEXT NOT NULL CHECK(user_type IN ('student', 'teacher')),
      ebook_id INTEGER NOT NULL,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (ebook_id) REFERENCES ebooks(id) ON DELETE CASCADE
    )
  `);

  console.log('✅ Tables created successfully');
};

// Create indexes for better performance
const createIndexes = async () => {
  console.log('Creating indexes...');

  await run(`CREATE INDEX IF NOT EXISTS idx_books_barcode ON books(book_barcode)`);
  await run(`CREATE INDEX IF NOT EXISTS idx_books_school ON books(school_level)`);
  await run(`CREATE INDEX IF NOT EXISTS idx_students_barcode ON students(barcode)`);
  await run(`CREATE INDEX IF NOT EXISTS idx_students_school ON students(school_level)`);
  await run(`CREATE INDEX IF NOT EXISTS idx_teachers_barcode ON teachers(barcode)`);
  await run(`CREATE INDEX IF NOT EXISTS idx_teachers_school ON teachers(school_level)`);
  await run(`CREATE INDEX IF NOT EXISTS idx_users_username ON users(username)`);

  console.log('✅ Indexes created successfully');
};

// Seed initial data
const seedData = async () => {
  console.log('Seeding initial data...');

  const adminPassword = await bcrypt.hash(process.env.DEFAULT_ADMIN_PASSWORD || 'admin123', 10);
  const studentPassword = await bcrypt.hash('student123', 10);
  const teacherPassword = await bcrypt.hash('teacher123', 10);

  // 1. Create Primary Admin
  await run(
    `INSERT INTO users (name, role, school_level, username, password_hash) VALUES (?, ?, ?, ?, ?)`,
    ['HBICS Primary Admin', 'Admin', 'Primary', 'admin_primary', adminPassword]
  );
  console.log('✅ Primary Admin created (username: admin_primary, password: admin123)');

  // 2. Create Secondary Admin
  await run(
    `INSERT INTO users (name, role, school_level, username, password_hash) VALUES (?, ?, ?, ?, ?)`,
    ['HBICS Secondary Admin', 'Admin', 'Secondary', 'admin_secondary', adminPassword]
  );
  console.log('✅ Secondary Admin created (username: admin_secondary, password: admin123)');

  // 3. Create Sample Students (Primary & Secondary)
  await run(`INSERT INTO students (name, class, school_level, barcode, password_hash) VALUES (?, ?, ?, ?, ?)`,
    ['Primary Student 1', 'P1-A', 'Primary', 'STU_P1', studentPassword]);

  await run(`INSERT INTO students (name, class, school_level, barcode, password_hash) VALUES (?, ?, ?, ?, ?)`,
    ['Secondary Student 1', 'S1-A', 'Secondary', 'STU_S1', studentPassword]);

  console.log('✅ Sample students created');

  // 4. Create Sample Teachers (Primary & Secondary)
  await run(`INSERT INTO teachers (name, school_level, barcode, password_hash) VALUES (?, ?, ?, ?)`,
    ['Primary Teacher', 'Primary', 'TCH_P1', teacherPassword]);

  await run(`INSERT INTO teachers (name, school_level, barcode, password_hash) VALUES (?, ?, ?, ?)`,
    ['Secondary Teacher', 'Secondary', 'TCH_S1', teacherPassword]);

  console.log('✅ Sample teachers created');

  // 5. Create Sample Books (Primary & Secondary)
  const primaryBooks = [
    ['BK_P001', 'Primary Science Vol 1', 'Primary', 2023, 'Author A', 'Pub A', 5, '978-P-1'],
    ['BK_P002', 'Fun with Math', 'Primary', 2022, 'Author B', 'Pub B', 5, '978-P-2'],
  ];

  const secondaryBooks = [
    ['BK_S001', 'Advanced Physics', 'Secondary', 2023, 'Author X', 'Pub X', 5, '978-S-1'],
    ['BK_S002', 'World History', 'Secondary', 2022, 'Author Y', 'Pub Y', 5, '978-S-2'],
  ];

  for (const book of primaryBooks) {
    await run(
      `INSERT INTO books (book_barcode, book_name, school_level, year, author, publisher, quantity, borrowed_count, status, available_qty, book_isbn) 
       VALUES (?, ?, ?, ?, ?, ?, ?, 0, 'Available', ?, ?)`,
      [book[0], book[1], book[2], book[3], book[4], book[5], book[6], book[6], book[7]]
    );
  }

  for (const book of secondaryBooks) {
    await run(
      `INSERT INTO books (book_barcode, book_name, school_level, year, author, publisher, quantity, borrowed_count, status, available_qty, book_isbn) 
       VALUES (?, ?, ?, ?, ?, ?, ?, 0, 'Available', ?, ?)`,
      [book[0], book[1], book[2], book[3], book[4], book[5], book[6], book[6], book[7]]
    );
  }

  console.log('✅ Sample books created');

  console.log('✅ Database seeded successfully');
};

// Main initialization
(async () => {
  try {
    await dropTables();
    await createTables();
    await createIndexes();
    await seedData();

    console.log('\n🎉 Database initialization completed successfully!');
    console.log('\n📝 New Credentials:');
    console.log('   Primary Admin:   username=admin_primary,   password=admin123');
    console.log('   Secondary Admin: username=admin_secondary, password=admin123');
    console.log('   Students: STU_P1 (Primary), STU_S1 (Secondary), password=student123');

    db.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error initializing database:', error);
    db.close();
    process.exit(1);
  }
})();
