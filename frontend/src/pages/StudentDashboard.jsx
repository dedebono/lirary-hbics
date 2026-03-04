import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LogOut, BookOpen, Book, Clock, CheckCircle, XCircle, FileText, X } from 'lucide-react';
import api from '../utils/api';
import { formatDate } from '../utils/dateUtils';
import DigitalClock from '../components/DigitalClock';
import { getImageUrl, getBackendUrl } from '../utils/imageUrl';
import PdfReader from '../components/PdfReader';

const StudentDashboard = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [myLoans, setMyLoans] = useState([]);
    const [attendanceStatus, setAttendanceStatus] = useState(null);
    const [ebooks, setEbooks] = useState([]);
    const [ebooksLoading, setEbooksLoading] = useState(true);
    const [loading, setLoading] = useState(true);
    // pdfModal: { id, title } | null
    const [pdfModal, setPdfModal] = useState(null);

    // Redirect Admin / SuperAdmin away from student dashboard
    useEffect(() => {
        if (user && (user.role === 'Admin' || user.role === 'Librarian' || user.role === 'SuperAdmin')) {
            navigate('/admin', { replace: true });
        }
    }, [user]);

    useEffect(() => {
        fetchData();
        fetchEbooks();
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

    const fetchEbooks = async () => {
        try {
            const res = await api.get('/ebooks');
            setEbooks(res.data.ebooks || []);
        } catch (error) {
            console.error('Error fetching ebooks:', error);
        } finally {
            setEbooksLoading(false);
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

    const handleReadEbook = (ebook) => {
        setPdfModal({ id: ebook.id, title: ebook.title });
    };

    const closePdfModal = () => {
        setPdfModal(null);
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

                        {/* Info Card */}
                        <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-8">
                            <h3 className="text-lg font-semibold text-green-800 mb-2">
                                Welcome, {user?.name}!
                            </h3>
                            <p className="text-green-700">
                                Don't forget to check in when you arrive at the library and check out when you leave. You can browse books and access e-books through the system.
                            </p>
                        </div>

                        {/* Attendance Card */}
                        <div className="card mb-8">
                            <h2 className="text-xl font-bold text-gray-800 mb-4">Attendance</h2>
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-gray-600">Current Status:</p>
                                    <p className="text-2xl font-bold mt-1">
                                        {attendanceStatus?.hasCompletedToday ? (
                                            <span className="text-blue-600 flex items-center gap-2">
                                                <CheckCircle className="w-6 h-6" />
                                                Done for Today
                                            </span>
                                        ) : attendanceStatus?.isCheckedIn ? (
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
                                    {attendanceStatus?.hasCompletedToday ? (
                                        <p className="text-sm text-blue-600 font-medium">
                                            ✓ Attendance recorded for today
                                        </p>
                                    ) : attendanceStatus?.isCheckedIn ? (
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

                        {/* My Borrowed Books — Thumbnail Grid */}
                        <div className="card mb-8">
                            <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                                <Book className="w-6 h-6" />
                                My Borrowed Books
                                {myLoans.length > 0 && (
                                    <span className="ml-2 text-sm font-normal text-gray-500">({myLoans.length})</span>
                                )}
                            </h2>
                            {myLoans.length === 0 ? (
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

                        {/* E-Book Library */}
                        <div className="card mb-8">
                            <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                                <FileText className="w-6 h-6" />
                                E-Book Library
                                {ebooks.length > 0 && (
                                    <span className="ml-2 text-sm font-normal text-gray-500">({ebooks.length})</span>
                                )}
                            </h2>
                            {ebooksLoading ? (
                                <div className="flex items-center justify-center h-24">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
                                </div>
                            ) : ebooks.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-10 text-gray-400">
                                    <FileText className="w-12 h-12 mb-2 opacity-30" />
                                    <p className="text-gray-500">No e-books available for your class yet</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                    {ebooks.map((eb) => (
                                        <div key={eb.id} className="flex flex-col rounded-xl border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow bg-white group">
                                            {/* PDF cover — thumbnail if available, else gradient placeholder */}
                                            <div className="w-full aspect-[3/4] relative overflow-hidden bg-gradient-to-br from-red-50 to-red-100">
                                                {eb.thumbnail_path ? (
                                                    <img
                                                        src={`${getBackendUrl()}/uploads/ebooks/${eb.thumbnail_path}`}
                                                        alt={eb.title}
                                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                                        onError={(e) => { e.target.style.display = 'none'; }}
                                                    />
                                                ) : (
                                                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                                                        <FileText className="w-14 h-14 text-red-400" />
                                                        <span className="text-xs font-bold text-red-400 tracking-widest">PDF</span>
                                                    </div>
                                                )}
                                            </div>
                                            {/* Info + Read button */}
                                            <div className="p-3 flex flex-col gap-2 flex-1">
                                                <h3 className="font-semibold text-gray-800 text-sm leading-tight line-clamp-2">{eb.title}</h3>
                                                {eb.category && (
                                                    <span className="inline-block self-start px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full">{eb.category}</span>
                                                )}
                                                <button
                                                    onClick={() => handleReadEbook(eb)}
                                                    className="mt-auto btn-primary text-xs flex items-center justify-center gap-1.5 py-1.5"
                                                >
                                                    <BookOpen className="w-3 h-3" />
                                                    Read
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                    </>
                )}
            </div>
            <DigitalClock />

            {/* PDF Reader Modal */}
            {pdfModal && (
                <PdfReader
                    ebookId={pdfModal.id}
                    title={pdfModal.title}
                    onClose={closePdfModal}
                />
            )}
        </div>
    );
};

export default StudentDashboard;
