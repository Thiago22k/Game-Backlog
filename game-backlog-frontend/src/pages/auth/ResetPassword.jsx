import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import Navbar from '../../components/layout/Navbar';
import toast from 'react-hot-toast';
import axios from '../../api/axios'; // Importar axios interceptor

const ResetPassword = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const id = searchParams.get('id');
    const token = searchParams.get('token');

    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    // Imágenes de fondo aleatorias
    const backgroundImages = [
        'https://images.igdb.com/igdb/image/upload/t_1080p/co5vmg.jpg', // Baldur's Gate 3
        'https://images.igdb.com/igdb/image/upload/t_1080p/co6kz7.jpg', // Elden Ring
        'https://images.igdb.com/igdb/image/upload/t_1080p/co5w4u.jpg', // The Witcher 3
        'https://images.igdb.com/igdb/image/upload/t_1080p/co1r7f.jpg', // God of War
    ];

    const [randomBg] = useState(() =>
        backgroundImages[Math.floor(Math.random() * backgroundImages.length)]
    );

    useEffect(() => {
        if (!id || !token) {
            setError('Invalid or missing password reset link.');
        }
    }, [id, token]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        if (password !== confirmPassword) {
            setError('Passwords do not match');
            setIsLoading(false);
            return;
        }

        if (password.length < 6) {
            setError('Password must be at least 6 characters long');
            setIsLoading(false);
            return;
        }

        try {
            const response = await axios.post('/auth/reset-password', {
                id,
                token,
                newPassword: password
            });

            setSuccess(true);
            toast.success(response.data.message || 'Password reset successfully! You can now log in.');
            setTimeout(() => navigate('/login'), 3000);

        } catch (err) {
            setError(err.response?.data?.error || 'Something went wrong. The link might be expired.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-primary-navy relative overflow-hidden">
            {/* Background Image */}
            <div
                className="absolute inset-0 bg-cover bg-center"
                style={{
                    backgroundImage: `url('${randomBg}')`,
                    filter: 'blur(8px) brightness(0.4)',
                }}
            />

            {/* Gradient Overlay */}
            <div className="absolute inset-0 bg-primary-navy/60" />

            {/* Content */}
            <div className="relative z-10">
                <Navbar />

                <div className="flex items-center justify-center px-4 py-12 min-h-[calc(100vh-7rem)]">
                    <div className="w-full max-w-md z-10">
                        <div className="bg-primary-navy-ultra-dark rounded-2xl p-10 shadow-2xl h-full">
                            <h2 className="text-primary-yellow font-bold text-3xl mb-8 text-center uppercase tracking-wide">
                                Reset Password
                            </h2>

                            {success ? (
                                <div className="text-center">
                                    <p className="text-white mb-6">
                                        Your password has been reset successfully.
                                    </p>
                                    <p className="text-gray-400 text-sm mb-4">Redirecting you to login...</p>
                                    <Link to="/login" className="inline-block mt-2 text-primary-yellow hover:text-white transition-colors underline">
                                        Click here if you are not redirected
                                    </Link>
                                </div>
                            ) : error && (!id || !token) ? (
                                <div className="text-center">
                                    <div className="bg-red-500 bg-opacity-20 border border-red-500 text-red-300 px-4 py-3 rounded-lg text-sm mb-6">
                                        {error}
                                    </div>
                                    <Link to="/login" className="inline-block mt-4 text-primary-yellow hover:text-white transition-colors underline">
                                        Return to Login
                                    </Link>
                                </div>
                            ) : (
                                <form onSubmit={handleSubmit} className="space-y-6">
                                    {/* New Password Input */}
                                    <div>
                                        <label className="block text-white text-sm mb-2">
                                            New Password
                                        </label>
                                        <div className="relative">
                                            <input
                                                type={showPassword ? "text" : "password"}
                                                name="password"
                                                value={password}
                                                onChange={(e) => {
                                                    setPassword(e.target.value);
                                                    setError('');
                                                }}
                                                required
                                                disabled={isLoading}
                                                className="w-full bg-white bg-opacity-10 text-white px-4 py-3 pr-12 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-yellow placeholder-gray-500 disabled:opacity-50"
                                                placeholder="Enter your new password"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowPassword(!showPassword)}
                                                className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                                            >
                                                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                            </button>
                                        </div>
                                    </div>

                                    {/* Confirm Password Input */}
                                    <div>
                                        <label className="block text-white text-sm mb-2">
                                            Confirm New Password
                                        </label>
                                        <div className="relative">
                                            <input
                                                type={showConfirmPassword ? "text" : "password"}
                                                name="confirmPassword"
                                                value={confirmPassword}
                                                onChange={(e) => {
                                                    setConfirmPassword(e.target.value);
                                                    setError('');
                                                }}
                                                required
                                                disabled={isLoading}
                                                className="w-full bg-white bg-opacity-10 text-white px-4 py-3 pr-12 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-yellow placeholder-gray-500 disabled:opacity-50"
                                                placeholder="Confirm your new password"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                                className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                                            >
                                                {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                            </button>
                                        </div>
                                    </div>

                                    {error && (
                                        <div className="bg-red-500 bg-opacity-20 border border-red-500 text-red-300 px-4 py-3 rounded-lg text-sm">
                                            {error}
                                        </div>
                                    )}

                                    <button
                                        type="submit"
                                        disabled={isLoading}
                                        className="w-full bg-primary-yellow hover:bg-opacity-90 text-primary-navy font-bold py-3 px-8 rounded-lg uppercase tracking-wide transition-all disabled:opacity-50"
                                    >
                                        {isLoading ? 'Resetting...' : 'Reset Password'}
                                    </button>

                                    <div className="mt-8 space-y-3 text-center">
                                        <Link to="/login" className="block text-gray-400 hover:text-white text-sm transition-all">
                                            ← Back to login
                                        </Link>
                                    </div>
                                </form>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ResetPassword;
