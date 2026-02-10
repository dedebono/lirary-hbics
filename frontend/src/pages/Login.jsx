import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { BookOpen, LogIn } from 'lucide-react';

const Login = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [userType, setUserType] = useState('student');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        const result = await login(username, password, userType);

        if (result.success) {
            // Redirect based on role
            if (result.user.role === 'Admin' || result.user.role === 'Librarian') {
                navigate('/admin');
            } else if (result.user.role === 'Teacher') {
                navigate('/teacher');
            } else {
                navigate('/student');
            }
        } else {
            setError(result.error);
        }

        setLoading(false);
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8">
                <div className="flex flex-col items-center mb-8">
                    <div className="bg-primary-100 p-4 rounded-full mb-4">
                        <BookOpen className="w-12 h-12 text-primary-600" />
                    </div>
                    <h1 className="text-3xl font-bold text-gray-800">Library System</h1>
                    <p className="text-gray-600 mt-2">Sign in to continue</p>
                </div>

                {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            User Type
                        </label>
                        <select
                            value={userType}
                            onChange={(e) => setUserType(e.target.value)}
                            className="input-field"
                        >
                            <option value="student">Student</option>
                            <option value="teacher">Teacher</option>
                            <option value="admin">Admin</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            User
                        </label>
                        <input
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            className="input-field"
                            placeholder={
                                userType === 'admin'
                                    ? 'admin'
                                    : userType === 'student'
                                        ? 'Student barcode (e.g., STU001)'
                                        : 'Teacher barcode (e.g., TCH001)'
                            }
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Password
                        </label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="input-field"
                            placeholder="Enter password"
                            required
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full btn-primary flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                        {loading ? (
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                        ) : (
                            <>
                                <LogIn className="w-5 h-5" />
                                Sign In
                            </>
                        )}
                    </button>
                </form>

                <div className="mt-6 text-center text-sm text-gray-600">
                    <p className="font-semibold mb-2">Demo Credentials:</p>
                    <p>Admin: admin / admin123</p>
                    <p>Student: STU001 / student123</p>
                    <p>Teacher: TCH001 / teacher123</p>
                </div>
            </div>
        </div>
    );
};

export default Login;
