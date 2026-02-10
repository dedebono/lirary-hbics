import React, { useState, useEffect } from 'react';
import { Users, Plus, Edit, Trash2, Search, Filter, Download } from 'lucide-react';
import api from '../../utils/api';
import CSVImport from '../../components/CSVImport';

const UserManagement = () => {
    const [users, setUsers] = useState([]);
    const [filteredUsers, setFilteredUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [userType, setUserType] = useState('student');
    const [searchTerm, setSearchTerm] = useState('');
    const [sortBy, setSortBy] = useState('name-asc');
    const [selectedPhoto, setSelectedPhoto] = useState(null);
    const [showAddModal, setShowAddModal] = useState(false);
    const [editingUser, setEditingUser] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        barcode: '',
        username: '',
        password: '',
        className: '',
        role: 'Admin'
    });

    useEffect(() => {
        fetchUsers();
    }, []);

    useEffect(() => {
        if (users.length > 0) {
            applyFilters();
        }
    }, [users, searchTerm, sortBy, userType]);

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const response = await api.get('/users');
            setUsers(response.data.users || []);
            setLoading(false);
        } catch (error) {
            console.error('Error fetching users:', error);
            setLoading(false);
        }
    };

    const applyFilters = () => {
        let result = users.filter(user => user.userType === userType);

        if (searchTerm) {
            const lowerSearch = searchTerm.toLowerCase();
            result = result.filter(user =>
                user.name.toLowerCase().includes(lowerSearch) ||
                (user.barcode && user.barcode.toLowerCase().includes(lowerSearch)) ||
                (user.class && user.class.toLowerCase().includes(lowerSearch)) ||
                (user.username && user.username.toLowerCase().includes(lowerSearch))
            );
        }

        result.sort((a, b) => {
            if (sortBy === 'name-asc') return a.name.localeCompare(b.name);
            if (sortBy === 'name-desc') return b.name.localeCompare(a.name);
            if (sortBy === 'barcode-asc') return (a.barcode || '').localeCompare(b.barcode || '');
            if (sortBy === 'barcode-desc') return (b.barcode || '').localeCompare(a.barcode || '');
            if (sortBy === 'class-asc') return (a.class || '').localeCompare(b.class || '');
            if (sortBy === 'class-desc') return (b.class || '').localeCompare(a.class || '');
            return 0;
        });

        setFilteredUsers(result);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const data = new FormData();
            data.append('name', formData.name);
            data.append('userType', userType);
            data.append('password', formData.password);

            if (userType === 'admin') {
                data.append('username', formData.username);
                data.append('role', formData.role);
            } else if (userType === 'student') {
                data.append('barcode', formData.barcode);
                data.append('className', formData.className);
            } else if (userType === 'teacher') {
                data.append('barcode', formData.barcode);
            }

            if (selectedPhoto) {
                data.append('photo', selectedPhoto);
            }

            const config = {
                headers: { 'Content-Type': 'multipart/form-data' }
            };

            if (editingUser) {
                await api.put(`/users/${userType}/${editingUser.id}`, data, config);
            } else {
                await api.post('/auth/register', data, config);
            }

            setShowAddModal(false);
            setEditingUser(null);
            resetForm();
            fetchUsers();
        } catch (error) {
            console.error('Submit Error:', error);
            alert(error.response?.data?.error || 'Operation failed');
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm('Are you sure you want to delete this user?')) {
            try {
                await api.delete(`/users/${userType}/${id}`);
                // Optimistic update or refetch
                fetchUsers();
            } catch (error) {
                console.error('Error deleting user:', error);
                alert('Failed to delete user');
            }
        }
    };

    const handleEdit = (user) => {
        setEditingUser(user);
        setFormData({
            name: user.name,
            barcode: user.barcode || '',
            username: user.username || '',
            password: '',
            className: user.class || '', // Note: 'class' from DB is mapped to 'className' in form
            role: user.role || 'Admin'
        });
        setSelectedPhoto(null);
        setShowAddModal(true);
    };

    const resetForm = () => {
        setFormData({
            name: '',
            barcode: '',
            username: '',
            password: '',
            className: '',
            role: 'Admin'
        });
        setSelectedPhoto(null);
    };

    const clearFilters = () => {
        setSearchTerm('');
        setSortBy('name-asc');
    };

    const exportToCSV = () => {
        let headers, rows;

        if (userType === 'student') {
            headers = ['Name', 'Barcode', 'Class'];
            rows = filteredUsers.map(user => [user.name, user.barcode, user.class || '']);
        } else if (userType === 'teacher') {
            headers = ['Name', 'Barcode'];
            rows = filteredUsers.map(user => [user.name, user.barcode]);
        } else {
            headers = ['Name', 'Username', 'Role'];
            rows = filteredUsers.map(user => [user.name, user.username, user.role]);
        }

        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${userType}s_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
    };

    const handleFileChange = (e) => {
        if (e.target.files && e.target.files[0]) {
            setSelectedPhoto(e.target.files[0]);
        }
    };

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-800">User Management</h2>
                <div className="flex gap-2">
                    <button
                        onClick={exportToCSV}
                        className="btn-secondary flex items-center gap-2"
                        disabled={filteredUsers.length === 0}
                    >
                        <Download className="w-4 h-4" />
                        Export CSV
                    </button>
                    <CSVImport userType={userType} onImportComplete={fetchUsers} />
                    <button
                        onClick={() => { setShowAddModal(true); setEditingUser(null); resetForm(); }}
                        className="btn-primary flex items-center gap-2"
                    >
                        <Plus className="w-5 h-5" />
                        Add User
                    </button>
                </div>
            </div>

            {/* User Type Tabs */}
            <div className="mb-6 flex gap-4">
                <button
                    onClick={() => setUserType('student')}
                    className={`px-6 py-2 rounded-lg font-medium transition-colors ${userType === 'student' ? 'bg-primary-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        }`}
                >
                    Students
                </button>
                <button
                    onClick={() => setUserType('teacher')}
                    className={`px-6 py-2 rounded-lg font-medium transition-colors ${userType === 'teacher' ? 'bg-primary-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        }`}
                >
                    Teachers
                </button>
                <button
                    onClick={() => setUserType('admin')}
                    className={`px-6 py-2 rounded-lg font-medium transition-colors ${userType === 'admin' ? 'bg-primary-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        }`}
                >
                    Admins
                </button>
            </div>

            {/* Filters */}
            <div className="card mb-6">
                <div className="flex items-center gap-2 mb-4">
                    <Filter className="w-5 h-5 text-gray-600" />
                    <h3 className="text-lg font-semibold text-gray-800">Filters</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Search */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="Name, barcode, class..."
                                className="input-field pl-10"
                            />
                        </div>
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
                            <option value="barcode-asc">Barcode (A-Z)</option>
                            <option value="barcode-desc">Barcode (Z-A)</option>
                            {userType === 'student' && (
                                <>
                                    <option value="class-asc">Class (A-Z)</option>
                                    <option value="class-desc">Class (Z-A)</option>
                                </>
                            )}
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
                    Showing {filteredUsers.length} of {users.length} {userType}s
                </div>
            </div>

            {/* Users Table */}
            {loading ? (
                <div className="flex justify-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
                </div>
            ) : filteredUsers.length === 0 ? (
                <div className="card text-center py-12">
                    <Users className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-600">No {userType}s found</p>
                    <p className="text-sm text-gray-500 mt-1">Try adjusting your filters or add a new {userType}</p>
                </div>
            ) : (
                <div className="bg-white rounded-lg shadow overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    {userType !== 'admin' && (
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Photo</th>
                                    )}
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                                    {userType !== 'admin' && (
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Barcode</th>
                                    )}
                                    {userType === 'student' && (
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Class</th>
                                    )}
                                    {userType === 'admin' && (
                                        <>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Username</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                                        </>
                                    )}
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {filteredUsers.map((user) => (
                                    <tr key={user.id} className="hover:bg-gray-50">
                                        {userType !== 'admin' && (
                                            <td className="px-6 py-4 text-sm">
                                                {user.photo ? (
                                                    <img src={`http://localhost:5000${user.photo}`} alt="User" className="w-10 h-10 object-cover rounded-full" />
                                                ) : (
                                                    <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center text-gray-400">
                                                        <Users className="w-6 h-6" />
                                                    </div>
                                                )}
                                            </td>
                                        )}
                                        <td className="px-6 py-4 text-sm font-medium text-gray-900">{user.name}</td>
                                        {userType !== 'admin' && (
                                            <td className="px-6 py-4 text-sm text-gray-600">{user.barcode}</td>
                                        )}
                                        {userType === 'student' && (
                                            <td className="px-6 py-4 text-sm text-gray-600">{user.class || '-'}</td>
                                        )}
                                        {userType === 'admin' && (
                                            <>
                                                <td className="px-6 py-4 text-sm text-gray-600">{user.username}</td>
                                                <td className="px-6 py-4 text-sm">
                                                    <span className="px-2 py-1 text-xs rounded-full bg-purple-100 text-purple-800">
                                                        {user.role}
                                                    </span>
                                                </td>
                                            </>
                                        )}
                                        <td className="px-6 py-4 text-sm">
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => handleEdit(user)}
                                                    className="text-blue-600 hover:text-blue-800"
                                                >
                                                    <Edit className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(user.id)}
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
                    <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
                        <h3 className="text-xl font-bold mb-4">
                            {editingUser ? 'Edit' : 'Add'} {userType.charAt(0).toUpperCase() + userType.slice(1)}
                        </h3>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            {userType !== 'admin' && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Photo</label>
                                    <div className="flex gap-4 items-center">
                                        {(selectedPhoto || (editingUser && editingUser.photo)) && (
                                            <div className="w-16 h-16 bg-gray-100 rounded-full border shrink-0 overflow-hidden">
                                                <img
                                                    src={selectedPhoto ? URL.createObjectURL(selectedPhoto) : `http://localhost:5000${editingUser.photo}`}
                                                    alt="Preview"
                                                    className="w-full h-full object-cover"
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
                                            <p className="text-xs text-gray-500 mt-1">Upload JPEG/PNG</p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="input-field"
                                    required
                                />
                            </div>

                            {userType !== 'admin' && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Barcode *</label>
                                    <input
                                        type="text"
                                        value={formData.barcode}
                                        onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                                        className="input-field"
                                        required
                                    />
                                </div>
                            )}

                            {userType === 'student' && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Class</label>
                                    <input
                                        type="text"
                                        value={formData.className}
                                        onChange={(e) => setFormData({ ...formData, className: e.target.value })}
                                        className="input-field"
                                    />
                                </div>
                            )}

                            {userType === 'admin' && (
                                <>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Username *</label>
                                        <input
                                            type="text"
                                            value={formData.username}
                                            onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                                            className="input-field"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Role *</label>
                                        <select
                                            value={formData.role}
                                            onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                                            className="input-field"
                                            required
                                        >
                                            <option value="Admin">Admin</option>
                                            <option value="Super Admin">Super Admin</option>
                                        </select>
                                    </div>
                                </>
                            )}

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Password {editingUser ? '(leave blank to keep current)' : '*'}
                                </label>
                                <input
                                    type="password"
                                    value={formData.password}
                                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                    className="input-field"
                                    required={!editingUser}
                                />
                            </div>

                            <div className="flex justify-end gap-3 mt-6">
                                <button
                                    type="button"
                                    onClick={() => { setShowAddModal(false); setEditingUser(null); resetForm(); }}
                                    className="btn-secondary"
                                >
                                    Cancel
                                </button>
                                <button type="submit" className="btn-primary">
                                    {editingUser ? 'Update' : 'Add'} {userType.charAt(0).toUpperCase() + userType.slice(1)}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default UserManagement;
