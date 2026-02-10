import axios from 'axios';

const BASE_URL = 'http://localhost:5000/api';
let adminToken = '';
let studentToken = '';
let teacherToken = '';
let createdBookId = null;

// Color codes for console output
const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[36m',
    bold: '\x1b[1m'
};

function log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSuccess(message) {
    log(`✅ ${message}`, 'green');
}

function logError(message) {
    log(`❌ ${message}`, 'red');
}

function logInfo(message) {
    log(`ℹ️  ${message}`, 'blue');
}

function logSection(message) {
    log(`\n${'='.repeat(60)}`, 'bold');
    log(`${message}`, 'bold');
    log(`${'='.repeat(60)}`, 'bold');
}

// Helper function to handle API calls
async function apiCall(method, endpoint, data = null, token = null) {
    try {
        const config = {
            method,
            url: `${BASE_URL}${endpoint}`,
            headers: token ? { Authorization: `Bearer ${token}` } : {}
        };

        if (data) {
            config.data = data;
        }

        const response = await axios(config);
        return { success: true, data: response.data };
    } catch (error) {
        return {
            success: false,
            error: error.response?.data || error.message,
            status: error.response?.status
        };
    }
}

// Test 1: Login as admin
async function testAdminLogin() {
    logSection('TEST 1: Admin Login');

    const result = await apiCall('POST', '/auth/login', {
        username: 'admin',
        password: 'admin123',
        userType: 'admin'
    });

    if (result.success && result.data.token) {
        adminToken = result.data.token;
        logSuccess('Admin login successful');
        logInfo(`Admin user: ${result.data.user.name} (${result.data.user.role})`);
        return true;
    } else {
        logError('Admin login failed');
        console.log(result.error);
        return false;
    }
}

// Test 2: Create Student User
async function testCreateStudent() {
    logSection('TEST 2: Create Student User');

    const studentData = {
        name: 'Test Student',
        userType: 'student',
        password: 'student123',
        barcode: `STU${Date.now()}`,
        className: 'Grade 12A'
    };

    const result = await apiCall('POST', '/auth/register', studentData, adminToken);

    if (result.success) {
        logSuccess('Student created successfully');
        logInfo(`Student ID: ${result.data.userId}`);
        logInfo(`Barcode: ${studentData.barcode}`);

        // Try to login with the new student
        const loginResult = await apiCall('POST', '/auth/login', {
            username: studentData.barcode,
            password: studentData.password,
            userType: 'student'
        });

        if (loginResult.success && loginResult.data.token) {
            studentToken = loginResult.data.token;
            logSuccess('Student login successful');
            return true;
        } else {
            logError('Student login failed after creation');
            return false;
        }
    } else {
        logError('Student creation failed');
        console.log(result.error);
        return false;
    }
}

// Test 3: Create Teacher User
async function testCreateTeacher() {
    logSection('TEST 3: Create Teacher User');

    const teacherData = {
        name: 'Test Teacher',
        userType: 'teacher',
        password: 'teacher123',
        barcode: `TCH${Date.now()}`
    };

    const result = await apiCall('POST', '/auth/register', teacherData, adminToken);

    if (result.success) {
        logSuccess('Teacher created successfully');
        logInfo(`Teacher ID: ${result.data.userId}`);
        logInfo(`Barcode: ${teacherData.barcode}`);

        // Try to login with the new teacher
        const loginResult = await apiCall('POST', '/auth/login', {
            username: teacherData.barcode,
            password: teacherData.password,
            userType: 'teacher'
        });

        if (loginResult.success && loginResult.data.token) {
            teacherToken = loginResult.data.token;
            logSuccess('Teacher login successful');
            return true;
        } else {
            logError('Teacher login failed after creation');
            return false;
        }
    } else {
        logError('Teacher creation failed');
        console.log(result.error);
        return false;
    }
}

// Test 4: Create Admin User
async function testCreateAdmin() {
    logSection('TEST 4: Create Admin User');

    const adminData = {
        name: 'Test Librarian',
        userType: 'admin',
        password: 'librarian123',
        username: `librarian${Date.now()}`,
        role: 'Librarian'
    };

    const result = await apiCall('POST', '/auth/register', adminData, adminToken);

    if (result.success) {
        logSuccess('Librarian created successfully');
        logInfo(`Librarian ID: ${result.data.userId}`);
        logInfo(`Username: ${adminData.username}`);
        return true;
    } else {
        logError('Librarian creation failed');
        console.log(result.error);
        return false;
    }
}

