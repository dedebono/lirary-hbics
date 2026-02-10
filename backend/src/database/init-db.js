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

console.log('🗄️  Initializing database...');

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
  console.log('Creating tables...');

  // Users table (Admin/Librarian)
  await run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('Admin', 'Librarian')),
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Students table
  await run(`
    CREATE TABLE IF NOT EXISTS students (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      class TEXT NOT NULL,
      barcode TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Teachers table
  await run(`
    CREATE TABLE IF NOT EXISTS teachers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      barcode TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Books table
  await run(`
    CREATE TABLE IF NOT EXISTS books (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      book_barcode TEXT UNIQUE NOT NULL,
      book_name TEXT NOT NULL,
      year INTEGER,
      author TEXT,
      publisher TEXT,
      quantity INTEGER DEFAULT 0,
      borrowed_count INTEGER DEFAULT 0,
      status TEXT DEFAULT 'Available' CHECK(status IN ('Available', 'Unavailable')),
      available_qty INTEGER DEFAULT 0,
      book_isbn TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // E-books table
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
  await run(`CREATE INDEX IF NOT EXISTS idx_books_isbn ON books(book_isbn)`);
  await run(`CREATE INDEX IF NOT EXISTS idx_students_barcode ON students(barcode)`);
  await run(`CREATE INDEX IF NOT EXISTS idx_teachers_barcode ON teachers(barcode)`);
  await run(`CREATE INDEX IF NOT EXISTS idx_borrow_logs_status ON borrow_logs(status)`);
  await run(`CREATE INDEX IF NOT EXISTS idx_attendance_logs_user ON attendance_logs(user_id, user_type)`);

  console.log('✅ Indexes created successfully');
};

// Seed initial data
const seedData = async () => {
  console.log('Seeding initial data...');

  // Create default admin user
  const adminPassword = await bcrypt.hash(process.env.DEFAULT_ADMIN_PASSWORD || 'admin123', 10);
  await run(
    `INSERT INTO users (name, role, username, password_hash) VALUES (?, ?, ?, ?)`,
    ['Administrator', 'Admin', process.env.DEFAULT_ADMIN_USERNAME || 'admin', adminPassword]
  );
  console.log('✅ Default admin created (username: admin, password: admin123)');

  // Create sample students
  const studentPassword = await bcrypt.hash('student123', 10);
  await run(`INSERT INTO students (name, class, barcode, password_hash) VALUES (?, ?, ?, ?)`,
    ['John Doe', 'Grade 10A', 'STU001', studentPassword]);
  await run(`INSERT INTO students (name, class, barcode, password_hash) VALUES (?, ?, ?, ?)`,
    ['Jane Smith', 'Grade 10B', 'STU002', studentPassword]);
  await run(`INSERT INTO students (name, class, barcode, password_hash) VALUES (?, ?, ?, ?)`,
    ['Mike Johnson', 'Grade 11A', 'STU003', studentPassword]);
  console.log('✅ Sample students created (password: student123)');

  // Create sample teachers
  const teacherPassword = await bcrypt.hash('teacher123', 10);
  await run(`INSERT INTO teachers (name, barcode, password_hash) VALUES (?, ?, ?)`,
    ['Dr. Sarah Williams', 'TCH001', teacherPassword]);
  await run(`INSERT INTO teachers (name, barcode, password_hash) VALUES (?, ?, ?)`,
    ['Prof. Robert Brown', 'TCH002', teacherPassword]);
  console.log('✅ Sample teachers created (password: teacher123)');

  // Create sample books
  const books = [
    ['BK001', 'Introduction to Programming', 2023, 'John Smith', 'Tech Publishers', 5, 0, 'Available', 5, '978-0-123456-78-9'],
    ['BK002', 'Data Structures and Algorithms', 2022, 'Jane Doe', 'CS Press', 3, 0, 'Available', 3, '978-0-234567-89-0'],
    ['BK003', 'Web Development Fundamentals', 2024, 'Mike Wilson', 'Web Books Inc', 4, 0, 'Available', 4, '978-0-345678-90-1'],
    ['BK004', 'Database Systems', 2023, 'Sarah Johnson', 'Data Publishers', 2, 0, 'Available', 2, '978-0-456789-01-2'],
    ['BK005', 'Machine Learning Basics', 2024, 'Robert Lee', 'AI Press', 3, 0, 'Available', 3, '978-0-567890-12-3'],
  ];

  for (const book of books) {
    await run(
      `INSERT INTO books (book_barcode, book_name, year, author, publisher, quantity, borrowed_count, status, available_qty, book_isbn) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      book
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
    console.log('\n📝 Default Credentials:');
    console.log('   Admin: username=admin, password=admin123');
    console.log('   Students: barcode=STU001/STU002/STU003, password=student123');
    console.log('   Teachers: barcode=TCH001/TCH002, password=teacher123');

    db.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error initializing database:', error);
    db.close();
    process.exit(1);
  }
})();
