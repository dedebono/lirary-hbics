import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { LogOut, BookOpen, Book, Clock } from 'lucide-react';
import api from '../utils/api';
import { formatDate } from '../utils/dateUtils';
import DigitalClock from '../components/DigitalClock';
import { getImageUrl } from '../utils/imageUrl';

const TeacherDashboard = () => {
    const { user, logout } = useAuth();
    const [myLoans, setMyLoans] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchMyLoans();
    }, []);

    const fetchMyLoans = async () => {
        try {
            const response = await api.get('/borrow/my-loans');
            setMyLoans(response.data.loans || []);
        } catch (error) {
            console.error('Error fetching loans:', error);
        } finally {
            setLoading(false);
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
                                <p className="text-sm text-gray-600">Teacher Dashboard</p>
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


                {/* Info Card */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
                    <h3 className="text-lg font-semibold text-blue-800 mb-2">
                        Welcome, {user?.name}!
                    </h3>
                    <p className="text-blue-700">
                        You can browse and borrow books from the library. Use the API endpoints to search for books and manage your loans.
                    </p>
                </div>

                {/* My Borrowed Books — Thumbnail Grid */}
                <div className="card mb-8">
                    <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                        <Book className="w-6 h-6" />
                        My Borrowed Books
                        {myLoans.length > 0 && (
                            <span className="ml-2 text-sm font-normal text-gray-500">({myLoans.length})</span>
                        )}
                    </h2>
                    {loading ? (
                        <div className="flex items-center justify-center h-32">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
                        </div>
                    ) : myLoans.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                            <Book className="w-16 h-16 mb-3 opacity-30" />
                            <p className="text-gray-500">No books currently borrowed</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                            {myLoans.map((loan) => {
                                const coverUrl = getImageUrl(loan.book_cover);
                                const isOverdue = loan.due_date && new Date(loan.due_date) < new Date();
                                return (
                                    <div key={loan.id} className="flex flex-col rounded-xl border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow bg-white group">
                                        {/* Cover Image */}
                                        <div className="relative w-full aspect-[3/4] bg-gray-100 flex items-center justify-center overflow-hidden">
                                            {coverUrl ? (
                                                <img
                                                    src={coverUrl}
                                                    alt={loan.book_name}
                                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                                    onError={(e) => {
                                                        e.target.style.display = 'none';
                                                        e.target.nextSibling.style.display = 'flex';
                                                    }}
                                                />
                                            ) : null}
                                            <div
                                                className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-primary-100 to-primary-200"
                                                style={{ display: coverUrl ? 'none' : 'flex' }}
                                            >
                                                <Book className="w-10 h-10 text-primary-400" />
                                            </div>
                                            {isOverdue && (
                                                <span className="absolute top-2 right-2 bg-red-500 text-white text-xs font-bold px-1.5 py-0.5 rounded">
                                                    Overdue
                                                </span>
                                            )}
                                        </div>
                                        {/* Info */}
                                        <div className="p-3 flex flex-col gap-1 flex-1">
                                            <h3 className="font-semibold text-gray-800 text-sm leading-tight line-clamp-2">{loan.book_name}</h3>
                                            <p className="text-xs text-gray-500 truncate">by {loan.author || '—'}</p>
                                            <p className="text-xs text-gray-400 truncate font-mono">{loan.book_barcode}</p>
                                            <div className={`flex items-center gap-1 mt-auto pt-2 text-xs font-medium ${isOverdue ? 'text-red-500' : 'text-gray-500'}`}>
                                                <Clock className="w-3 h-3 flex-shrink-0" />
                                                <span className="truncate">Due: {formatDate(loan.due_date)}</span>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

            </div>
            <DigitalClock />
        </div>
    );
};

export default TeacherDashboard;
