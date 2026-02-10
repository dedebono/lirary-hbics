import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const PrivateRoute = ({ children, requiredRole }) => {
    const { user, loading } = useAuth();

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            </div>
        );
    }

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    if (requiredRole) {
        const hasAccess = () => {
            if (requiredRole === 'admin') {
                return user.role === 'Admin' || user.role === 'Librarian';
            }
            if (requiredRole === 'teacher') {
                return user.role === 'Teacher' || user.role === 'Admin' || user.role === 'Librarian';
            }
            return true;
        };

        if (!hasAccess()) {
            return <Navigate to="/" replace />;
        }
    }

    return children;
};

export default PrivateRoute;
