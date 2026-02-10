import React, { useState, useEffect } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { Scan, CheckCircle, XCircle, Search, User } from 'lucide-react';
import api from '../utils/api';

const AttendanceScanner = () => {
    const [scanning, setScanning] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState('');
    const [scanner, setScanner] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [searching, setSearching] = useState(false);

    const startScanning = () => {
        setScanning(true);
        setResult(null);
        setError('');

        const html5QrcodeScanner = new Html5QrcodeScanner(
            "qr-reader",
            {
                fps: 10,
                qrbox: { width: 250, height: 250 },
                aspectRatio: 1.0
            },
            false
        );

        html5QrcodeScanner.render(onScanSuccess, onScanError);
        setScanner(html5QrcodeScanner);
    };

    const stopScanning = () => {
        if (scanner) {
            scanner.clear();
            setScanner(null);
        }
        setScanning(false);
    };

    const onScanSuccess = async (decodedText, decodedResult) => {
        console.log('Scanned:', decodedText);
        stopScanning();

        try {
            const response = await api.post('/attendance/scan', {
                barcode: decodedText
            });

            setResult({
                success: true,
                message: response.data.message || 'Scan successful',
                user: response.data.user
            });
        } catch (err) {
            setError(err.response?.data?.error || 'Scan failed');
            setResult({
                success: false,
                message: err.response?.data?.error || 'Scan failed'
            });
        }
    };

    const onScanError = (errorMessage) => {
        // Ignore scan errors (they happen frequently during scanning)
    };

    const handleManualEntry = async (e) => {
        e.preventDefault();
        const barcode = e.target.barcode.value;

        try {
            const response = await api.post('/attendance/scan', {
                barcode: barcode
            });

            setResult({
                success: true,
                message: response.data.message || 'Scan successful',
                user: response.data.user
            });
            e.target.reset();
        } catch (err) {
            setError(err.response?.data?.error || 'Scan failed');
            setResult({
                success: false,
                message: err.response?.data?.error || 'Scan failed'
            });
        }
    };

    const handleSearch = async () => {
        if (!searchTerm.trim()) {
            setSearchResults([]);
            return;
        }

        setSearching(true);
        try {
            // Search both students and teachers
            const [studentsRes, teachersRes] = await Promise.all([
                api.get(`/users?userType=student`),
                api.get(`/users?userType=teacher`)
            ]);

            const students = (studentsRes.data.users || []).map(u => ({ ...u, userType: 'student' }));
            const teachers = (teachersRes.data.users || []).map(u => ({ ...u, userType: 'teacher' }));
            const allUsers = [...students, ...teachers];

            const filtered = allUsers.filter(user =>
                user.name?.toLowerCase().includes(searchTerm.toLowerCase())
            );

            setSearchResults(filtered);
        } catch (err) {
            console.error('Search error:', err);
            setSearchResults([]);
        } finally {
            setSearching(false);
        }
    };

    const handleUserSelect = async (user) => {
        try {
            const response = await api.post('/attendance/scan', {
                barcode: user.barcode
            });

            setResult({
                success: true,
                message: response.data.message || 'Scan successful',
                user: response.data.user
            });
            setSearchTerm('');
            setSearchResults([]);
        } catch (err) {
            setError(err.response?.data?.error || 'Scan failed');
            setResult({
                success: false,
                message: err.response?.data?.error || 'Scan failed'
            });
        }
    };

    // Debounced search
    useEffect(() => {
        const timer = setTimeout(() => {
            if (searchTerm) {
                handleSearch();
            } else {
                setSearchResults([]);
            }
        }, 300);

        return () => clearTimeout(timer);
    }, [searchTerm]);

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <div className="max-w-2xl mx-auto">
                <div className="card">
                    <div className="flex items-center gap-3 mb-6">
                        <Scan className="w-8 h-8 text-primary-600" />
                        <div>
                            <h2 className="text-2xl font-bold text-gray-800">Attendance Scanner</h2>
                            <p className="text-sm text-gray-600">Scan, search, or enter barcode to check in/out</p>
                        </div>
                    </div>

                    {/* Scanner */}
                    {!scanning && !result && (
                        <div className="text-center">
                            <button
                                onClick={startScanning}
                                className="btn-primary inline-flex items-center gap-2 mb-6"
                            >
                                <Scan className="w-5 h-5" />
                                Start Scanning
                            </button>
                        </div>
                    )}

                    {scanning && (
                        <div>
                            <div id="qr-reader" className="mb-4"></div>
                            <button
                                onClick={stopScanning}
                                className="btn-secondary w-full"
                            >
                                Stop Scanning
                            </button>
                        </div>
                    )}

                    {/* Result Display */}
                    {result && (
                        <div className={`p-4 rounded-lg mb-6 ${result.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
                            }`}>
                            <div className="flex items-center gap-3">
                                {result.success ? (
                                    <CheckCircle className="w-8 h-8 text-green-600" />
                                ) : (
                                    <XCircle className="w-8 h-8 text-red-600" />
                                )}
                                <div>
                                    <p className={`font-semibold ${result.success ? 'text-green-800' : 'text-red-800'}`}>
                                        {result.message}
                                    </p>
                                    {result.user && (
                                        <p className="text-sm text-gray-600 mt-1">
                                            {result.user.name} - {result.user.userType}
                                        </p>
                                    )}
                                </div>
                            </div>
                            <button
                                onClick={() => { setResult(null); setError(''); }}
                                className="btn-primary mt-4 w-full"
                            >
                                Check In Another
                            </button>
                        </div>
                    )}

                    {/* Name Search */}
                    <div className="border-t pt-6 mt-6">
                        <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                            <Search className="w-5 h-5" />
                            Search by Name
                        </h3>
                        <div className="relative">
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="Type student or teacher name..."
                                className="input-field"
                            />
                            {searching && (
                                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary-600"></div>
                                </div>
                            )}
                        </div>

                        {searchResults.length > 0 && (
                            <div className="mt-3 max-h-60 overflow-y-auto border rounded-lg">
                                {searchResults.map((user) => (
                                    <button
                                        key={`${user.userType}-${user.id}`}
                                        onClick={() => handleUserSelect(user)}
                                        className="w-full p-3 hover:bg-gray-50 border-b last:border-b-0 text-left transition-colors flex items-center gap-3"
                                    >
                                        <User className="w-5 h-5 text-gray-400" />
                                        <div>
                                            <p className="font-medium text-gray-800">{user.name}</p>
                                            <p className="text-sm text-gray-600">
                                                {user.userType === 'student' ? `Student - ${user.class || 'N/A'}` : 'Teacher'} | {user.barcode}
                                            </p>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}

                        {searchTerm && searchResults.length === 0 && !searching && (
                            <p className="text-sm text-gray-500 mt-3 text-center">No users found</p>
                        )}
                    </div>

                    {/* Manual Barcode Entry */}
                    <div className="border-t pt-6 mt-6">
                        <h3 className="text-lg font-semibold text-gray-800 mb-4">Manual Barcode Entry</h3>
                        <form onSubmit={handleManualEntry} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Barcode
                                </label>
                                <input
                                    type="text"
                                    name="barcode"
                                    placeholder="Enter student or teacher barcode"
                                    className="input-field"
                                    required
                                />
                            </div>
                            <button type="submit" className="btn-primary w-full">
                                Check In
                            </button>
                        </form>
                    </div>

                    {error && !result && (
                        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700">
                            {error}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AttendanceScanner;
