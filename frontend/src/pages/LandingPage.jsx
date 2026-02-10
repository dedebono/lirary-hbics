import React from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Users, BarChart3, Clock, Shield, CheckCircle, ArrowRight, Library } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const LandingPage = () => {
    const navigate = useNavigate();
    const { user } = useAuth();

    const handleGetStarted = () => {
        if (user) {
            if (user.role === 'Admin' || user.role === 'Librarian') navigate('/admin');
            else if (user.role === 'Teacher') navigate('/teacher');
            else navigate('/student');
        } else {
            navigate('/login');
        }
    };

    return (
        <div className="min-h-screen bg-white">
            {/* Navbar */}
            <nav className="fixed w-full bg-white/80 backdrop-blur-md z-50 border-b border-gray-100">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-16">
                        <div className="flex items-center gap-2">
                            <Library className="h-8 w-8 text-primary-600" />
                            <span className="text-xl font-bold text-gray-900">EduLib</span>
                        </div>
                        <div className="flex items-center gap-4">
                            {user ? (
                                <button
                                    onClick={handleGetStarted}
                                    className="text-sm font-medium text-gray-700 hover:text-primary-600 transition-colors"
                                >
                                    Go to Dashboard
                                </button>
                            ) : (
                                <>
                                    <button
                                        onClick={() => navigate('/login')}
                                        className="text-sm font-medium text-gray-700 hover:text-primary-600 transition-colors"
                                    >
                                        Log in
                                    </button>
                                </>
                            )}
                            <button
                                onClick={handleGetStarted}
                                className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-full text-sm font-medium transition-colors flex items-center gap-2"
                            >
                                Get Started <ArrowRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </div>
            </nav>

            {/* Hero Section */}
            <div className="pt-32 pb-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-primary-50 to-white">
                <div className="max-w-7xl mx-auto text-center">
                    <h1 className="text-5xl md:text-6xl font-extrabold text-gray-900 tracking-tight mb-8">
                        The Modern Solution for <br />
                        <span className="text-primary-600">School Libraries</span>
                    </h1>
                    <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-10">
                        Streamline your library operations with our comprehensive management system. Track books, manage users, and monitor attendance in real-time.
                    </p>
                    <div className="flex flex-col sm:flex-row justify-center gap-4">
                        <button
                            onClick={handleGetStarted}
                            className="btn-primary text-lg px-8 py-4 rounded-full shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all"
                        >
                            Start Managing Now
                        </button>
                        {!user && (
                            <button
                                onClick={() => navigate('/login')}
                                className="px-8 py-4 rounded-full text-lg font-medium text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 hover:border-gray-300 transition-all shadow-sm"
                            >
                                Member Login
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Features Grid */}
            <div className="py-20 bg-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl font-bold text-gray-900 mb-4">Everything you need to run your library</h2>
                        <p className="text-lg text-gray-600">Powerful features designed for administrators, teachers, and students.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        <FeatureCard
                            icon={BookOpen}
                            title="Smart Book Management"
                            description="Catalog your entire collection with barcode support, ISBN lookup, and real-time availability tracking."
                        />
                        <FeatureCard
                            icon={Users}
                            title="User Administration"
                            description="Manage student and teacher profiles securely. Import users in bulk via CSV for quick setup."
                        />
                        <FeatureCard
                            icon={Clock}
                            title="Real-time Attendance"
                            description="Track library visits effortlessly with our barcode scanner integration for students and teachers."
                        />
                        <FeatureCard
                            icon={BarChart3}
                            title="Insightful Analytics"
                            description="Visualize borrowing trends, most popular books, and library usage statistics with detailed reports."
                        />
                        <FeatureCard
                            icon={Shield}
                            title="Secure & Reliable"
                            description="Role-based access control ensures data security while providing appropriate access to all users."
                        />
                        <FeatureCard
                            icon={CheckCircle}
                            title="Easy Borrowing"
                            description="Streamlined check-in and check-out process. Handle returns and overdue notices efficiently."
                        />
                    </div>
                </div>
            </div>

            {/* Stats Section */}
            <div className="bg-primary-900 py-20">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
                        <StatItem number="10k+" label="Books Managed" />
                        <StatItem number="5k+" label="Active Users" />
                        <StatItem number="100%" label="Uptime" />
                        <StatItem number="24/7" label="Access" />
                    </div>
                </div>
            </div>

            {/* Footer */}
            <footer className="bg-gray-50 border-t border-gray-200 pt-16 pb-8">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex flex-col md:flex-row justify-between items-center mb-8">
                        <div className="flex items-center gap-2 mb-4 md:mb-0">
                            <Library className="h-6 w-6 text-primary-600" />
                            <span className="text-lg font-bold text-gray-900">EduLib</span>
                        </div>
                        <div className="text-gray-500 text-sm">
                            &copy; {new Date().getFullYear()} School Library System. All rights reserved.
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
};

const FeatureCard = ({ icon: Icon, title, description }) => (
    <div className="p-6 rounded-2xl bg-gray-50 hover:bg-white border border-transparent hover:border-gray-100 hover:shadow-xl transition-all duration-300">
        <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center mb-4">
            <Icon className="w-6 h-6 text-primary-600" />
        </div>
        <h3 className="text-xl font-bold text-gray-900 mb-2">{title}</h3>
        <p className="text-gray-600 leading-relaxed">{description}</p>
    </div>
);

const StatItem = ({ number, label }) => (
    <div>
        <div className="text-4xl font-bold text-white mb-2">{number}</div>
        <div className="text-primary-200 font-medium">{label}</div>
    </div>
);

export default LandingPage;