// Test 5: Test validation errors for user creation
async function testUserValidation() {
    logSection('TEST 5: User Creation Validation');

    // Test missing required fields
    const result = await apiCall('POST', '/auth/register', {
        name: 'Invalid User',
        userType: 'student'
        // Missing password
    }, adminToken);

    if (!result.success && result.status === 400) {
        logSuccess('Validation correctly rejected missing password');
        return true;
    } else {
        logError('Validation should have rejected missing password');
        return false;
    }
}

// Test 6: Create Book
async function testCreateBook() {
    logSection('TEST 6: Create Book Inventory');

    const bookData = {
        book_barcode: `BK${Date.now()}`,
        book_name: 'Test Programming Book',
        year: 2024,
        author: 'Test Author',
        publisher: 'Test Publisher',
        quantity: 10,
        book_isbn: '978-0-123456-78-0'
    };

    const result = await apiCall('POST', '/books', bookData, adminToken);

    if (result.success) {
        createdBookId = result.data.bookId;
        logSuccess('Book created successfully');
        logInfo(`Book ID: ${result.data.bookId}`);
        logInfo(`Barcode: ${bookData.book_barcode}`);
        return true;
    } else {
        logError('Book creation failed');
        console.log(result.error);
        return false;
    }
}

// Test 7: Get all books
async function testGetBooks() {
    logSection('TEST 7: Retrieve Books Inventory');

    const result = await apiCall('GET', '/books', null, adminToken);

    if (result.success && result.data.books) {
        logSuccess(`Retrieved ${result.data.books.length} books`);
        logInfo(`Sample book: ${result.data.books[0]?.book_name || 'N/A'}`);
        return true;
    } else {
        logError('Failed to retrieve books');
        console.log(result.error);
        return false;
    }
}

// Test 8: Update book
async function testUpdateBook() {
    logSection('TEST 8: Update Book Inventory');

    if (!createdBookId) {
        logError('No book ID available for update test');
        return false;
    }

    const updateData = {
        quantity: 15,
        author: 'Updated Author'
    };

    const result = await apiCall('PUT', `/books/${createdBookId}`, updateData, adminToken);

    if (result.success) {
        logSuccess('Book updated successfully');
        return true;
    } else {
        logError('Book update failed');
        console.log(result.error);
        return false;
    }
}

// Test 9: Test book validation
async function testBookValidation() {
    logSection('TEST 9: Book Creation Validation');

    // Test missing required fields
    const result = await apiCall('POST', '/books', {
        book_name: 'Invalid Book'
        // Missing book_barcode and quantity
    }, adminToken);

    if (!result.success && result.status === 400) {
        logSuccess('Validation correctly rejected missing required fields');
        return true;
    } else {
        logError('Validation should have rejected missing fields');
        return false;
    }
}

// Test 10: Student Check-in
async function testStudentCheckin() {
    logSection('TEST 10: Student Check-in');

    const result = await apiCall('POST', '/attendance/checkin', {}, studentToken);

    if (result.success) {
        logSuccess('Student checked in successfully');
        logInfo(`Log ID: ${result.data.logId}`);
        return true;
    } else {
        logError('Student check-in failed');
        console.log(result.error);
        return false;
    }
}

// Test 11: Student Check-out
async function testStudentCheckout() {
    logSection('TEST 11: Student Check-out');

    const result = await apiCall('POST', '/attendance/checkout', {}, studentToken);

    if (result.success) {
        logSuccess('Student checked out successfully');
        logInfo(`Log ID: ${result.data.logId}`);
        return true;
    } else {
        logError('Student check-out failed');
        console.log(result.error);
        return false;
    }
}

