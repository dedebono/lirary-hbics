import axios from 'axios';

const BASE_URL = 'http://localhost:5000/api';

// Test results tracking
const results = [];

async function test(name, fn) {
    try {
        console.log(`\n🧪 Testing: ${name}...`);
        await fn();
        console.log(`✅ PASSED: ${name}`);
        results.push({ name, passed: true });
    } catch (error) {
        console.log(`❌ FAILED: ${name}`);
        console.log(`   Error: ${error.message}`);
        if (error.response) {
            console.log(`   Status: ${error.response.status}`);
            console.log(`   Data:`, error.response.data);
        }
        results.push({ name, passed: false, error: error.message });
    }
}

let adminToken, studentToken, teacherToken, createdBookId;

async function runTests() {
    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║          LIBRARY API COMPREHENSIVE TEST SUITE              ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');

    // Test 1: Admin Login
    await test('Admin Login', async () => {
        const res = await axios.post(`${BASE_URL}/auth/login`, {
            username: 'admin',
            password: 'admin123',
            userType: 'admin'
        });
        if (!res.data.token) throw new Error('No token received');
        adminToken = res.data.token;
        console.log(`   Admin: ${res.data.user.name}`);
    });

    // Test 2: Create Student
    await test('Create Student', async () => {
        const barcode = `STU${Date.now()}`;
        const res = await axios.post(`${BASE_URL}/auth/register`, {
            name: 'Test Student',
            userType: 'student',
            password: 'student123',
            barcode,
            className: 'Grade 12A'
        }, {
            headers: { Authorization: `Bearer ${adminToken}` }
        });
        console.log(`   Student ID: ${res.data.userId}, Barcode: ${barcode}`);

        // Login as student
        const loginRes = await axios.post(`${BASE_URL}/auth/login`, {
            username: barcode,
            password: 'student123',
            userType: 'student'
        });
        studentToken = loginRes.data.token;
    });

    // Test 3: Create Teacher
    await test('Create Teacher', async () => {
        const barcode = `TCH${Date.now()}`;
        const res = await axios.post(`${BASE_URL}/auth/register`, {
            name: 'Test Teacher',
            userType: 'teacher',
            password: 'teacher123',
            barcode
        }, {
            headers: { Authorization: `Bearer ${adminToken}` }
        });
        console.log(`   Teacher ID: ${res.data.userId}, Barcode: ${barcode}`);

        // Login as teacher
        const loginRes = await axios.post(`${BASE_URL}/auth/login`, {
            username: barcode,
            password: 'teacher123',
            userType: 'teacher'
        });
        teacherToken = loginRes.data.token;
    });

    // Test 4: Create Admin/Librarian
    await test('Create Librarian', async () => {
        const username = `librarian${Date.now()}`;
        const res = await axios.post(`${BASE_URL}/auth/register`, {
            name: 'Test Librarian',
            userType: 'admin',
            password: 'librarian123',
            username,
            role: 'Librarian'
        }, {
            headers: { Authorization: `Bearer ${adminToken}` }
        });
        console.log(`   Librarian ID: ${res.data.userId}, Username: ${username}`);
    });

    // Test 5: User Validation
    await test('User Validation (Missing Password)', async () => {
        try {
            await axios.post(`${BASE_URL}/auth/register`, {
                name: 'Invalid User',
                userType: 'student'
            }, {
                headers: { Authorization: `Bearer ${adminToken}` }
            });
            throw new Error('Should have failed validation');
        } catch (error) {
            if (error.response && error.response.status === 400) {
                console.log('   Correctly rejected invalid data');
                return;
            }
            throw error;
        }
    });

    // Test 6: Create Book
    await test('Create Book', async () => {
        const barcode = `BK${Date.now()}`;
        const res = await axios.post(`${BASE_URL}/books`, {
            book_barcode: barcode,
            book_name: 'Test Programming Book',
            year: 2024,
            author: 'Test Author',
            publisher: 'Test Publisher',
            quantity: 10,
            book_isbn: '978-0-123456-78-0'
        }, {
            headers: { Authorization: `Bearer ${adminToken}` }
        });
        createdBookId = res.data.bookId;
        console.log(`   Book ID: ${createdBookId}, Barcode: ${barcode}`);
    });

    // Test 7: Get Books
    await test('Get All Books', async () => {
        const res = await axios.get(`${BASE_URL}/books`, {
            headers: { Authorization: `Bearer ${adminToken}` }
        });
        console.log(`   Retrieved ${res.data.books.length} books`);
    });

    // Test 8: Update Book
    await test('Update Book', async () => {
        const res = await axios.put(`${BASE_URL}/books/${createdBookId}`, {
            quantity: 15,
            author: 'Updated Author'
        }, {
            headers: { Authorization: `Bearer ${adminToken}` }
        });
        console.log(`   Book updated successfully`);
    });

    // Test 9: Book Validation
    await test('Book Validation (Missing Fields)', async () => {
        try {
            await axios.post(`${BASE_URL}/books`, {
                book_name: 'Invalid Book'
            }, {
                headers: { Authorization: `Bearer ${adminToken}` }
            });
            throw new Error('Should have failed validation');
        } catch (error) {
            if (error.response && error.response.status === 400) {
                console.log('   Correctly rejected invalid data');
                return;
            }
            throw error;
        }
    });

    // Test 10: Student Check-in
    await test('Student Check-in', async () => {
        const res = await axios.post(`${BASE_URL}/attendance/checkin`, {}, {
            headers: { Authorization: `Bearer ${studentToken}` }
        });
        console.log(`   Check-in Log ID: ${res.data.logId}`);
    });

    // Test 11: Student Check-out
    await test('Student Check-out', async () => {
        const res = await axios.post(`${BASE_URL}/attendance/checkout`, {}, {
            headers: { Authorization: `Bearer ${studentToken}` }
        });
        console.log(`   Check-out Log ID: ${res.data.logId}`);
    });

    // Test 12: Teacher Check-in
    await test('Teacher Check-in', async () => {
        const res = await axios.post(`${BASE_URL}/attendance/checkin`, {}, {
            headers: { Authorization: `Bearer ${teacherToken}` }
        });
        console.log(`   Check-in Log ID: ${res.data.logId}`);
    });

    // Test 13: Attendance Status
    await test('Get Attendance Status', async () => {
        const res = await axios.get(`${BASE_URL}/attendance/status`, {
            headers: { Authorization: `Bearer ${teacherToken}` }
        });
        console.log(`   Is checked in: ${res.data.isCheckedIn}`);
    });

    // Test 14: Get Attendance Logs (Admin)
    await test('Get All Attendance Logs (Admin)', async () => {
        const res = await axios.get(`${BASE_URL}/attendance/logs`, {
            headers: { Authorization: `Bearer ${adminToken}` }
        });
        console.log(`   Retrieved ${res.data.logs.length} attendance logs`);
    });

    // Test 15: Duplicate Barcode
    await test('Duplicate Barcode Handling', async () => {
        try {
            await axios.post(`${BASE_URL}/auth/register`, {
                name: 'Duplicate Student',
                userType: 'student',
                password: 'test123',
                barcode: 'STU001', // Existing from seed data
                className: 'Grade 10A'
            }, {
                headers: { Authorization: `Bearer ${adminToken}` }
            });
            throw new Error('Should have rejected duplicate barcode');
        } catch (error) {
            if (error.response && error.response.status === 400) {
                console.log('   Correctly rejected duplicate barcode');
                return;
            }
            throw error;
        }
    });

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('TEST SUMMARY');
    console.log('='.repeat(60));

    const passed = results.filter(r => r.passed).length;
    const failed = results.filter(r => !r.passed).length;

    console.log(`Total Tests: ${results.length}`);
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`Success Rate: ${((passed / results.length) * 100).toFixed(1)}%`);

    if (failed > 0) {
        console.log('\nFailed Tests:');
        results.filter(r => !r.passed).forEach(r => {
            console.log(`  - ${r.name}: ${r.error}`);
        });
    }

    if (failed === 0) {
        console.log('\n🎉 ALL TESTS PASSED! 🎉\n');
    } else {
        console.log('\n⚠️  SOME TESTS FAILED ⚠️\n');
    }
}

runTests().catch(error => {
    console.error('Fatal error:', error.message);
    process.exit(1);
});
