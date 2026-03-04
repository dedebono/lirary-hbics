import React, { useState, useEffect } from 'react';
import { BookOpen, Upload, Trash2, FileText, X, CheckCircle } from 'lucide-react';
import api from '../../utils/api';

const EbookManagement = () => {
    const [ebooks, setEbooks] = useState([]);
    const [classes, setClasses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [notification, setNotification] = useState(null);

    // Form state
    const [title, setTitle] = useState('');
    const [category, setCategory] = useState('');
    const [selectedFile, setSelectedFile] = useState(null);
    const [visibilityMode, setVisibilityMode] = useState('all'); // 'all' | 'selected'
    const [selectedClasses, setSelectedClasses] = useState([]);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [ebooksRes, usersRes] = await Promise.all([
                api.get('/ebooks'),
                api.get('/users'),
            ]);
            setEbooks(ebooksRes.data.ebooks || []);

            // Extract unique classes from student users
            const users = usersRes.data.users || [];
            const uniqueClasses = [...new Set(
                users.filter(u => u.userType === 'student' && u.class).map(u => u.class)
            )].sort();
            setClasses(uniqueClasses);
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    };

    const showNotification = (message, type = 'success') => {
        setNotification({ message, type });
        setTimeout(() => setNotification(null), 3500);
    };

    const toggleClass = (cls) => {
        setSelectedClasses(prev =>
            prev.includes(cls) ? prev.filter(c => c !== cls) : [...prev, cls]
        );
    };

    const resetForm = () => {
        setTitle('');
        setCategory('');
        setSelectedFile(null);
        setVisibilityMode('all');
        setSelectedClasses([]);
        setUploadProgress(0);
        // clear file input
        const fileInput = document.getElementById('ebook-file-input');
        if (fileInput) fileInput.value = '';
    };

    const handleUpload = async (e) => {
        e.preventDefault();
        if (!selectedFile) {
            showNotification('Please select a PDF file.', 'error');
            return;
        }
        if (!title.trim()) {
            showNotification('Title is required.', 'error');
            return;
        }

        const formData = new FormData();
        formData.append('title', title.trim());
        if (category.trim()) formData.append('category', category.trim());
        formData.append('file', selectedFile);

        // allowed_classes: 'all' or JSON array
        if (visibilityMode === 'selected' && selectedClasses.length > 0) {
            formData.append('allowed_classes', JSON.stringify(selectedClasses));
        } else {
            formData.append('allowed_classes', 'all');
        }

        setUploading(true);
        setUploadProgress(0);
        try {
            await api.post('/ebooks', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
                onUploadProgress: (evt) => {
                    if (evt.total) setUploadProgress(Math.round((evt.loaded / evt.total) * 100));
                },
            });
            showNotification('E-book uploaded successfully!');
            resetForm();
            fetchData();
        } catch (error) {
            showNotification(error.response?.data?.error || 'Upload failed', 'error');
        } finally {
            setUploading(false);
        }
    };

    const handleDelete = async (id, title) => {
        if (!window.confirm(`Delete "${title}"? This cannot be undone.`)) return;
        try {
            await api.delete(`/ebooks/${id}`);
            showNotification(`"${title}" deleted.`);
            fetchData();
        } catch (error) {
            showNotification(error.response?.data?.error || 'Delete failed', 'error');
        }
    };

    const formatClasses = (allowedClasses) => {
        if (!allowedClasses) return 'All Classes';
        try {
            const arr = JSON.parse(allowedClasses);
            if (!Array.isArray(arr) || arr.length === 0) return 'All Classes';
            return arr.join(', ');
        } catch {
            return 'All Classes';
        }
    };

    return (
        <div className="p-6">
            {/* Notification */}
            {notification && (
                <div className={`fixed top-4 right-4 z-50 px-5 py-3 rounded-lg shadow-lg text-white flex items-center gap-2 text-sm font-medium transition-all ${notification.type === 'error' ? 'bg-red-500' : 'bg-green-500'}`}>
                    <CheckCircle className="w-4 h-4" />
                    {notification.message}
                    <button onClick={() => setNotification(null)}><X className="w-4 h-4 ml-1" /></button>
                </div>
            )}

            <h1 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                <BookOpen className="w-7 h-7 text-primary-600" />
                E-Book Management
            </h1>

            {/* Upload Form */}
            <div className="card mb-8">
                <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                    <Upload className="w-5 h-5" />
                    Upload New E-Book
                </h2>
                <form onSubmit={handleUpload} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Title <span className="text-red-500">*</span></label>
                            <input
                                type="text"
                                value={title}
                                onChange={e => setTitle(e.target.value)}
                                placeholder="e.g. Science Grade 3 Vol.1"
                                className="input-field"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                            <input
                                type="text"
                                value={category}
                                onChange={e => setCategory(e.target.value)}
                                placeholder="e.g. Science, Math, History"
                                className="input-field"
                            />
                        </div>
                    </div>

                    {/* Class Visibility */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Visible to</label>
                        <div className="flex gap-4 mb-3">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="radio"
                                    name="visibility"
                                    value="all"
                                    checked={visibilityMode === 'all'}
                                    onChange={() => { setVisibilityMode('all'); setSelectedClasses([]); }}
                                    className="accent-primary-600"
                                />
                                <span className="text-sm text-gray-700">All Classes</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="radio"
                                    name="visibility"
                                    value="selected"
                                    checked={visibilityMode === 'selected'}
                                    onChange={() => setVisibilityMode('selected')}
                                    className="accent-primary-600"
                                />
                                <span className="text-sm text-gray-700">Specific Classes</span>
                            </label>
                        </div>
                        {visibilityMode === 'selected' && (
                            <div className="flex flex-wrap gap-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
                                {classes.length === 0 ? (
                                    <p className="text-sm text-gray-500">No classes found. Add students first.</p>
                                ) : classes.map(cls => (
                                    <button
                                        type="button"
                                        key={cls}
                                        onClick={() => toggleClass(cls)}
                                        className={`px-3 py-1.5 text-sm rounded-full border transition-colors ${selectedClasses.includes(cls)
                                            ? 'bg-primary-600 text-white border-primary-600'
                                            : 'bg-white text-gray-700 border-gray-300 hover:border-primary-400'}`}
                                    >
                                        {cls}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* File Input */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">PDF File <span className="text-red-500">*</span></label>
                        <input
                            id="ebook-file-input"
                            type="file"
                            accept=".pdf,application/pdf"
                            onChange={e => setSelectedFile(e.target.files[0] || null)}
                            className="block w-full text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100 cursor-pointer"
                        />
                        {selectedFile && (
                            <p className="text-xs text-gray-500 mt-1">
                                {selectedFile.name} — {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                            </p>
                        )}
                    </div>

                    {/* Upload Progress */}
                    {uploading && (
                        <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                                className="bg-primary-600 h-2 rounded-full transition-all"
                                style={{ width: `${uploadProgress}%` }}
                            />
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={uploading}
                        className="btn-primary flex items-center gap-2 disabled:opacity-60"
                    >
                        <Upload className="w-4 h-4" />
                        {uploading ? `Uploading… ${uploadProgress}%` : 'Upload E-Book'}
                    </button>
                </form>
            </div>

            {/* Ebook List */}
            <div className="card">
                <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    Uploaded E-Books
                    {ebooks.length > 0 && <span className="ml-1 text-sm font-normal text-gray-500">({ebooks.length})</span>}
                </h2>
                {loading ? (
                    <div className="flex items-center justify-center h-24">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
                    </div>
                ) : ebooks.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 text-gray-400">
                        <BookOpen className="w-12 h-12 mb-2 opacity-30" />
                        <p>No e-books uploaded yet.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {ebooks.map(eb => (
                            <div key={eb.id} className="border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow bg-white flex flex-col gap-2">
                                <div className="flex items-start justify-between gap-2">
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                            <FileText className="w-5 h-5 text-red-500" />
                                        </div>
                                        <div className="min-w-0">
                                            <h3 className="font-semibold text-gray-800 text-sm leading-tight truncate">{eb.title}</h3>
                                            {eb.category && <p className="text-xs text-gray-500 truncate">{eb.category}</p>}
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => handleDelete(eb.id, eb.title)}
                                        className="text-gray-400 hover:text-red-500 transition-colors flex-shrink-0"
                                        title="Delete"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                                <div className="flex items-center gap-1 flex-wrap">
                                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${!eb.allowed_classes ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                                        {formatClasses(eb.allowed_classes)}
                                    </span>
                                </div>
                                <p className="text-xs text-gray-400 mt-auto">{new Date(eb.created_at).toLocaleDateString()}</p>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default EbookManagement;