// Test 12: Teacher Check-in
async function testTeacherCheckin() {
    logSection('TEST 12: Teacher Check-in');

    const result = await apiCall('POST', '/attendance/checkin', {}, teacherToken);

    if (result.success) {
        logSuccess('Teacher checked in successfully');
        logInfo(`Log ID: ${result.data.logId}`);
        return true;
    } else {
        logError('Teacher check-in failed');
        console.log(result.error);
        return false;
    }
}

// Test 13: Get attendance status
async function testAttendanceStatus() {
    logSection('TEST 13: Get Attendance Status');

    const result = await apiCall('GET', '/attendance/status', null, teacherToken);

    if (result.success) {
        logSuccess('Retrieved attendance status');
        logInfo(`Is checked in: ${result.data.isCheckedIn}`);
        return true;
    } else {
        logError('Failed to get attendance status');
        console.log(result.error);
        return false;
    }
}

// Test 14: Admin get all attendance logs
async function testGetAttendanceLogs() {
    logSection('TEST 14: Admin Get All Attendance Logs');

    const result = await apiCall('GET', '/attendance/logs', null, adminToken);

    if (result.success && result.data.logs) {
        logSuccess(`Retrieved ${result.data.logs.length} attendance logs`);
        return true;
    } else {
        logError('Failed to retrieve attendance logs');
        console.log(result.error);
        return false;
    }
}

// Test 15: Duplicate barcode handling
async function testDuplicateBarcode() {
    logSection('TEST 15: Duplicate Barcode Handling');

    const result = await apiCall('POST', '/auth/register', {
        name: 'Duplicate Student',
        userType: 'student',
        password: 'test123',
        barcode: 'STU001', // This already exists from seed data
        className: 'Grade 10A'
    }, adminToken);

    if (!result.success && result.status === 400) {
        logSuccess('Correctly rejected duplicate barcode');
        return true;
    } else {
        logError('Should have rejected duplicate barcode');
        return false;
    }
}

// Main test runner
async function runAllTests() {
    log('\n╔════════════════════════════════════════════════════════════╗', 'bold');
    log('║          LIBRARY API COMPREHENSIVE TEST SUITE              ║', 'bold');
    log('╚════════════════════════════════════════════════════════════╝', 'bold');

    const tests = [
        { name: 'Admin Login', fn: testAdminLogin },
        { name: 'Create Student', fn: testCreateStudent },
        { name: 'Create Teacher', fn: testCreateTeacher },
        { name: 'Create Admin/Librarian', fn: testCreateAdmin },
        { name: 'User Validation', fn: testUserValidation },
        { name: 'Create Book', fn: testCreateBook },
        { name: 'Get Books', fn: testGetBooks },
        { name: 'Update Book', fn: testUpdateBook },
        { name: 'Book Validation', fn: testBookValidation },
        { name: 'Student Check-in', fn: testStudentCheckin },
        { name: 'Student Check-out', fn: testStudentCheckout },
        { name: 'Teacher Check-in', fn: testTeacherCheckin },
        { name: 'Attendance Status', fn: testAttendanceStatus },
        { name: 'Get Attendance Logs', fn: testGetAttendanceLogs },
        { name: 'Duplicate Barcode', fn: testDuplicateBarcode }
    ];

    const results = {
        passed: 0,
        failed: 0,
        total: tests.length
    };

    for (const test of tests) {
        try {
            const passed = await test.fn();
            if (passed) {
                results.passed++;
            } else {
                results.failed++;
            }
        } catch (error) {
            logError(`Test "${test.name}" threw an error: ${error.message}`);
            results.failed++;
        }

        // Small delay between tests
        await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Summary
    logSection('TEST SUMMARY');
    log(`Total Tests: ${results.total}`, 'bold');
    log(`Passed: ${results.passed}`, 'green');
    log(`Failed: ${results.failed}`, results.failed > 0 ? 'red' : 'green');
    log(`Success Rate: ${((results.passed / results.total) * 100).toFixed(1)}%`,
        results.failed === 0 ? 'green' : 'yellow');

    if (results.failed === 0) {
        log('\n🎉 ALL TESTS PASSED! 🎉\n', 'green');
    } else {
        log('\n⚠️  SOME TESTS FAILED ⚠️\n', 'red');
    }
}

// Run tests
runAllTests().catch(error => {
    logError(`Fatal error: ${error.message}`);
    process.exit(1);
});
