import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import PrivateRoute from './components/PrivateRoute';
import Login from './pages/Login';
import AdminDashboard from './pages/AdminDashboard';
import TeacherDashboard from './pages/TeacherDashboard';
import StudentDashboard from './pages/StudentDashboard';
import LandingPage from './pages/LandingPage';

const AppRoutes = () => {
    const { user } = useAuth();

    const getDefaultRoute = () => {
        if (!user) return '/login';
        if (user.role === 'Admin' || user.role === 'Librarian') return '/admin';
        if (user.role === 'Teacher') return '/teacher';
        return '/student';
    };

    return (
        <Routes>
            <Route path="/login" element={user ? <Navigate to={getDefaultRoute()} /> : <Login />} />
            <Route path="/" element={<LandingPage />} />

            <Route
                path="/admin/*"
                element={
                    <PrivateRoute requiredRole="admin">
                        <AdminDashboard />
                    </PrivateRoute>
                }
            />

            <Route
                path="/teacher/*"
                element={
                    <PrivateRoute requiredRole="teacher">
                        <TeacherDashboard />
                    </PrivateRoute>
                }
            />

            <Route
                path="/student/*"
                element={
                    <PrivateRoute>
                        <StudentDashboard />
                    </PrivateRoute>
                }
            />
        </Routes>
    );
};

function App() {
    return (
        <AuthProvider>
            <BrowserRouter>
                <AppRoutes />
            </BrowserRouter>
        </AuthProvider>
    );
}

export default App;
