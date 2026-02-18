import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { LogOut, BookOpen, Book, Clock, CheckCircle, XCircle } from 'lucide-react';
import api from '../utils/api';
import { formatDate } from '../utils/dateUtils';
import DigitalClock from '../components/DigitalClock';

const StudentDashboard = () => {
    const { user, logout } = useAuth();
    const [myLoans, setMyLoans] = useState([]);
    const [attendanceStatus, setAttendanceStatus] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [loansRes, statusRes] = await Promise.all([
                api.get('/borrow/my-loans'),
                api.get('/attendance/status'),
            ]);
            setMyLoans(loansRes.data.loans || []);
            setAttendanceStatus(statusRes.data);
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCheckIn = async () => {
        try {
            await api.post('/attendance/checkin');
            fetchData();
        } catch (error) {
            alert(error.response?.data?.error || 'Check-in failed');
        }
    };

    const handleCheckOut = async () => {
        try {
            await api.post('/attendance/checkout');
            fetchData();
        } catch (error) {
            alert(error.response?.data?.error || 'Check-out failed');
        }
    };

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <div className="bg-white shadow">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <BookOpen className="w-8 h-8 text-primary-600" />
                            <div>
                                <h1 className="text-2xl font-bold text-gray-800">Library Management System</h1>
                                <p className="text-sm text-gray-600">Student Dashboard</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="text-right">
                                <p className="text-sm font-medium text-gray-800">{user?.name}</p>
                                <p className="text-xs text-gray-600">{user?.role}</p>
                            </div>
                            <button
                                onClick={logout}
                                className="btn-secondary flex items-center gap-2"
                            >
                                <LogOut className="w-4 h-4" />
                                Logout
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {loading ? (
                    <div className="flex items-center justify-center h-64">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
                    </div>
                ) : (
                    <>
                        {/* Attendance Card */}
                        <div className="card mb-8">
                            <h2 className="text-xl font-bold text-gray-800 mb-4">Attendance</h2>
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-gray-600">Current Status:</p>
                                    <p className="text-2xl font-bold mt-1">
                                        {attendanceStatus?.isCheckedIn ? (
                                            <span className="text-green-600 flex items-center gap-2">
                                                <CheckCircle className="w-6 h-6" />
                                                Checked In
                                            </span>
                                        ) : (
                                            <span className="text-gray-600 flex items-center gap-2">
                                                <XCircle className="w-6 h-6" />
                                                Not Checked In
                                            </span>
                                        )}
                                    </p>
                                </div>
                                <div>
                                    {attendanceStatus?.isCheckedIn ? (
                                        <button onClick={handleCheckOut} className="btn-danger">
                                            Check Out
                                        </button>
                                    ) : (
                                        <button onClick={handleCheckIn} className="btn-primary">
                                            Check In
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* My Borrowed Books */}
                        <div className="card mb-8">
                            <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                                <Book className="w-6 h-6" />
                                My Borrowed Books
                            </h2>
                            {myLoans.length === 0 ? (
                                <p className="text-gray-600 text-center py-8">No books currently borrowed</p>
                            ) : (
                                <div className="space-y-4">
                                    {myLoans.map((loan) => (
                                        <div key={loan.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <h3 className="font-semibold text-gray-800">{loan.book_name}</h3>
                                                    <p className="text-sm text-gray-600">by {loan.author}</p>
                                                    <p className="text-xs text-gray-500 mt-1">Barcode: {loan.book_barcode}</p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-sm text-gray-600">
                                                        <Clock className="w-4 h-4 inline mr-1" />
                                                        Due: {formatDate(loan.due_date)}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Info Card */}
                        <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                            <h3 className="text-lg font-semibold text-green-800 mb-2">
                                Welcome, {user?.name}!
                            </h3>
                            <p className="text-green-700">
                                Don't forget to check in when you arrive at the library and check out when you leave. You can browse books and access e-books through the system.
                            </p>
                        </div>
                    </>
                )}
            </div>
            <DigitalClock />
        </div>
    );
};

export default StudentDashboard;
