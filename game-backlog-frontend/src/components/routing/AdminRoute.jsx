import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ShieldAlert } from 'lucide-react';
import Navbar from '../layout/Navbar';
import Footer from '../layout/Footer';

const AdminRoute = ({ children }) => {
    const { user, loading } = useAuth();
    const location = useLocation();

    if (loading) {
        return (
            <div className="min-h-screen bg-primary-navy flex flex-col">
                <Navbar />
                <div className="flex-1 flex justify-center items-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-primary-yellow"></div>
                </div>
                <Footer />
            </div>
        );
    }

    if (!user) {
        return <Navigate to="/login" state={{ from: location.pathname }} replace />;
    }

    if (user.role !== 'admin') {
        return (
            <div className="min-h-screen bg-primary-navy flex flex-col">
                <Navbar />
                <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-center py-12">
                    <div className="bg-primary-navy-dark border border-gray-700/50 rounded-2xl p-8 max-w-md w-full text-center shadow-xl">
                        <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                            <ShieldAlert className="w-8 h-8 text-red-400" />
                        </div>
                        <h2 className="text-2xl font-bold text-white mb-2">Access Denied</h2>
                        <p className="text-gray-400 mb-6 leading-relaxed">
                            You must be an administrator to view this page. If you believe this is a mistake, please contact support.
                        </p>
                        <button
                            onClick={() => window.location.href = '/'}
                            className="w-full py-3 bg-gray-800 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors"
                        >
                            Return Home
                        </button>
                    </div>
                </main>
                <Footer />
            </div>
        );
    }

    return children;
};

export default AdminRoute;
