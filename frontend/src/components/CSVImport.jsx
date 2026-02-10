import React, { useState } from 'react';
import { Upload, Download, X, CheckCircle, AlertCircle } from 'lucide-react';
import api from '../utils/api';

const CSVImport = ({ userType, onImportComplete }) => {
    const [file, setFile] = useState(null);
    const [importing, setImporting] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [result, setResult] = useState(null);
    const [showModal, setShowModal] = useState(false);

    const handleFileChange = (e) => {
        const selectedFile = e.target.files[0];
        if (selectedFile && selectedFile.type === 'text/csv') {
            setFile(selectedFile);
            setResult(null);
        } else {
            alert('Please select a valid CSV file');
        }
    };

    const handleImport = async () => {
        if (!file) {
            alert('Please select a file first');
            return;
        }

        setImporting(true);
        setUploadProgress(0);
        const formData = new FormData();
        formData.append('file', file);

        try {
            const endpoint = userType === 'student' ? '/import/import-students' : '/import/import-teachers';
            const response = await api.post(endpoint, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                },
                onUploadProgress: (progressEvent) => {
                    const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                    setUploadProgress(percentCompleted);
                }
            });

            setResult(response.data);
            setFile(null);
            if (onImportComplete) {
                onImportComplete();
            }
        } catch (error) {
            alert(error.response?.data?.error || 'Import failed');
        } finally {
            setImporting(false);
            setUploadProgress(0);
        }
    };

    const downloadTemplate = () => {
        let csvContent = '';
        if (userType === 'student') {
            csvContent = 'barcode,name,class\nSTU001,John Doe,Grade 10A\nSTU002,Jane Smith,Grade 10B';
        } else {
            csvContent = 'barcode,name\nTCH001,Mr. Johnson\nTCH002,Ms. Williams';
        }

        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${userType}_template.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
    };

    return (
        <>
            <button
                onClick={() => setShowModal(true)}
                className="btn-primary flex items-center gap-2"
            >
                <Upload className="w-4 h-4" />
                Import CSV
            </button>

            {showModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-xl font-bold">Import {userType === 'student' ? 'Students' : 'Teachers'} from CSV</h3>
                            <button onClick={() => { setShowModal(false); setResult(null); }} className="text-gray-500 hover:text-gray-700">
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <div className="mb-6">
                            <button
                                onClick={downloadTemplate}
                                className="btn-secondary flex items-center gap-2 mb-4"
                            >
                                <Download className="w-4 h-4" />
                                Download CSV Template
                            </button>
                            <p className="text-sm text-gray-600 mb-2">
                                CSV Format: {userType === 'student' ? 'barcode, name, class' : 'barcode, name'}
                            </p>
                            <p className="text-xs text-gray-500">
                                Default password for imported users: {userType === 'student' ? 'student123' : 'teacher123'}
                            </p>
                        </div>

                        <div className="mb-6">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Select CSV File
                            </label>
                            <input
                                type="file"
                                accept=".csv"
                                onChange={handleFileChange}
                                className="input-field"
                            />
                            {file && (
                                <p className="text-sm text-green-600 mt-2">
                                    <CheckCircle className="w-4 h-4 inline mr-1" />
                                    {file.name} selected
                                </p>
                            )}

                            {importing && (
                                <div className="mt-4">
                                    <div className="flex justify-between text-xs text-gray-600 mb-1">
                                        <span>Uploading...</span>
                                        <span>{uploadProgress}%</span>
                                    </div>
                                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                                        <div
                                            className="bg-primary-600 h-2.5 rounded-full transition-all duration-300"
                                            style={{ width: `${uploadProgress}%` }}
                                        ></div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {result && (
                            <div className="mb-6">
                                <div className={`p-4 rounded-lg ${result.failed === 0 ? 'bg-green-50 border border-green-200' : 'bg-yellow-50 border border-yellow-200'}`}>
                                    <h4 className="font-semibold mb-2">Import Results</h4>
                                    <p className="text-sm">Total: {result.total}</p>
                                    <p className="text-sm text-green-600">Successfully imported: {result.imported}</p>
                                    {result.failed > 0 && (
                                        <p className="text-sm text-red-600">Failed: {result.failed}</p>
                                    )}
                                </div>

                                {result.results.errors.length > 0 && (
                                    <div className="mt-4 max-h-40 overflow-y-auto">
                                        <h5 className="font-semibold text-sm mb-2 text-red-700">Errors:</h5>
                                        <ul className="text-xs space-y-1">
                                            {result.results.errors.map((error, idx) => (
                                                <li key={idx} className="text-red-600">
                                                    Row {error.row} ({error.barcode}): {error.error}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => { setShowModal(false); setResult(null); }}
                                className="btn-secondary"
                            >
                                Close
                            </button>
                            <button
                                onClick={handleImport}
                                disabled={!file || importing}
                                className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                            >
                                {importing ? (
                                    <>
                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                        Processing...
                                    </>
                                ) : (
                                    <>
                                        <Upload className="w-4 h-4" />
                                        Import
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default CSVImport;
