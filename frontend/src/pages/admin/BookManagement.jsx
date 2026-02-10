import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Book, Plus, Edit, Trash2, Search, Filter, Download } from 'lucide-react';
import api from '../../utils/api';
import { getImageUrl } from '../../utils/imageUrl';
import { showLoading, showSuccess, showError, showConfirm, closeSwal } from '../../utils/notifications';
import BookCSVImport from '../../components/BookCSVImport';

const BookManagement = () => {
    const [books, setBooks] = useState([]);
    const [filteredBooks, setFilteredBooks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [sortBy, setSortBy] = useState('name-asc');
    const [selectedCover, setSelectedCover] = useState(null);
    const [showAddModal, setShowAddModal] = useState(false);
    const [editingBook, setEditingBook] = useState(null);
    const [formData, setFormData] = useState({
        book_barcode: '',
        book_name: '',
        author: '',
        publisher: '',
        year: '',
        quantity: '',
        book_isbn: ''
    });

    useEffect(() => {
        fetchBooks();
    }, []);

    useEffect(() => {
        if (books.length > 0) {
            applyFilters();
        }
    }, [books, searchTerm, statusFilter, sortBy]);

    const fetchBooks = async () => {
        setLoading(true);
        try {
            const response = await api.get('/books');
            setBooks(response.data.books || []);
            setLoading(false);
        } catch (error) {
            console.error('Error fetching books:', error);
            setLoading(false);
        }
    };

    const applyFilters = () => {
        let result = [...books];

        if (searchTerm) {
            const lowerSearch = searchTerm.toLowerCase();
            result = result.filter(book =>
                book.book_name.toLowerCase().includes(lowerSearch) ||
                book.book_barcode.toLowerCase().includes(lowerSearch) ||
                (book.author && book.author.toLowerCase().includes(lowerSearch)) ||
                (book.book_isbn && book.book_isbn.toLowerCase().includes(lowerSearch))
            );
        }

        if (statusFilter !== 'all') {
            result = result.filter(book => book.status === statusFilter);
        }

        result.sort((a, b) => {
            if (sortBy === 'name-asc') return a.book_name.localeCompare(b.book_name);
            if (sortBy === 'name-desc') return b.book_name.localeCompare(a.book_name);
            if (sortBy === 'year-asc') return (a.year || 0) - (b.year || 0);
            if (sortBy === 'year-desc') return (b.year || 0) - (a.year || 0);
            if (sortBy === 'quantity-asc') return a.quantity - b.quantity;
            if (sortBy === 'quantity-desc') return b.quantity - a.quantity;
            return 0;
        });

        setFilteredBooks(result);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Show loading indicator
        showLoading(editingBook ? 'Updating book...' : 'Adding book...');

        try {
            const data = new FormData();
            Object.keys(formData).forEach(key => {
                if (formData[key]) data.append(key, formData[key]);
            });
            if (selectedCover) {
                data.append('cover', selectedCover);
            }

            if (editingBook) {
                await api.put(`/books/${editingBook.id}`, data, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
                await showSuccess('Book Updated!', 'Book has been updated successfully');
            } else {
                await api.post('/books', data, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
                await showSuccess('Book Added!', 'Book has been added successfully');
            }

            setShowAddModal(false);
            setEditingBook(null);
            resetForm();
            fetchBooks();
        } catch (error) {
            console.error('Submit Error:', error);
            closeSwal();
            showError('Operation Failed', error.response?.data?.error || 'Failed to save book');
        }
    };

    const handleDelete = async (id) => {
        const confirmed = await showConfirm(
            'Delete Book?',
            'This action cannot be undone. Are you sure you want to delete this book?'
        );

        if (confirmed) {
            showLoading('Deleting book...');
            try {
                await api.delete(`/books/${id}`);
                await showSuccess('Deleted!', 'Book has been deleted successfully');
                fetchBooks();
            } catch (error) {
                console.error('Error deleting book:', error);
                closeSwal();
                showError('Delete Failed', 'Failed to delete book');
            }
        }
    };

    const handleEdit = (book) => {
        setEditingBook(book);
        setFormData({
            book_barcode: book.book_barcode || '',
            book_name: book.book_name || '',
            author: book.author || '',
            publisher: book.publisher || '',
            year: book.year || '',
            quantity: book.quantity || '',
            book_isbn: book.book_isbn || ''
        });
        setSelectedCover(null);
        setShowAddModal(true);
    };

    const resetForm = () => {
        setFormData({
            book_barcode: '',
            book_name: '',
            author: '',
            publisher: '',
            year: '',
            quantity: '',
            book_isbn: ''
        });
        setSelectedCover(null);
    };

    const clearFilters = () => {
        setSearchTerm('');
        setStatusFilter('all');
        setSortBy('name-asc');
    };

    const exportToCSV = () => {
        const headers = [
            'Barcode', 'Name', 'Author', 'Publisher', 'Year', 'Quantity', 'Borrowed', 'Available', 'Status', 'ISBN'
        ];

        const rows = filteredBooks.map(book => [
            book.book_barcode,
            book.book_name,
            book.author || '',
            book.publisher || '',
            book.year || '',
            book.quantity,
            book.borrowed_count || 0,
            book.available_qty,
            book.status,
            book.book_isbn || ''
        ]);

        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `books_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
    };

    const handleFileChange = (e) => {
        if (e.target.files && e.target.files[0]) {
            setSelectedCover(e.target.files[0]);
        }
    };

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-800">Book Management</h2>
                <div className="flex gap-2">
                    <button
                        onClick={exportToCSV}
                        className="btn-secondary flex items-center gap-2"
                        disabled={filteredBooks.length === 0}
                    >
                        <Download className="w-4 h-4" />
                        Export CSV
                    </button>
                    <BookCSVImport onImportComplete={fetchBooks} />
                    <button
                        onClick={() => { setShowAddModal(true); setEditingBook(null); resetForm(); }}
                        className="btn-primary flex items-center gap-2"
                    >
                        <Plus className="w-5 h-5" />
                        Add Book
                    </button>
                </div>
            </div>

            {/* Filters */}
            <div className="card mb-6">
                <div className="flex items-center gap-2 mb-4">
                    <Filter className="w-5 h-5 text-gray-600" />
                    <h3 className="text-lg font-semibold text-gray-800">Filters</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    {/* Search */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="Name, author, barcode, ISBN..."
                                className="input-field pl-10"
                            />
                        </div>
                    </div>

                    {/* Status Filter */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="input-field"
                        >
                            <option value="all">All Status</option>
                            <option value="Available">Available</option>
                            <option value="Unavailable">Unavailable</option>
                        </select>
                    </div>

                    {/* Sort By */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Sort By</label>
                        <select
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value)}
                            className="input-field"
                        >
                            <option value="name-asc">Name (A-Z)</option>
                            <option value="name-desc">Name (Z-A)</option>
                            <option value="year-desc">Year (Newest)</option>
                            <option value="year-asc">Year (Oldest)</option>
                            <option value="quantity-desc">Quantity (High-Low)</option>
                            <option value="quantity-asc">Quantity (Low-High)</option>
                        </select>
                    </div>

                    {/* Clear Filters */}
                    <div className="flex items-end">
                        <button
                            onClick={clearFilters}
                            className="btn-secondary w-full"
                        >
                            Clear Filters
                        </button>
                    </div>
                </div>

                <div className="mt-4 text-sm text-gray-600">
                    Showing {filteredBooks.length} of {books.length} books
                </div>
            </div>

            {/* Books Table */}
            {loading ? (
                <div className="flex justify-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
                </div>
            ) : filteredBooks.length === 0 ? (
                <div className="card text-center py-12">
                    <Book className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-600">No books found</p>
                    <p className="text-sm text-gray-500 mt-1">Try adjusting your filters or add a new book</p>
                </div>
            ) : (
                <div className="bg-white rounded-lg shadow overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cover</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Barcode</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Book Name</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Year</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Author</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Publisher</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Quantity</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Borrowed</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Available</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">ISBN</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {filteredBooks.map((book) => (
                                    <tr key={book.id} className="hover:bg-gray-50">
                                        <td className="px-4 py-3 text-sm">
                                            {book.book_cover ? (
                                                <img src={getImageUrl(book.book_cover)} alt="Cover" className="w-10 h-14 object-cover rounded" />
                                            ) : (
                                                <div className="w-10 h-14 bg-gray-200 rounded flex items-center justify-center text-gray-400 text-xs">No Img</div>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-gray-900">{book.book_barcode}</td>
                                        <td className="px-4 py-3 text-sm font-medium text-gray-900">{book.book_name}</td>
                                        <td className="px-4 py-3 text-sm text-gray-600">{book.year || '-'}</td>
                                        <td className="px-4 py-3 text-sm text-gray-600">{book.author || '-'}</td>
                                        <td className="px-4 py-3 text-sm text-gray-600">{book.publisher || '-'}</td>
                                        <td className="px-4 py-3 text-sm text-gray-900">{book.quantity}</td>
                                        <td className="px-4 py-3 text-sm text-gray-900">{book.borrowed_count || 0}</td>
                                        <td className="px-4 py-3 text-sm text-gray-900">{book.available_qty}</td>
                                        <td className="px-4 py-3 text-sm">
                                            <span className={`px-2 py-1 text-xs rounded-full ${book.status === 'Available' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                                }`}>
                                                {book.status}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-sm text-gray-600">{book.book_isbn || '-'}</td>
                                        <td className="px-4 py-3 text-sm">
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => handleEdit(book)}
                                                    className="text-blue-600 hover:text-blue-800"
                                                >
                                                    <Edit className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(book.id)}
                                                    className="text-red-600 hover:text-red-800"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Add/Edit Modal */}
            {showAddModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                        <h3 className="text-xl font-bold mb-4">{editingBook ? 'Edit Book' : 'Add New Book'}</h3>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Book Cover</label>
                                    <div className="flex gap-4">
                                        {/* Preview */}
                                        {(selectedCover || (editingBook && editingBook.book_cover)) && (
                                            <div className="w-20 h-28 bg-gray-100 rounded border shrink-0">
                                                <img
                                                    src={selectedCover ? URL.createObjectURL(selectedCover) : getImageUrl(editingBook.book_cover)}
                                                    alt="Preview"
                                                    className="w-full h-full object-cover rounded"
                                                />
                                            </div>
                                        )}
                                        <div className="flex-1">
                                            <input
                                                type="file"
                                                accept="image/*"
                                                onChange={handleFileChange}
                                                className="input-field p-1"
                                            />
                                            <p className="text-xs text-gray-500 mt-1">Upload an image (JPG, PNG)</p>
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Book Barcode *</label>
                                    <input
                                        type="text"
                                        value={formData.book_barcode}
                                        onChange={(e) => setFormData({ ...formData, book_barcode: e.target.value })}
                                        className="input-field"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Book Name *</label>
                                    <input
                                        type="text"
                                        value={formData.book_name}
                                        onChange={(e) => setFormData({ ...formData, book_name: e.target.value })}
                                        className="input-field"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Author</label>
                                    <input
                                        type="text"
                                        value={formData.author}
                                        onChange={(e) => setFormData({ ...formData, author: e.target.value })}
                                        className="input-field"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Publisher</label>
                                    <input
                                        type="text"
                                        value={formData.publisher}
                                        onChange={(e) => setFormData({ ...formData, publisher: e.target.value })}
                                        className="input-field"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
                                    <input
                                        type="number"
                                        value={formData.year}
                                        onChange={(e) => setFormData({ ...formData, year: e.target.value })}
                                        className="input-field"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Quantity *</label>
                                    <input
                                        type="number"
                                        value={formData.quantity}
                                        onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                                        className="input-field"
                                        required
                                        min="0"
                                    />
                                </div>
                                <div className="col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">ISBN</label>
                                    <input
                                        type="text"
                                        value={formData.book_isbn}
                                        onChange={(e) => setFormData({ ...formData, book_isbn: e.target.value })}
                                        className="input-field"
                                    />
                                </div>
                            </div>
                            <div className="flex justify-end gap-3 mt-6">
                                <button
                                    type="button"
                                    onClick={() => { setShowAddModal(false); setEditingBook(null); resetForm(); }}
                                    className="btn-secondary"
                                >
                                    Cancel
                                </button>
                                <button type="submit" className="btn-primary">
                                    {editingBook ? 'Update' : 'Add'} Book
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default BookManagement;
