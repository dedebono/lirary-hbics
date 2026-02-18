import React, { useState, useEffect } from 'react';
import { BarChart3, Users, BookOpen, TrendingUp, Calendar } from 'lucide-react';
import api from '../../utils/api';
import { formatDate } from '../../utils/dateUtils';

const Reports = () => {
    const [stats, setStats] = useState({
        totalBooks: 0,
        totalUsers: 0,
        activeBorrows: 0,
        overdueBooks: 0,
        todayAttendance: 0
    });
    const [recentBorrows, setRecentBorrows] = useState([]);
    const [overdueBooks, setOverdueBooks] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchReports();
    }, []);

    const fetchReports = async () => {
        try {
            const [booksRes, usersRes, borrowsRes, overdueRes, attendanceRes] = await Promise.all([
                api.get('/books'),
                api.get('/users'),
                api.get('/borrow/logs'), // Fetch ALL logs (active and returned)
                api.get('/borrow/overdue'),
                api.get('/attendance/logs')
            ]);

            const allUsers = usersRes.data.users || [];
            const allBorrows = borrowsRes.data.logs || [];
            const todayLogs = (attendanceRes.data.logs || []).filter(log => {
                const logDate = new Date(log.timestamp).toDateString();
                const today = new Date().toDateString();
                return logDate === today;
            });

            // Calculate active borrows from all logs
            const activeBorrowsCount = allBorrows.filter(log => log.status === 'Borrowed').length;

            setStats({
                totalBooks: booksRes.data.books?.length || 0,
                totalUsers: allUsers.length,
                activeBorrows: activeBorrowsCount,
                overdueBooks: overdueRes.data.overdueBooks?.length || 0,
                todayAttendance: todayLogs.length
            });

            setRecentBorrows(allBorrows.slice(0, 50)); // Show more history (50 items)
            setOverdueBooks(overdueRes.data.overdueBooks || []);
        } catch (error) {
            console.error('Error fetching reports:', error);
        } finally {
            setLoading(false);
        }
    };

    const StatCard = ({ icon: Icon, title, value, color, subtitle }) => (
        <div className="card">
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-gray-600 text-sm font-medium">{title}</p>
                    <p className="text-3xl font-bold text-gray-800 mt-2">{value}</p>
                    {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
                </div>
                <div className={`p-4 rounded-full ${color}`}>
                    <Icon className="w-8 h-8 text-white" />
                </div>
            </div>
        </div>
    );

    return (
        <div className="p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Reports & Analytics</h2>

            {loading ? (
                <div className="flex justify-center py-12">
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
                            title="Total Users"
                            value={stats.totalUsers}
                            color="bg-green-500"
                        />
                        <StatCard
                            icon={TrendingUp}
                            title="Active Borrows"
                            value={stats.activeBorrows}
                            color="bg-purple-500"
                        />
                        <StatCard
                            icon={Calendar}
                            title="Today's Attendance"
                            value={stats.todayAttendance}
                            color="bg-orange-500"
                        />
                    </div>

                    {/* Overdue Books Alert */}
                    {stats.overdueBooks > 0 && (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                            <h3 className="text-red-800 font-semibold mb-2">⚠️ Overdue Books Alert</h3>
                            <p className="text-red-700">There are {stats.overdueBooks} overdue books that need attention.</p>
                        </div>
                    )}

                    {/* Borrowing History */}
                    <div className="card mb-6">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-xl font-bold text-gray-800">Borrowing History</h3>
                            <span className="text-sm text-gray-500">Last 50 Transactions</span>
                        </div>
                        {recentBorrows.length === 0 ? (
                            <p className="text-gray-600 text-center py-4">No borrowing history found.</p>
                        ) : (
                            <div className="overflow-x-auto max-h-[500px]">
                                <table className="min-w-full divide-y divide-gray-200 relative">
                                    <thead className="bg-gray-50 sticky top-0 shadow-sm">
                                        <tr>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Book</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Borrow Date</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Return Date</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {recentBorrows.map((borrow) => (
                                            <tr key={borrow.id} className="hover:bg-gray-50">
                                                <td className="px-4 py-3">
                                                    <div className="text-sm font-medium text-gray-900">{borrow.book_name}</div>
                                                    <div className="text-xs text-gray-500">{borrow.book_barcode}</div>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="text-sm text-gray-900">{borrow.user_name}</div>
                                                    <div className="text-xs text-gray-500 capitalize">{borrow.user_type}</div>
                                                </td>
                                                <td className="px-4 py-3 text-sm text-gray-600">
                                                    {formatDate(borrow.borrow_date)}
                                                </td>
                                                <td className="px-4 py-3 text-sm text-gray-600">
                                                    {borrow.return_date ? formatDate(borrow.return_date) : (
                                                        <span className="text-gray-400 italic">Expected: {formatDate(borrow.due_date)}</span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 text-sm">
                                                    <span className={`px-2 py-1 text-xs rounded-full font-medium ${borrow.status === 'Borrowed'
                                                        ? 'bg-blue-100 text-blue-800'
                                                        : 'bg-green-100 text-green-800'
                                                        }`}>
                                                        {borrow.status}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>

                    {/* Overdue Books List */}
                    {overdueBooks.length > 0 && (
                        <div className="card">
                            <h3 className="text-xl font-bold text-gray-800 mb-4">Overdue Books</h3>
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Book</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Due Date</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Days Overdue</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {overdueBooks.map((book) => (
                                            <tr key={book.id}>
                                                <td className="px-4 py-3 text-sm text-gray-900">{book.book_name}</td>
                                                <td className="px-4 py-3 text-sm text-gray-600">{book.user_name}</td>
                                                <td className="px-4 py-3 text-sm text-gray-600">
                                                    {formatDate(book.due_date)}
                                                </td>
                                                <td className="px-4 py-3 text-sm">
                                                    <span className="px-2 py-1 text-xs rounded-full bg-red-100 text-red-800">
                                                        {book.days_overdue} days
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default Reports;
