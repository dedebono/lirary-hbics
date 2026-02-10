import React, { useState, useEffect } from 'react';
import { Calendar, Filter, Download, Search, Clock } from 'lucide-react';
import api from '../../utils/api';

const AttendanceLogs = () => {
    const [logs, setLogs] = useState([]);
    const [filteredLogs, setFilteredLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [userTypeFilter, setUserTypeFilter] = useState('all');
    const [actionFilter, setActionFilter] = useState('all');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [sortBy, setSortBy] = useState('date-desc');

    useEffect(() => {
        fetchLogs();
    }, []);

    useEffect(() => {
        applyFilters();
    }, [logs, searchTerm, userTypeFilter, actionFilter, startDate, endDate, sortBy]);

    const fetchLogs = async () => {
        setLoading(true);
        try {
            const response = await api.get('/attendance/logs');
            const logsData = response.data.logs || [];
            setLogs(logsData);
        } catch (error) {
            console.error('Error fetching logs:', error);
            setLogs([]);
        } finally {
            setLoading(false);
        }
    };

    const applyFilters = () => {
        let filtered = [...logs];

        // Search filter
        if (searchTerm) {
            filtered = filtered.filter(log =>
                log.user_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                log.barcode?.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        // User type filter
        if (userTypeFilter !== 'all') {
            filtered = filtered.filter(log => log.user_type === userTypeFilter);
        }

        // Action filter
        if (actionFilter !== 'all') {
            filtered = filtered.filter(log => log.action === actionFilter);
        }

        // Date range filter
        if (startDate) {
            filtered = filtered.filter(log => {
                const logDate = new Date(log.timestamp).toISOString().split('T')[0];
                return logDate >= startDate;
            });
        }

        if (endDate) {
            filtered = filtered.filter(log => {
                const logDate = new Date(log.timestamp).toISOString().split('T')[0];
                return logDate <= endDate;
            });
        }

        // Sorting
        filtered.sort((a, b) => {
            const dateA = new Date(a.timestamp);
            const dateB = new Date(b.timestamp);

            switch (sortBy) {
                case 'date-desc':
                    return dateB - dateA;
                case 'date-asc':
                    return dateA - dateB;
                case 'name-asc':
                    return (a.user_name || '').localeCompare(b.user_name || '');
                case 'name-desc':
                    return (b.user_name || '').localeCompare(a.user_name || '');
                default:
                    return dateB - dateA;
            }
        });

        setFilteredLogs(filtered);
    };

    const clearFilters = () => {
        setSearchTerm('');
        setUserTypeFilter('all');
        setActionFilter('all');
        setStartDate('');
        setEndDate('');
        setSortBy('date-desc');
    };

    const exportToCSV = () => {
        const headers = ['Date', 'Time', 'Name', 'User Type', 'Barcode', 'Action'];
        const rows = filteredLogs.map(log => {
            const date = new Date(log.timestamp);
            return [
                date.toLocaleDateString(),
                date.toLocaleTimeString(),
                log.user_name,
                log.user_type,
                log.barcode,
                log.action
            ];
        });

        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `attendance_logs_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
    };

    const formatDateTime = (timestamp) => {
        const date = new Date(timestamp);
        return {
            date: date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }),
            time: date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
        };
    };

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800">Attendance Logs</h2>
                    <p className="text-sm text-gray-600">View and filter all attendance records</p>
                </div>
                <button
                    onClick={exportToCSV}
                    className="btn-primary flex items-center gap-2"
                    disabled={filteredLogs.length === 0}
                >
                    <Download className="w-4 h-4" />
                    Export CSV
                </button>
            </div>

            {/* Filters */}
            <div className="card mb-6">
                <div className="flex items-center gap-2 mb-4">
                    <Filter className="w-5 h-5 text-gray-600" />
                    <h3 className="text-lg font-semibold text-gray-800">Filters</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Search */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="Name or barcode..."
                                className="input-field pl-10"
                            />
                        </div>
                    </div>

                    {/* User Type */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">User Type</label>
                        <select
                            value={userTypeFilter}
                            onChange={(e) => setUserTypeFilter(e.target.value)}
                            className="input-field"
                        >
                            <option value="all">All Users</option>
                            <option value="student">Students</option>
                            <option value="teacher">Teachers</option>
                        </select>
                    </div>

                    {/* Action */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Action</label>
                        <select
                            value={actionFilter}
                            onChange={(e) => setActionFilter(e.target.value)}
                            className="input-field"
                        >
                            <option value="all">All Actions</option>
                            <option value="Check-in">Check-in</option>
                            <option value="Check-out">Check-out</option>
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
                            <option value="date-desc">Newest First</option>
                            <option value="date-asc">Oldest First</option>
                            <option value="name-asc">Name (A-Z)</option>
                            <option value="name-desc">Name (Z-A)</option>
                        </select>
                    </div>

                    {/* Start Date */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                        <input
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className="input-field"
                        />
                    </div>

                    {/* End Date */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                        <input
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            className="input-field"
                        />
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
                    Showing {filteredLogs.length} of {logs.length} records
                </div>
            </div>

            {/* Logs Table */}
            {loading ? (
                <div className="flex justify-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
                </div>
            ) : filteredLogs.length === 0 ? (
                <div className="card text-center py-12">
                    <Clock className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-600">No attendance logs found</p>
                    <p className="text-sm text-gray-500 mt-1">Try adjusting your filters</p>
                </div>
            ) : (
                <div className="bg-white rounded-lg shadow overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Time</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">User Type</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Barcode</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {filteredLogs.map((log, index) => {
                                    const { date, time } = formatDateTime(log.timestamp);
                                    return (
                                        <tr key={index} className="hover:bg-gray-50">
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{date}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{time}</td>
                                            <td className="px-6 py-4 text-sm text-gray-900">{log.user_name}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                                                <span className={`px-2 py-1 text-xs rounded-full ${log.user_type === 'student' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
                                                    }`}>
                                                    {log.user_type}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{log.barcode}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                                                <span className={`px-2 py-1 text-xs rounded-full ${log.action === 'Check-in' ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'
                                                    }`}>
                                                    {log.action}
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AttendanceLogs;
