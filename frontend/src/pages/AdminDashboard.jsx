import React, { useState, useEffect } from 'react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LogOut, BookOpen, Users, FileText, TrendingUp, Scan, Home, ClipboardList } from 'lucide-react';
import api from '../utils/api';
import BookManagement from './admin/BookManagement';
import UserManagement from './admin/UserManagement';
import Reports from './admin/Reports';
import AttendanceScanner from '../components/AttendanceScanner';
import AttendanceLogs from './admin/AttendanceLogs';
import BorrowBook from './admin/BorrowBook';
import BorrowLogs from './admin/BorrowLogs';

const AdminDashboard = () => {
    const { user, logout } = useAuth();
    const location = useLocation();
    const [stats, setStats] = useState({
        totalBooks: 0,
        totalStudents: 0,
        totalTeachers: 0,
        activeBorrows: 0,
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchStats();
    }, []);

    const fetchStats = async () => {
        try {
            const [booksRes, usersRes, borrowsRes] = await Promise.all([
                api.get('/books'),
                api.get('/users'),
                api.get('/borrow/logs?status=Borrowed'),
            ]);

            const users = usersRes.data.users || [];
            setStats({
                totalBooks: booksRes.data.books?.length || 0,
                totalStudents: users.filter(u => u.userType === 'student').length,
                totalTeachers: users.filter(u => u.userType === 'teacher').length,
                activeBorrows: borrowsRes.data.logs?.length || 0,
            });
        } catch (error) {
            console.error('Error fetching stats:', error);
        } finally {
            setLoading(false);
        }
    };

    const StatCard = ({ icon: Icon, title, value, color }) => (
        <div className="card">
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-gray-600 text-sm font-medium">{title}</p>
                    <p className="text-3xl font-bold text-gray-800 mt-2">{value}</p>
                </div>
                <div className={`p-4 rounded-full ${color}`}>
                    <Icon className="w-8 h-8 text-white" />
                </div>
            </div>
        </div>
    );

    const NavLink = ({ to, icon: Icon, children }) => {
        const isActive = location.pathname === to || (to !== '/admin' && location.pathname.startsWith(to));
        return (
            <Link
                to={to}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${isActive
                    ? 'bg-primary-100 text-primary-700 font-medium'
                    : 'text-gray-700 hover:bg-gray-100'
                    }`}
            >
                <Icon className="w-5 h-5" />
                {children}
            </Link>
        );
    };

    const DashboardHome = () => (
        <div className="p-6">
            {loading ? (
                <div className="flex items-center justify-center h-64">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
                </div>
            ) : (
                <>
                    {/* Stats Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                        <StatCard
                            icon={BookOpen}
                            title="Total Books"
                            value={stats.totalBooks}
                            color="bg-blue-500"
                        />
                        <StatCard
                            icon={Users}
                            title="Students"
                            value={stats.totalStudents}
                            color="bg-green-500"
                        />
                        <StatCard
                            icon={Users}
                            title="Teachers"
                            value={stats.totalTeachers}
                            color="bg-purple-500"
                        />
                        <StatCard
                            icon={TrendingUp}
                            title="Active Borrows"
                            value={stats.activeBorrows}
                            color="bg-orange-500"
                        />
                    </div>

                    {/* Quick Actions */}
                    <div className="card">
                        <h2 className="text-xl font-bold text-gray-800 mb-4">Quick Actions</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            <Link to="/admin/books" className="btn-primary flex items-center justify-center gap-2">
                                <BookOpen className="w-5 h-5" />
                                Manage Books
                            </Link>
                            <Link to="/admin/users" className="btn-primary flex items-center justify-center gap-2">
                                <Users className="w-5 h-5" />
                                Manage Users
                            </Link>
                            <Link to="/admin/reports" className="btn-primary flex items-center justify-center gap-2">
                                <FileText className="w-5 h-5" />
                                View Reports
                            </Link>
                            <Link to="/admin/scanner" className="btn-primary flex items-center justify-center gap-2">
                                <Scan className="w-5 h-5" />
                                Attendance Scanner
                            </Link>
                        </div>
                    </div>

                    {/* Info Card */}
                    <div className="mt-8 bg-primary-50 border border-primary-200 rounded-lg p-6">
                        <h3 className="text-lg font-semibold text-primary-800 mb-2">
                            🎉 System Ready!
                        </h3>
                        <p className="text-primary-700">
                            The Library Management System is fully operational. You can manage books, users, track borrowing, and monitor attendance.
                        </p>
                    </div>
                </>
            )}
        </div>
    );

    return (
        <div className="h-screen bg-gray-50 flex overflow-hidden">
            {/* Sidebar */}
            <div className="w-64 bg-white shadow-lg flex flex-col h-full border-r border-gray-200 z-10">
                <div className="p-6 border-b shrink-0">
                    <div className="flex items-center gap-3">
                        <BookOpen className="w-8 h-8 text-primary-600" />
                        <div>
                            <h1 className="text-xl font-bold text-gray-800">Library System</h1>
                            <p className="text-xs text-gray-600">Admin Panel</p>
                        </div>
                    </div>
                </div>

                <nav className="p-4 space-y-2 flex-1 overflow-y-auto">
                    <NavLink to="/admin" icon={Home}>Dashboard</NavLink>
                    <NavLink to="/admin/books" icon={BookOpen}>Manage Books</NavLink>
                    <NavLink to="/admin/borrow" icon={BookOpen}>Borrow Book</NavLink>
                    <NavLink to="/admin/users" icon={Users}>Manage Users</NavLink>
                    <NavLink to="/admin/reports" icon={FileText}>Reports</NavLink>
                    <NavLink to="/admin/scanner" icon={Scan}>Attendance Scanner</NavLink>
                    <NavLink to="/admin/borrow-logs" icon={ClipboardList}>Borrow Reports</NavLink>
                    <NavLink to="/admin/attendance-logs" icon={ClipboardList}>Attendance Logs</NavLink>
                </nav>

                <div className="p-4 border-t bg-white shrink-0">
                    <div className="flex items-center justify-between mb-3">
                        <div>
                            <p className="text-sm font-medium text-gray-800">{user?.name}</p>
                            <p className="text-xs text-gray-600">{user?.role}</p>
                        </div>
                    </div>
                    <button
                        onClick={logout}
                        className="btn-secondary w-full flex items-center justify-center gap-2"
                    >
                        <LogOut className="w-4 h-4" />
                        Logout
                    </button>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 h-full overflow-y-auto bg-gray-50 relative">
                <main className="min-h-full">
                    <Routes>
                        <Route path="/" element={<DashboardHome />} />
                        <Route path="/books" element={<BookManagement />} />
                        <Route path="/users" element={<UserManagement />} />
                        <Route path="/borrow" element={<BorrowBook />} />
                        <Route path="/reports" element={<Reports />} />
                        <Route path="/scanner" element={<AttendanceScanner />} />
                        <Route path="/borrow-logs" element={<BorrowLogs />} />
                        <Route path="/attendance-logs" element={<AttendanceLogs />} />
                    </Routes>
                </main>
            </div>
        </div>
    );
};

export default AdminDashboard;
