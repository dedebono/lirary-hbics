import React, { useState, useEffect, useRef } from 'react';
import { Scan, Search, User, BookOpen, X, CheckCircle, Plus, AlertCircle, ArrowRight } from 'lucide-react';
import api from '../../utils/api';

const BorrowBook = () => {
    // State for identifying user
    const [userIdentifier, setUserIdentifier] = useState(''); // Barcode or Name
    const [selectedUser, setSelectedUser] = useState(null);
    const [userSearchLoading, setUserSearchLoading] = useState(false);
    const [userSearchResults, setUserSearchResults] = useState([]);
    const [userError, setUserError] = useState('');

    // State for books
    const [bookBarcode, setBookBarcode] = useState('');
    const [scannedBooks, setScannedBooks] = useState([]); // Array of book objects to borrow
    const [bookError, setBookError] = useState('');
    const [bookLoading, setBookLoading] = useState(false);
    const [allBooks, setAllBooks] = useState([]); // Cache all books for search
    const [bookSearchResults, setBookSearchResults] = useState([]); // For name search

    // Submission
    const [submitting, setSubmitting] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');

    const userInputRef = useRef(null);
    const bookInputRef = useRef(null);

    // Focus management and Prefetch Books
    useEffect(() => {
        if (!selectedUser) {
            userInputRef.current?.focus();
        } else {
            bookInputRef.current?.focus();
            fetchAllBooks(); // Prefetch books when entering Step 2
        }
    }, [selectedUser]);

    const fetchAllBooks = async () => {
        try {
            const res = await api.get('/books');
            setAllBooks(res.data.books || []);
        } catch (error) {
            console.error("Error fetching books:", error);
        }
    };

    // Handle User Search/Scan (unchanged)
    const handleUserSubmit = async (e) => {
        e.preventDefault();
        if (!userIdentifier.trim()) return;

        setUserSearchLoading(true);
        setUserError('');
        setUserSearchResults([]);

        try {
            // Try explicit barcode match first (exact match)
            let foundUser = null;

            // Search students
            const sRes = await api.get('/users', { params: { userType: 'student' } });
            const students = sRes.data.users || [];

            // Search teachers
            const tRes = await api.get('/users', { params: { userType: 'teacher' } });
            const teachers = tRes.data.users || [];

            const allUsers = [
                ...students.map(s => ({ ...s, userType: 'student' })),
                ...teachers.map(t => ({ ...t, userType: 'teacher' }))
            ];

            // 1. Exact Barcode Match
            foundUser = allUsers.find(u => u.barcode === userIdentifier.trim());

            if (foundUser) {
                setSelectedUser(foundUser);
                setUserIdentifier('');
            } else {
                // 2. Name Search
                const matches = allUsers.filter(u => u.name.toLowerCase().includes(userIdentifier.toLowerCase()));
                if (matches.length === 1) {
                    setSelectedUser(matches[0]);
                    setUserIdentifier('');
                } else if (matches.length > 1) {
                    setUserSearchResults(matches);
                } else {
                    setUserError('User not found');
                }
            }
        } catch (error) {
            console.error(error);
            setUserError('Error searching for user');
        } finally {
            setUserSearchLoading(false);
        }
    };

    const handleSelectUser = (user) => {
        setSelectedUser(user);
        setUserSearchResults([]);
        setUserIdentifier('');
        setUserError('');
    };

    const resetUser = () => {
        setSelectedUser(null);
        setScannedBooks([]);
        setSuccessMessage('');
        setUserError('');
        setAllBooks([]);
    };

    // Handle Book Scan or Search
    const handleBookInputChange = (e) => {
        const val = e.target.value;
        setBookBarcode(val);
        setBookError('');

        if (val.length > 1) {
            // Search by name logic (client-side)
            const matches = allBooks.filter(b =>
                b.book_name.toLowerCase().includes(val.toLowerCase()) ||
                b.book_barcode.toLowerCase().includes(val.toLowerCase())
            );
            // Hide if it's an exact barcode match (user will likely press Enter)
            const exactMatch = matches.find(b => b.book_barcode === val.trim());
            if (exactMatch && matches.length === 1) {
                setBookSearchResults([]);
            } else {
                setBookSearchResults(matches.slice(0, 5)); // Limit to 5 results
            }
        } else {
            setBookSearchResults([]);
        }
    };

    const addBookToCart = (book) => {
        // Prevent duplicate scans
        if (scannedBooks.some(b => b.barcode === book.book_barcode)) {
            setBookError('Book already in list');
            return;
        }
        if (book.available_qty < 1) {
            setBookError('Book not available');
            return;
        }

        setScannedBooks([...scannedBooks, {
            ...book,
            barcode: book.book_barcode
        }]);
        setBookBarcode('');
        setBookSearchResults([]);
        setBookError('');
        bookInputRef.current?.focus();
    };

    const handleBookSubmit = async (e) => {
        e.preventDefault();
        if (!bookBarcode.trim()) return;

        setBookLoading(true);
        setBookError('');
        setBookSearchResults([]);

        try {
            // Check allBooks first
            const book = allBooks.find(b => b.book_barcode === bookBarcode.trim());

            if (book) {
                addBookToCart(book);
            } else {
                setBookError('Book not found');
            }
        } catch (error) {
            setBookError('Error finding book');
        } finally {
            setBookLoading(false);
            bookInputRef.current?.focus();
        }
    };

    const removeBook = (index) => {
        const newBooks = [...scannedBooks];
        newBooks.splice(index, 1);
        setScannedBooks(newBooks);
    };

    // Final Borrow Action (unchanged)
    const handleBorrow = async () => {
        if (!selectedUser || scannedBooks.length === 0) return;

        setSubmitting(true);
        setSuccessMessage('');
        let errorCount = 0;
        let successCount = 0;

        for (const book of scannedBooks) {
            try {
                await api.post('/borrow/admin/borrow', {
                    userBarcode: selectedUser.barcode,
                    bookBarcode: book.book_barcode
                });
                successCount++;
            } catch (error) {
                console.error(error);
                errorCount++;
            }
        }

        setSubmitting(false);

        if (errorCount === 0) {
            setSuccessMessage(`Successfully borrowed ${successCount} books for ${selectedUser.name}`);
            setScannedBooks([]);
            setTimeout(() => {
                setSuccessMessage('');
                resetUser();
            }, 2000);

        } else {
            setBookError(`Borrowed ${successCount} books. Failed to borrow ${errorCount} books.`);
            setScannedBooks([]);
        }
    };

    return (
        <div className="max-w-5xl mx-auto space-y-8">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold text-gray-800">Borrow Books</h1>

                {/* Stepper Indicator */}
                <div className="flex items-center space-x-2 text-sm">
                    <div className={`px-3 py-1 rounded-full ${!selectedUser ? 'bg-primary-600 text-white font-medium' : 'bg-primary-100 text-primary-600'}`}>
                        1. Identify User
                    </div>
                    <div className="w-8 h-px bg-gray-300"></div>
                    <div className={`px-3 py-1 rounded-full ${selectedUser ? 'bg-primary-600 text-white font-medium' : 'bg-gray-100 text-gray-400'}`}>
                        2. Scan Books
                    </div>
                </div>
            </div>

            {/* Step 1: Identify User */}
            {!selectedUser ? (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="p-8 text-center max-w-2xl mx-auto">
                        <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-6">
                            <User className="w-8 h-8 text-primary-600" />
                        </div>
                        <h2 className="text-2xl font-bold text-gray-800 mb-2">Identify Borrower</h2>
                        <p className="text-gray-500 mb-8">Scan a student or teacher barcode, or search by name to begin the borrowing process.</p>

                        <form onSubmit={handleUserSubmit} className="relative max-w-lg mx-auto mb-6">
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Search className="h-5 w-5 text-gray-400" />
                                </div>
                                <input
                                    ref={userInputRef}
                                    type="text"
                                    value={userIdentifier}
                                    onChange={(e) => setUserIdentifier(e.target.value)}
                                    placeholder="Scan Barcode or Search Name..."
                                    className="block w-full pl-10 pr-3 py-4 border border-gray-300 rounded-lg leading-5 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 sm:text-sm transition-shadow shadow-sm"
                                    disabled={userSearchLoading}
                                />
                                <button
                                    type="submit"
                                    className="absolute inset-y-1 right-1 px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50 transition-colors font-medium text-sm flex items-center gap-2"
                                    disabled={userSearchLoading || !userIdentifier.trim()}
                                >
                                    {userSearchLoading ? 'Wait...' : (
                                        <>
                                            Next <ArrowRight className="w-4 h-4" />
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>

                        {userError && (
                            <div className="flex items-center justify-center text-red-600 gap-2 mb-4 bg-red-50 p-2 rounded-lg inline-flex px-4">
                                <AlertCircle className="w-4 h-4" />
                                {userError}
                            </div>
                        )}

                        {userSearchResults.length > 0 && (
                            <div className="border border-gray-200 rounded-lg divide-y max-h-60 overflow-y-auto text-left max-w-lg mx-auto shadow-sm">
                                {userSearchResults.map(user => (
                                    <button
                                        key={user.id + user.userType}
                                        onClick={() => handleSelectUser(user)}
                                        className="w-full p-4 hover:bg-gray-50 flex justify-between items-center transition-colors group"
                                    >
                                        <div>
                                            <p className="font-medium text-gray-900 group-hover:text-primary-700 transition-colors">{user.name}</p>
                                            <p className="text-xs text-gray-500 capitalize">
                                                {user.userType}
                                                {user.class && <span className="ml-1">• {user.class}</span>}
                                                <span className="ml-1 font-mono bg-gray-100 px-1 rounded">• {user.barcode}</span>
                                            </p>
                                        </div>
                                        <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center group-hover:bg-primary-100 group-hover:text-primary-600 transition-colors">
                                            <Plus className="w-4 h-4" />
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            ) : (
                /* Step 2: User Selected, Scan Books */
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left Column: User Info & Scanner */}
                    <div className="lg:col-span-1 space-y-6">
                        {/* User Card */}
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-24 h-24 bg-primary-50 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110"></div>
                            <div className="relative z-10">
                                <p className="text-xs font-semibold text-primary-600 uppercase tracking-wider mb-1">Borrower</p>
                                <h3 className="text-xl font-bold text-gray-900 mb-1">{selectedUser.name}</h3>
                                <p className="text-sm text-gray-500 capitalize mb-4">
                                    {selectedUser.userType}
                                    {selectedUser.class && <span className="ml-1">• {selectedUser.class}</span>}
                                </p>
                                <div className="flex items-center justify-between">
                                    <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded text-gray-600 border border-gray-200">{selectedUser.barcode}</span>
                                    <button
                                        onClick={resetUser}
                                        className="text-sm text-gray-500 hover:text-red-600 transition-colors underline decoration-dotted"
                                    >
                                        Change User
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Scanner Form */}
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 relative">
                            <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                                <div className="p-1.5 bg-secondary-100 rounded text-secondary-600">
                                    <Scan className="w-5 h-5" />
                                </div>
                                Scan or Search Books
                            </h2>
                            <form onSubmit={handleBookSubmit}>
                                <div className="flex gap-2 mb-2 relative">
                                    <div className="relative w-full">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <Search className="h-4 w-4 text-gray-400" />
                                        </div>
                                        <input
                                            ref={bookInputRef}
                                            type="text"
                                            value={bookBarcode}
                                            onChange={handleBookInputChange}
                                            placeholder="Scan Barcode or Search Name..."
                                            className="block w-full pl-9 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-secondary-500 focus:border-secondary-500 transition-shadow text-gray-900 bg-white placeholder-gray-400"
                                            disabled={bookLoading}
                                            autoFocus
                                            autoComplete="off"
                                        />
                                    </div>
                                    <button
                                        type="submit"
                                        className="px-4 bg-secondary-600 text-white rounded-lg hover:bg-secondary-700 transition-colors font-medium disabled:opacity-50"
                                        disabled={bookLoading || !bookBarcode.trim()}
                                    >
                                        Add
                                    </button>
                                </div>
                                <p className="text-xs text-gray-500">Press Enter after scanning</p>
                            </form>

                            {/* Book Search Results Dropdown */}
                            {bookSearchResults.length > 0 && (
                                <div className="absolute left-6 right-6 top-[135px] z-20 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto divide-y divide-gray-100">
                                    {bookSearchResults.map(book => (
                                        <button
                                            key={book.id}
                                            onClick={() => addBookToCart(book)}
                                            disabled={book.available_qty < 1}
                                            className="w-full text-left p-3 hover:bg-gray-50 flex justify-between items-center group disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            <div>
                                                <div className="text-sm font-medium text-gray-900 group-hover:text-secondary-700">{book.book_name}</div>
                                                <div className="text-xs text-gray-500 flex gap-2">
                                                    <span className="font-mono bg-gray-100 px-1 rounded">{book.book_barcode}</span>
                                                    <span>{book.author}</span>
                                                </div>
                                            </div>
                                            {book.available_qty > 0 ? (
                                                <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center group-hover:bg-secondary-100 group-hover:text-secondary-600">
                                                    <Plus className="w-3 h-3" />
                                                </div>
                                            ) : (
                                                <span className="text-xs text-red-500 font-medium">Out</span>
                                            )}
                                        </button>
                                    ))}
                                </div>
                            )}

                            {bookError && (
                                <div className="mt-3 text-sm text-red-600 bg-red-50 p-3 rounded-lg flex items-center gap-2 border border-red-100">
                                    <AlertCircle className="w-4 h-4 shrink-0" />
                                    {bookError}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right Column: Book Cart */}
                    <div className="lg:col-span-2">
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col h-full min-h-[500px]">
                            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                                <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                                    <BookOpen className="w-5 h-5 text-gray-500" />
                                    Books to Borrow
                                </h2>
                                <span className="bg-primary-100 text-primary-700 text-xs font-bold px-3 py-1 rounded-full border border-primary-200">
                                    {scannedBooks.length} Item{scannedBooks.length !== 1 && 's'}
                                </span>
                            </div>

                            <div className="flex-1 p-6 overflow-y-auto space-y-4">
                                {scannedBooks.length === 0 ? (
                                    <div className="h-full flex flex-col items-center justify-center text-gray-400 opacity-60">
                                        <Scan className="w-16 h-16 mb-4 stroke-1" />
                                        <p className="text-lg font-medium">Ready to scan</p>
                                        <p className="text-sm">Scan books to add them to the list</p>
                                    </div>
                                ) : (
                                    scannedBooks.map((book, index) => (
                                        <div key={index} className="flex justify-between items-start p-4 bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow group">
                                            <div className="flex gap-4">
                                                <div className="w-12 h-16 bg-gray-100 rounded border border-gray-200 flex items-center justify-center text-gray-400 shrink-0">
                                                    <BookOpen className="w-6 h-6" />
                                                </div>
                                                <div>
                                                    <h4 className="font-bold text-gray-800 line-clamp-1">{book.book_name}</h4>
                                                    <p className="text-xs text-gray-500 font-mono mb-1">{book.book_barcode}</p>
                                                    <p className="text-xs text-gray-500">{book.author}</p>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => removeBook(index)}
                                                className="text-gray-400 hover:text-red-500 hover:bg-red-50 p-2 rounded-full transition-colors opacity-0 group-hover:opacity-100"
                                                title="Remove book"
                                            >
                                                <X className="w-5 h-5" />
                                            </button>
                                        </div>
                                    ))
                                )}
                            </div>

                            <div className="p-6 border-t border-gray-100 bg-gray-50">
                                {successMessage && (
                                    <div className="mb-4 p-4 bg-green-50 border border-green-200 text-green-700 rounded-xl text-sm flex items-center gap-3 animate-fade-in shadow-sm">
                                        <div className="p-1 bg-green-100 rounded-full">
                                            <CheckCircle className="w-5 h-5" />
                                        </div>
                                        <font className="font-medium">{successMessage}</font>
                                    </div>
                                )}

                                <button
                                    onClick={handleBorrow}
                                    disabled={scannedBooks.length === 0 || submitting}
                                    className="w-full py-4 text-lg font-bold rounded-xl bg-gradient-to-r from-primary-600 to-primary-700 text-white shadow-lg shadow-primary-200 hover:shadow-primary-300 hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none transition-all flex items-center justify-center gap-3"
                                >
                                    {submitting ? (
                                        <>
                                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                            Processing...
                                        </>
                                    ) : (
                                        <>
                                            Confirm Borrow ({scannedBooks.length}) <ArrowRight className="w-5 h-5" />
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default BorrowBook;
