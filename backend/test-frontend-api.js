import axios from 'axios';

const BASE_URL = 'http://localhost:5000/api';

async function testAPIs() {
    console.log('Testing Frontend API Integration...\n');

    try {
        // 1. Login as admin
        console.log('1. Testing Admin Login...');
        const loginRes = await axios.post(`${BASE_URL}/auth/login`, {
            username: 'admin',
            password: 'admin123',
            userType: 'admin'
        });
        const token = loginRes.data.token;
        console.log('✅ Admin login successful\n');

        // 2. Test Users API
        console.log('2. Testing Users API...');
        const usersRes = await axios.get(`${BASE_URL}/users?userType=student`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        console.log(`✅ Users API: Retrieved ${usersRes.data.users.length} students`);
        console.log('Sample user:', usersRes.data.users[0]);
        console.log('');

        // 3. Test Books API
        console.log('3. Testing Books API...');
        const booksRes = await axios.get(`${BASE_URL}/books`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        console.log(`✅ Books API: Retrieved ${booksRes.data.books.length} books`);
        console.log('Sample book:', booksRes.data.books[0]);
        console.log('');

        // 4. Test Attendance Logs API
        console.log('4. Testing Attendance Logs API...');
        const logsRes = await axios.get(`${BASE_URL}/attendance/logs`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        console.log(`✅ Attendance Logs API: Retrieved ${logsRes.data.logs.length} logs`);
        if (logsRes.data.logs.length > 0) {
            console.log('Sample log:', logsRes.data.logs[0]);
            console.log('Log has user_name:', !!logsRes.data.logs[0].user_name);
            console.log('Log has barcode:', !!logsRes.data.logs[0].barcode);
            console.log('Log has action:', !!logsRes.data.logs[0].action);
        }
        console.log('');

        console.log('🎉 All API tests passed!');

    } catch (error) {
        console.error('❌ Test failed:', error.response?.data || error.message);
    }
}

testAPIs();
