import React, { useState, useEffect } from 'react';
import { Search, RotateCcw, Filter, AlertCircle, CheckCircle, BookOpen, Calendar, Scan, User } from 'lucide-react';
import api from '../../utils/api';

const BorrowLogs = () => {
    const [borrowLogs, setBorrowLogs] = useState([]);
    const [filteredLogs, setFilteredLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [successMessage, setSuccessMessage] = useState('');

    // Fetch active borrow logs
    useEffect(() => {
        fetchLogs();
    }, []);

    const fetchLogs = async () => {
        setLoading(true);
        try {
            const res = await api.get('/borrow/logs', { params: { status: 'Borrowed' } });
            setBorrowLogs(res.data.logs || []);
            setFilteredLogs(res.data.logs || []);
            setError(null);
        } catch (err) {
            console.error('Error fetching borrow logs:', err);
            setError('Failed to fetch borrowed books.');
        } finally {
            setLoading(false);
        }
    };

    // Filter logs based on search term (Book Name/Barcode, User Name/Barcode/Type)
    useEffect(() => {
        if (!searchTerm.trim()) {
            setFilteredLogs(borrowLogs);
            return;
        }

        const lowerTerm = searchTerm.toLowerCase();
        const filtered = borrowLogs.filter(log => {
            // Check book details
            if (log.book_name?.toLowerCase().includes(lowerTerm)) return true;
            if (log.book_barcode?.toLowerCase().includes(lowerTerm)) return true;

            // Check user details
            if (log.user_name?.toLowerCase().includes(lowerTerm)) return true;
            if (log.user_barcode?.toLowerCase().includes(lowerTerm)) return true;

            return false;
        });
        setFilteredLogs(filtered);
    }, [searchTerm, borrowLogs]);

    const handleReturnBook = async (borrowId, bookName) => {
        if (!window.confirm(`Are you sure you want to return "${bookName}"?`)) return;

        try {
            await api.post(`/borrow/${borrowId}/return`);
            setSuccessMessage(`Returned "${bookName}"`);

            // Remove from list locally for instant feedback
            // This is better than fetching again for UX speed
            const newLogs = borrowLogs.filter(log => log.id !== borrowId);
            setBorrowLogs(newLogs);
            // Also update filtered list if search is active
            // Actually, filteredLogs effect depends on borrowLogs, so it might update?
            // But let's be safe and force update the filtered state too to prevent flicker
            // or just let the effect run.
            // Since borrowLogs state update triggers effect, let it handle it.

            setTimeout(() => setSuccessMessage(''), 3000);
        } catch (err) {
            console.error(err);
            alert('Failed to return book. Please try again.');
        }
    };

    const getDaysOverdue = (dueDate) => {
        const today = new Date();
        const due = new Date(dueDate);
        const diffTime = today - due;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays > 0 ? diffDays : 0;
    };

    return (
        <div className="p-6 space-y-6"> {/* Added p-6 padding wrapper */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                        <BookOpen className="w-8 h-8 text-primary-600" />
                        Borrowed Books Report
                    </h1>
                    <p className="text-gray-500 mt-1 text-sm">Manage active loans and returns</p>
                </div>
                <div className="bg-white px-4 py-2 rounded-lg shadow-sm border border-gray-200 text-sm">
                    <span className="text-gray-500 mr-2">Total Active:</span>
                    <span className="font-bold text-primary-600 text-lg">{borrowLogs.length}</span>
                </div>
            </div>

            {/* Search Bar */}
            <div className="card shadow-md border-0 bg-gradient-to-r from-primary-50 to-white">
                <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <Search className="h-5 w-5 text-primary-400" />
                    </div>
                    <input
                        type="text"
                        placeholder="Scan Book/User Barcode or Search by Name..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="block w-full pl-12 pr-4 py-4 border-2 border-transparent bg-white rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:border-primary-300 focus:ring-0 shadow-sm transition-all hover:shadow-md text-lg"
                        autoFocus
                    />
                </div>
                <div className="mt-3 flex gap-4 text-xs text-gray-500 px-2">
                    <span className="flex items-center gap-1"><Scan className="w-3 h-3" /> Supports Barcode Scanner</span>
                    <span className="flex items-center gap-1"><User className="w-3 h-3" /> Search by Name</span>
                </div>
            </div>

            {successMessage && (
                <div className="bg-green-50 text-green-700 p-4 rounded-xl flex items-center gap-3 border border-green-200 shadow-sm animate-fade-in">
                    <div className="bg-green-100 p-1 rounded-full"><CheckCircle className="w-5 h-5" /></div>
                    <span className="font-medium">{successMessage}</span>
                </div>
            )}

            {error && (
                <div className="bg-red-50 text-red-700 p-4 rounded-xl flex items-center gap-3 border border-red-200 shadow-sm">
                    <AlertCircle className="w-5 h-5" />
                    {error}
                </div>
            )}

            {/* Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                {loading ? (
                    <div className="flex flex-col items-center justify-center p-12 space-y-4">
                        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600"></div>
                        <p className="text-gray-500 animate-pulse">Loading borrowed books...</p>
                    </div>
                ) : filteredLogs.length === 0 ? (
                    <div className="text-center py-16 px-4">
                        <div className="bg-gray-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                            <BookOpen className="w-10 h-10 text-gray-300" />
                        </div>
                        <h3 className="text-lg font-medium text-gray-900 mb-1">No borrowed books found</h3>
                        <p className="text-gray-500 max-w-sm mx-auto">
                            {searchTerm ? `No matches for "${searchTerm}"` : 'There are currently no active loans in the system.'}
                        </p>
                        {searchTerm && (
                            <button
                                onClick={() => setSearchTerm('')}
                                className="mt-4 text-primary-600 hover:text-primary-700 font-medium"
                            >
                                Clear Search
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50/50">
                                <tr>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Book Details</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Borrower</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Due Date</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                                    <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-100">
                                {filteredLogs.map((log) => {
                                    const daysOverdue = getDaysOverdue(log.due_date);
                                    const isOverdue = daysOverdue > 0;

                                    return (
                                        <tr key={log.id} className="hover:bg-gray-50/80 transition-colors group">
                                            <td className="px-6 py-4">
                                                <div className="flex items-start gap-3">
                                                    <div className="p-2 bg-blue-50 text-blue-600 rounded-lg shrink-0">
                                                        <BookOpen className="w-5 h-5" />
                                                    </div>
                                                    <div>
                                                        <div className="text-sm font-bold text-gray-900 line-clamp-1 group-hover:text-primary-600 transition-colors">{log.book_name}</div>
                                                        <div className="text-xs text-gray-500 font-mono mt-0.5 bg-gray-100 inline-block px-1.5 rounded border border-gray-200">{log.book_barcode}</div>
                                                        <div className="text-xs text-gray-400 mt-0.5 italic">{log.author}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 text-xs font-bold uppercase border border-gray-200">
                                                        {log.user_name.substring(0, 2)}
                                                    </div>
                                                    <div>
                                                        <div className="text-sm font-medium text-gray-900">{log.user_name}</div>
                                                        <div className="text-xs text-gray-500 capitalize flex items-center gap-1">
                                                            {log.user_type}
                                                            {log.class && <span className="bg-gray-100 px-1 rounded text-gray-600">• {log.class}</span>}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-sm">
                                                <div className="flex flex-col gap-1">
                                                    <div className={`flex items-center gap-1.5 font-medium ${isOverdue ? 'text-red-600' : 'text-gray-700'}`}>
                                                        <Calendar className="w-3.5 h-3.5" />
                                                        {new Date(log.due_date).toLocaleDateString()}
                                                    </div>
                                                    <div className="text-xs text-gray-400">
                                                        Borrowed: {new Date(log.borrow_date).toLocaleDateString()}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                {isOverdue ? (
                                                    <span className="px-2.5 py-1 inline-flex text-xs font-medium rounded-full bg-red-100 text-red-800 border border-red-200 shadow-sm whitespace-nowrap">
                                                        Overdue ({daysOverdue}d)
                                                    </span>
                                                ) : (
                                                    <span className="px-2.5 py-1 inline-flex text-xs font-medium rounded-full bg-green-100 text-green-800 border border-green-200 shadow-sm whitespace-nowrap">
                                                        Active Loan
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <button
                                                    onClick={() => handleReturnBook(log.id, log.book_name)}
                                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition-colors shadow-sm hover:shadow focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-primary-500"
                                                    title="Return this book"
                                                >
                                                    <RotateCcw className="w-4 h-4" />
                                                    Return
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

export default BorrowLogs;
